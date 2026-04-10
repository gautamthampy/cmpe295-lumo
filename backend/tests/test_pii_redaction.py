from app.services.pii_redaction import redact_pii


def test_redact_pii_redacts_email_and_phone():
    raw = "Contact me at test.user+demo@example.com or (408) 555-1212 please."
    redacted = redact_pii(raw)
    assert "example.com" not in redacted
    assert "555-1212" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_PHONE]" in redacted

