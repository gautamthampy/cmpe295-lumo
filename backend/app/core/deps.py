"""FastAPI dependency functions for authentication."""
from typing import Tuple
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.auth import Parent, Student
from app.services.auth_service import get_auth_service

security = HTTPBearer(auto_error=False)


def _get_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


def _decode(token: str) -> dict:
    auth = get_auth_service()
    try:
        return auth.decode_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_parent(
    token: str = Depends(_get_token),
    db: Session = Depends(get_db),
) -> Parent:
    payload = _decode(token)
    if payload.get("role") != "parent":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Parent access required")
    parent = db.query(Parent).filter(Parent.parent_id == UUID(payload["sub"])).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found")
    return parent


async def get_current_student(
    token: str = Depends(_get_token),
    db: Session = Depends(get_db),
) -> Student:
    payload = _decode(token)
    if payload.get("role") != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    student = db.query(Student).filter(Student.student_id == UUID(payload["sub"])).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


async def get_current_user(
    token: str = Depends(_get_token),
    db: Session = Depends(get_db),
) -> Tuple[str, UUID]:
    """Returns (role, id) — works for both parent and student tokens."""
    payload = _decode(token)
    role = payload.get("role", "student")
    user_id = UUID(payload["sub"])
    return role, user_id


async def get_optional_student(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> Student | None:
    """Returns the current student or None if not authenticated as student."""
    if not credentials:
        return None
    try:
        payload = _decode(credentials.credentials)
    except HTTPException:
        return None
    if payload.get("role") != "student":
        return None
    return db.query(Student).filter(Student.student_id == UUID(payload["sub"])).first()
