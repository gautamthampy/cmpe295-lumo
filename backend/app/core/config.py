"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LUMO Backend"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    AUTO_CREATE_TABLES: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://lumo:lumo_dev_password@localhost:5432/lumo"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    APP_BASE_URL: str = "http://localhost:3000"

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "lumo"
    MINIO_SECRET_KEY: str = "lumo_dev_password"
    MINIO_BUCKET: str = "lumo-content"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for parents
    STUDENT_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours for students (sessionStorage)
    STUDENT_SELECTION_TOKEN_TTL_MINUTES: int = 15
    BCRYPT_ROUNDS: int = 12
    SESSION_TTL_HOURS: int = 24
    REMEMBER_ME_SESSION_TTL_DAYS: int = 30
    VERIFICATION_TOKEN_TTL_HOURS: int = 24
    PASSWORD_RESET_TOKEN_TTL_HOURS: int = 2
    STUDENT_LOGIN_CODE_TTL_MINUTES: int = 10
    STUDENT_LOGIN_CODE_REQUEST_COOLDOWN_SECONDS: int = 60
    SESSION_COOKIE_NAME: str = "lumo_session"
    SESSION_COOKIE_SECURE: bool = False
    DEBUG_AUTH_TOKENS: bool = False

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-pro-preview"
    GEMINI_MAX_TOKENS: int = 8192
    GEMINI_TEMPERATURE: float = 0.7
    # LLM provider routing (Ollama = local, no Google API key)
    LLM_PROVIDER: str = "ollama"  # gemini | ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    # Privacy
    DATA_RETENTION_DAYS: int = 90
    ENABLE_ANONYMIZATION: bool = True
    ENABLE_GAZE_TELEMETRY: bool = False

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:8000",
    ]
    BACKEND_CORS_ORIGINS: list[str] = CORS_ORIGINS

    # Email / notifications
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    MAIL_FROM_EMAIL: str = "no-reply@lumo.local"
    MAIL_FROM_NAME: str = "LUMO"
    MAIL_DELIVERY_MODE: str = "log"  # log = print to server logs; smtp = real send

    # LLM (Google Gemini API)
    #GEMINI_API_KEY: str = ""
    #GEMINI_MODEL: str = "gemini-2.5-flash"
    #GEMINI_MAX_TOKENS: int = 8192
    #GEMINI_TEMPERATURE: float = 0.7

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def app_name(self) -> str:
        return self.APP_NAME

    @property
    def app_version(self) -> str:
        return self.APP_VERSION

    @property
    def debug(self) -> bool:
        return self.DEBUG

    @property
    def auto_create_tables(self) -> bool:
        return self.AUTO_CREATE_TABLES

    @property
    def api_v1_prefix(self) -> str:
        return self.API_V1_PREFIX

    @property
    def database_url(self) -> str:
        return self.DATABASE_URL

    @property
    def redis_url(self) -> str:
        return self.REDIS_URL

    @property
    def jwt_secret(self) -> str:
        return self.JWT_SECRET

    @property
    def jwt_algorithm(self) -> str:
        return self.JWT_ALGORITHM

    @property
    def jwt_expire_minutes(self) -> int:
        return self.JWT_EXPIRE_MINUTES

    @property
    def student_token_expire_minutes(self) -> int:
        return self.STUDENT_TOKEN_EXPIRE_MINUTES

    @property
    def student_selection_token_ttl_minutes(self) -> int:
        return self.STUDENT_SELECTION_TOKEN_TTL_MINUTES

    @property
    def bcrypt_rounds(self) -> int:
        return self.BCRYPT_ROUNDS

    @property
    def session_ttl_hours(self) -> int:
        return self.SESSION_TTL_HOURS

    @property
    def remember_me_session_ttl_days(self) -> int:
        return self.REMEMBER_ME_SESSION_TTL_DAYS

    @property
    def verification_token_ttl_hours(self) -> int:
        return self.VERIFICATION_TOKEN_TTL_HOURS

    @property
    def password_reset_token_ttl_hours(self) -> int:
        return self.PASSWORD_RESET_TOKEN_TTL_HOURS

    @property
    def student_login_code_ttl_minutes(self) -> int:
        return self.STUDENT_LOGIN_CODE_TTL_MINUTES

    @property
    def student_login_code_request_cooldown_seconds(self) -> int:
        return self.STUDENT_LOGIN_CODE_REQUEST_COOLDOWN_SECONDS

    @property
    def session_cookie_name(self) -> str:
        return self.SESSION_COOKIE_NAME

    @property
    def session_cookie_secure(self) -> bool:
        return self.SESSION_COOKIE_SECURE

    @property
    def debug_auth_tokens(self) -> bool:
        return self.DEBUG_AUTH_TOKENS

    @property
    def backend_cors_origins(self) -> list[str]:
        return self.BACKEND_CORS_ORIGINS

    @property
    def app_base_url(self) -> str:
        return self.APP_BASE_URL

    @property
    def smtp_host(self) -> str:
        return self.SMTP_HOST

    @property
    def smtp_port(self) -> int:
        return self.SMTP_PORT

    @property
    def smtp_use_tls(self) -> bool:
        return self.SMTP_USE_TLS

    @property
    def smtp_use_ssl(self) -> bool:
        return self.SMTP_USE_SSL

    @property
    def smtp_username(self) -> str:
        return self.SMTP_USERNAME

    @property
    def smtp_password(self) -> str:
        return self.SMTP_PASSWORD

    @property
    def mail_from_email(self) -> str:
        return self.MAIL_FROM_EMAIL

    @property
    def mail_from_name(self) -> str:
        return self.MAIL_FROM_NAME

    @property
    def mail_delivery_mode(self) -> str:
        return self.MAIL_DELIVERY_MODE


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
