"""
Pytest configuration for LUMO backend tests.

Sets up a SQLite in-memory database that patches out the PostgreSQL-specific
schema qualification (content.lessons → lessons) so tests run without Docker.
"""
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.database import Base


SQLALCHEMY_TEST_URL = "sqlite:///:memory:"


@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(
        SQLALCHEMY_TEST_URL,
        connect_args={"check_same_thread": False},
    )

    # SQLite doesn't support schemas. Attach PRAGMA to make it work.
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    # Patch the Lesson model's schema so SQLite can create the table
    from app.models.lesson import Lesson
    original_args = Lesson.__table_args__
    Lesson.__table_args__ = {}  # Remove schema for SQLite

    Base.metadata.create_all(bind=engine)
    yield engine

    Lesson.__table_args__ = original_args
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def test_session_factory(test_engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session(test_session_factory):
    session = test_session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
