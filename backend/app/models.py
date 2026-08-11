from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, desc
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from pydantic import BaseModel
from urllib.parse import quote_plus
import os
# ==========================================
# 1. ADVANCED DATABASE CONFIGURATION
# ==========================================

DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = quote_plus(os.getenv("DB_PASSWORD", "RajKadam03"))
DB_HOST = os.getenv(
    "DB_HOST",
    "snake-game-db.cq9uym26ekxy.us-east-1.rds.amazonaws.com"
)
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "mysql")

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


# UPGRADED MODEL: Tracks Player Profiles instead of just raw scores
class PlayerProfile(Base):
    __tablename__ = "player_profiles"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    high_score = Column(Integer, default=0)
    games_played = Column(Integer, default=0)

# Auto-create the new table
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 2. FASTAPI SERVER INITIALIZATION
# ==========================================
app = FastAPI(title="Snake Clash - Ultimate Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Frontend
app.mount("/static", StaticFiles(directory="../frontend/public"), name="static")

@app.get("/")
async def serve_game():
    return FileResponse("../frontend/public/index.html")

# ==========================================
# 3. ADVANCED API ROUTES
# ==========================================
class GameResult(BaseModel):
    username: str
    score: int

@app.post("/api/game_over")
def handle_game_over(data: GameResult, db: Session = Depends(get_db)):
    """Saves game results, updates high scores, and tracks total games played."""
    player = db.query(PlayerProfile).filter(PlayerProfile.username == data.username).first()

    if player:
        # Update existing player
        player.games_played += 1
        if data.score > player.high_score:
            player.high_score = data.score
    else:
        # Create new player profile
        player = PlayerProfile(
            username=data.username,
            high_score=data.score,
            games_played=1
        )
        db.add(player)

    db.commit()
    db.refresh(player)
    return {"status": "success", "player": {"username": player.username, "high_score": player.high_score, "games": player.games_played}}

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    """Fetches top agents sorted by high score."""
    scores = db.query(PlayerProfile).order_by(desc(PlayerProfile.high_score)).limit(15).all()
    return [{"id": s.id, "username": s.username, "high_score": s.high_score, "games_played": s.games_played} for s in scores]

@app.get("/api/player/{username}")
def get_player_stats(username: str, db: Session = Depends(get_db)):
    """Fetches stats for a specific user to display in the collapsible menu."""
    player = db.query(PlayerProfile).filter(PlayerProfile.username == username).first()
    if player:
        return {"username": player.username, "high_score": player.high_score, "games_played": player.games_played}
    return {"username": username, "high_score": 0, "games_played": 0}

@app.delete("/api/player/{player_id}")
def delete_player(player_id: int, db: Session = Depends(get_db)):
    """Erases an agent from the database completely."""
    player = db.query(PlayerProfile).filter(PlayerProfile.id == player_id).first()
    if player:
        db.delete(player)
        db.commit()
        return {"status": "deleted"}
    return {"status": "not_found"}