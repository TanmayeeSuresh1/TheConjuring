"""
Run this once after loading sample_data.sql to set real bcrypt password hashes.
Usage: python init_db.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import User
from dotenv import load_dotenv
load_dotenv()

DEFAULT_PASSWORD = "Password@123"

def init():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        hashed = hash_password(DEFAULT_PASSWORD)
        for u in users:
            u.password_hash = hashed
        db.commit()
        print(f"Updated {len(users)} user password hashes.")
    finally:
        db.close()

if __name__ == "__main__":
    init()
