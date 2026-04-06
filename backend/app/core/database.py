from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
engine = create_engine(settings.database_url, future=True)
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
    target_engine = bind or engine
    Base.metadata.create_all(bind=target_engine, tables=get_supported_tables(target_engine))


def drop_db_tables(bind: Engine | None = None) -> None:
    target_engine = bind or engine
    Base.metadata.drop_all(bind=target_engine, tables=get_supported_tables(target_engine))
