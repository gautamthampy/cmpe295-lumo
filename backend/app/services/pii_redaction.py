from __future__ import annotations

import re


_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_PHONE_RE = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b")


def redact_pii(text: str) -> str:
    """
    Minimal redaction used before any LLM call.
    We intentionally focus on high-signal PII patterns (email/phone) to avoid over-redacting
    learning content (names/places may be part of the lesson).
    """
    if not text:
        return text
    out = _EMAIL_RE.sub("[REDACTED_EMAIL]", text)
    out = _PHONE_RE.sub("[REDACTED_PHONE]", out)
    return out

