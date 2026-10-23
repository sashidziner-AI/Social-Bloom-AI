import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.auth.jwt import hash_password
from app.database import Base, get_db
from app.main import app
from app.models.user import User, UserRole


SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Postgresql%2399001@localhost:5432/social_bloom_ai_test"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def creator_user(db) -> User:
    user = User(
        email="creator@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Creator",
        role=UserRole.creator,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_user(db) -> User:
    user = User(
        email="admin@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Admin",
        role=UserRole.admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def manager_user(db) -> User:
    user = User(
        email="manager@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Manager",
        role=UserRole.manager,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def team_lead_user(db) -> User:
    user = User(
        email="teamlead@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Team Lead",
        role=UserRole.team_lead,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def designer_user(db) -> User:
    user = User(
        email="designer@test.com",
        hashed_password=hash_password("testpass123"),
        full_name="Test Designer",
        role=UserRole.designer,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_auth_header(client: TestClient, email: str, password: str) -> dict:
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def creator_headers(client, creator_user) -> dict:
    return get_auth_header(client, "creator@test.com", "testpass123")


@pytest.fixture()
def admin_headers(client, admin_user) -> dict:
    return get_auth_header(client, "admin@test.com", "testpass123")


@pytest.fixture()
def manager_headers(client, manager_user) -> dict:
    return get_auth_header(client, "manager@test.com", "testpass123")


@pytest.fixture()
def team_lead_headers(client, team_lead_user) -> dict:
    return get_auth_header(client, "teamlead@test.com", "testpass123")


@pytest.fixture()
def designer_headers(client, designer_user) -> dict:
    return get_auth_header(client, "designer@test.com", "testpass123")
