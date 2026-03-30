"""Seed script to create default users for each role."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.auth.jwt import hash_password
from app.models.user import User, UserRole
from app.models.user_permission import UserPermission  # noqa: F401 - needed for relationship

SEED_USERS = [
    {"email": "admin@socialbloom.ai", "full_name": "Admin User", "role": UserRole.admin},
    {"email": "manager@socialbloom.ai", "full_name": "Manager User", "role": UserRole.manager},
    {"email": "teamlead@socialbloom.ai", "full_name": "Team Lead User", "role": UserRole.team_lead},
    {"email": "requester@socialbloom.ai", "full_name": "Requester User", "role": UserRole.creator},
    {"email": "designer@socialbloom.ai", "full_name": "Designer User", "role": UserRole.designer},
]

DEFAULT_PASSWORD = "123456"


def seed():
    db = SessionLocal()
    try:
        for user_data in SEED_USERS:
            existing = db.query(User).filter(User.email == user_data["email"]).first()
            if existing:
                print(f"  Already exists: {user_data['email']}")
                continue
            user = User(
                email=user_data["email"],
                hashed_password=hash_password(DEFAULT_PASSWORD),
                full_name=user_data["full_name"],
                role=user_data["role"],
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            print(f"  Created: {user_data['email']} ({user_data['role'].value})")
        db.commit()
        print("\nSeed complete!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
