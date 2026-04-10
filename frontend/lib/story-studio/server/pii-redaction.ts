const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;

export function redactPii(text: string): string {
  if (!text) return text;
  return text.replace(EMAIL_RE, "[REDACTED_EMAIL]").replace(PHONE_RE, "[REDACTED_PHONE]");
}

