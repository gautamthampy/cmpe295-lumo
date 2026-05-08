import os
from collections.abc import Generator

os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-12345")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings, get_settings
from app.core.database import create_db_and_tables, drop_db_tables, get_db
from app.main import app


@pytest.fixture
def test_settings() -> Settings:
    return Settings(
        DATABASE_URL="sqlite://",
        JWT_SECRET="test-jwt-secret-for-pytest-only-12345",
        BACKEND_CORS_ORIGINS=["http://localhost:3000"],
        SESSION_COOKIE_NAME="lumo_session",
        SESSION_COOKIE_SECURE=False,
        DEBUG_AUTH_TOKENS=True,
        MAIL_DELIVERY_MODE="log",
    )


@pytest.fixture
def db_engine() -> Generator[Engine, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    create_db_and_tables(bind=engine)
    try:
        yield engine
    finally:
        drop_db_tables(bind=engine)
        engine.dispose()


@pytest.fixture
def db_session_factory(db_engine: Engine):
    return sessionmaker(bind=db_engine, autoflush=False, autocommit=False, expire_on_commit=False)


@pytest.fixture
def db_session(db_session_factory) -> Generator[Session, None, None]:
    session = db_session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session, test_settings: Settings) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db_session

    def override_get_settings() -> Settings:
        return test_settings

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_settings] = override_get_settings

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
