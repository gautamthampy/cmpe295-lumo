import re
from typing import Dict, Any

class ToneGuardrails:
    """
    Enforces a growth mindset tone for explanations and motivation messages.
    Rejects messages containing overly negative, definitive, or demotivating language.
    """

    # Simple keyword-based negation detection for guardrails
    RESTRICTED_KEYWORDS = [
        "wrong", "stupid", "dumb", "fail", "failed", "never", "impossible",
        "bad", "terrible", "horrible", "awful", "cannot", "can't"
    ]

    def __init__(self):
        self._pattern = re.compile(
            r'\b(' + '|'.join(self.RESTRICTED_KEYWORDS) + r')\b', re.IGNORECASE
        )

    def is_safe_tone(self, message: str) -> bool:
        """
        Check if the message contains any restricted keywords.
        Returns True if the tone is safe (no restricted words found).
        """
        if not message:
            return True
        return not bool(self._pattern.search(message))

    def sanitize_explanation(self, explanation: str, correct_answer: str) -> str:
        """
        Validates the explanation tone. If it contains restricted keywords,
        returns a safe, static fallback explanation instead.
        """
        if self.is_safe_tone(explanation):
            return explanation
        
        # Fallback explanation
        return f"That's not quite right. The correct answer is {correct_answer}. Let's review this concept together to improve your understanding."

    def sanitize_motivation(self, motivation: str) -> str:
        """
        Validates the motivational message tone. If it contains restricted keywords,
        returns a safe, static fallback message instead.
        """
        if self.is_safe_tone(motivation):
            return motivation
        
        # Fallback motivation
        return "Every mistake is a chance to learn! Keep practicing, you'll get it."

# Global instance
tone_guardrails = ToneGuardrails()
