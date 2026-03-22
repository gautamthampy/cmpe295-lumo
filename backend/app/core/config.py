from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


_REPO_ROOT = Path(__file__).resolve().parents[3]
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_REPO_ROOT / ".env"), str(_BACKEND_ROOT / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "LUMO Parent Auth API"
    api_v1_prefix: str = "/api/v1"
    app_base_url: str = "http://localhost:3000"
    database_url: str = "postgresql+psycopg://lumo:lumo@localhost:5432/lumo_auth"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = Field(default="", min_length=32)
    jwt_algorithm: str = "HS256"
    backend_cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:3000"])
    session_cookie_name: str = "lumo_session"
    session_cookie_secure: bool = False
    verification_token_ttl_hours: int = 48
    password_reset_token_ttl_hours: int = 24
    session_ttl_hours: int = 12
    remember_me_session_ttl_days: int = 30
    student_token_expire_minutes: int = 60
    student_login_code_ttl_minutes: int = 10
    student_login_code_request_cooldown_seconds: int = 60
    student_selection_token_ttl_minutes: int = 5
    auto_create_tables: bool = False
    debug_auth_tokens: bool = False

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
