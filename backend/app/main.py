from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, desc
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel
import datetime
from urllib.parse import quote_plus
import os
# --- DATABASE SETUP ---
DB_USER = os.getenv("DB_USER", "admin")

DB_PASSWORD = quote_plus(
    os.getenv("DB_PASSWORD", "RajKadam03")
)

DB_HOST = os.getenv(
    "DB_HOST",
    "flask-mysql-db.cpy6iqsu8118.ap-south-1.rds.amazonaws.com"
)

DB_PORT = os.getenv(
    "DB_PORT",
    "3306"
)

DB_NAME = os.getenv(
    "DB_NAME",
    "snake_db"
)


DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}"
    f"@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()

class PlayerData(Base):
    __tablename__ = "player_data_v4"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    high_score = Column(Integer, default=0)
    games_played = Column(Integer, default=0)
    zero_scores = Column(Integer, default=0)
    last_played = Column(String(50))

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- FASTAPI SETUP ---
# 1. First, we define the app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. THEN, we mount the static directory
app.mount("/static", StaticFiles(directory="frontend/public"), name="static")

@app.get("/")
def home():
    return FileResponse("/app/frontend/public/index.html")


# --- API ROUTES ---
class ScoreSubmit(BaseModel):
    username: str
    score: int

class UserUpdate(BaseModel):
    new_username: str

@app.post("/api/scores")
def save_score(data: ScoreSubmit, db: Session = Depends(get_db)):
    player = db.query(PlayerData).filter(PlayerData.username == data.username).first()
    current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    if player:
        player.games_played += 1
        player.last_played = current_time
        if data.score > player.high_score:
            player.high_score = data.score
        if data.score == 0:
            player.zero_scores += 1
    else:
        player = PlayerData(
            username=data.username,
            high_score=data.score,
            games_played=1,
            zero_scores=1 if data.score == 0 else 0,
            last_played=current_time
        )
        db.add(player)

    db.commit()
    return {"status": "success"}

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    scores = db.query(PlayerData).order_by(desc(PlayerData.high_score)).limit(15).all()
    return [{
        "id": s.id,
        "username": s.username,
        "high_score": s.high_score,
        "games_played": s.games_played,
        "zero_scores": s.zero_scores,
        "date": s.last_played
    } for s in scores]

@app.put("/api/player/{player_id}")
def update_username(player_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    player = db.query(PlayerData).filter(PlayerData.id == player_id).first()
    if player:
        exists = db.query(PlayerData).filter(PlayerData.username == data.new_username).first()
        if exists and exists.id != player_id:
            return {"status": "error", "message": "Username already taken"}

        player.username = data.new_username
        db.commit()
        return {"status": "success"}
    return {"status": "not_found"}

@app.delete("/api/scores/{score_id}")
def delete_score(score_id: int, db: Session = Depends(get_db)):
    player = db.query(PlayerData).filter(PlayerData.id == score_id).first()
    if player:
        db.delete(player)
        db.commit()
        return {"status": "deleted"}
    return {"status": "not_found"}