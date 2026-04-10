from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import urlencode

from app.core.config import Settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    pass


def _build_url(settings: Settings, path: str, params: dict[str, str]) -> str:
    base_url = settings.app_base_url.rstrip("/")
    return f"{base_url}{path}?{urlencode(params)}"


def _deliver_via_smtp(settings: Settings, message: EmailMessage) -> None:
    if not settings.smtp_host:
        raise EmailDeliveryError("SMTP host is not configured.")

    try:
        if settings.smtp_use_ssl:
            smtp_client = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)
        else:
            smtp_client = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)

        with smtp_client as client:
            if not settings.smtp_use_ssl and settings.smtp_use_tls:
                client.starttls(context=ssl.create_default_context())
            if settings.smtp_username:
                client.login(settings.smtp_username, settings.smtp_password or "")
            client.send_message(message)
    except Exception as exc:  # pragma: no cover - exercised through monkeypatch in tests
        raise EmailDeliveryError("SMTP delivery failed.") from exc


def deliver_email(settings: Settings, *, recipient_email: str, subject: str, text_body: str) -> None:
    message = EmailMessage()
    message["From"] = formataddr((settings.mail_from_name, settings.mail_from_email))
    message["To"] = recipient_email
    message["Subject"] = subject
    message.set_content(text_body)

    delivery_mode = settings.mail_delivery_mode.strip().lower()
    if delivery_mode in ("log", "console"):
        # "console" was an old default but never implemented — treat like log for local dev.
        logger.info("Email delivery mode=%s to=%s subject=%s\n%s", delivery_mode, recipient_email, subject, text_body)
        return

    if delivery_mode != "smtp":
        raise EmailDeliveryError(f"Unsupported mail delivery mode: {settings.mail_delivery_mode}")

    _deliver_via_smtp(settings, message)


def send_verification_email(settings: Settings, recipient_email: str, verification_token: str) -> None:
    verification_url = _build_url(
        settings,
        "/verify-email",
        {"email": recipient_email, "token": verification_token},
    )
    deliver_email(
        settings,
        recipient_email=recipient_email,
        subject="Verify your LUMO parent account",
        text_body=(
            "Welcome to LUMO.\n\n"
            f"Verify your parent account by opening this link:\n{verification_url}\n\n"
            "If you did not create this account, you can ignore this email."
        ),
    )


def send_password_reset_email(settings: Settings, recipient_email: str, reset_token: str) -> None:
    reset_url = _build_url(
        settings,
        "/reset-password",
        {"token": reset_token},
    )
    deliver_email(
        settings,
        recipient_email=recipient_email,
        subject="Reset your LUMO password",
        text_body=(
            "We received a request to reset your LUMO password.\n\n"
            f"Open this secure link to choose a new password:\n{reset_url}\n\n"
            "If you did not request a password reset, you can ignore this email."
        ),
    )


def send_student_login_code_email(
    settings: Settings,
    recipient_email: str,
    login_code: str,
    *,
    expires_in_minutes: int,
    student_name: str | None = None,
) -> None:
    learner_line = f" for {student_name}" if student_name else ""
    deliver_email(
        settings,
        recipient_email=recipient_email,
        subject="Your LUMO student sign-in code",
        text_body=(
            f"Your LUMO student sign-in code{learner_line} is {login_code}.\n\n"
            f"It expires in {expires_in_minutes} minutes and works once.\n\n"
            "If you did not request this code, you can ignore this email."
        ),
    )