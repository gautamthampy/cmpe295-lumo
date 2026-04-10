from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
database_url = settings.DATABASE_URL
# Prefer psycopg (v3) driver by default to avoid requiring psycopg2.
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
engine = create_engine(database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_supported_tables(bind: Engine) -> list:
    if bind.dialect.name != "sqlite":
        return list(Base.metadata.sorted_tables)
    return [table for table in Base.metadata.sorted_tables if table.schema is None]


def create_db_and_tables(bind: Engine | None = None) -> None:
    # Ensure ORM models are imported so SQLAlchemy metadata is fully registered.
    import app.models  # noqa: F401

    target_engine = bind or engine
    Base.metadata.create_all(bind=target_engine, tables=get_supported_tables(target_engine))


def drop_db_tables(bind: Engine | None = None) -> None:
    # Keep model imports symmetric for create/drop behavior in tests.
    import app.models  # noqa: F401

    target_engine = bind or engine
    Base.metadata.drop_all(bind=target_engine, tables=get_supported_tables(target_engine))
