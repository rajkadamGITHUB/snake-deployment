from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from urllib.parse import quote_plus

# Database configuration from environment variables
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = quote_plus(os.getenv("DB_PASSWORD", "RajKadam03"))
DB_HOST = os.getenv(
    "DB_HOST",
    "flask-mysql-db.cpy6iqsu8118.ap-south-1.rds.amazonaws.com"
)
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "snake_db")


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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()