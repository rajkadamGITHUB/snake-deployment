from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Replace root, password, and localhost with your actual MySQL details
# The database 'snake_db' must exist in your MySQL server
DATABASE_URL = "mysql+pymysql://root:RajKadam03@localhost:3306/snake_db"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()