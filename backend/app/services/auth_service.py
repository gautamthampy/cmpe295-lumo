"""JWT + bcrypt auth service for parent and student accounts."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_BCRYPT_ROUNDS = 12


class AuthService:
    def __init__(self):
        self.settings = get_settings()

    # ------------------------------------------------------------------
    # Password / PIN hashing  (bcrypt 5.x direct API)
    # ------------------------------------------------------------------

    def hash_password(self, plain: str) -> str:
        return bcrypt.hashpw(
            plain.encode("utf-8"), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
        ).decode("utf-8")

    def verify_password(self, plain: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False

    def hash_pin(self, pin: str) -> str:
        """bcrypt a 4-digit PIN string."""
        return bcrypt.hashpw(
            pin.encode("utf-8"), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
        ).decode("utf-8")

    def verify_pin(self, pin: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(pin.encode("utf-8"), hashed.encode("utf-8"))
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Token creation
    # ------------------------------------------------------------------

    def create_parent_token(self, parent_id: UUID | str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.session_ttl_hours * 60
        )
        payload = {
            "sub": str(parent_id),
            "role": "parent",
            "exp": expire,
        }
        return jwt.encode(
            payload, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm
        )

    def create_student_token(self, student_id: UUID | str, parent_id: UUID | str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.student_token_expire_minutes
        )
        payload = {
            "sub": str(student_id),
            "parent_id": str(parent_id),
            "role": "student",
            "exp": expire,
        }
        return jwt.encode(
            payload, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm
        )

    def create_student_selection_token(self, parent_id: UUID | str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.settings.student_selection_token_ttl_minutes
        )
        payload = {
            "sub": str(parent_id),
            "role": "student-selection",
            "exp": expire,
        }
        return jwt.encode(
            payload, self.settings.jwt_secret, algorithm=self.settings.jwt_algorithm
        )

    # ------------------------------------------------------------------
    # Token decoding
    # ------------------------------------------------------------------

    def decode_token(self, token: str) -> dict:
        """Decode and validate a JWT. Raises JWTError on failure."""
        return jwt.decode(
            token,
            self.settings.jwt_secret,
            algorithms=[self.settings.jwt_algorithm],
        )

    def get_role(self, token: str) -> Literal["parent", "student", "student-selection"]:
        payload = self.decode_token(token)
        return payload.get("role", "student")


_auth_service: AuthService | None = None


def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
