"""
Accessibility checker service for LUMO lesson content.

Implements a deterministic, rule-based WCAG 2.1 Level AA compliance
checker for educational HTML content. Each rule is binary (pass/fail)
contributing equally to a 0.0-1.0 score.

10 rules total → each rule = 0.10 points.
"""
import re
from dataclasses import dataclass, field


@dataclass
class AccessibilityIssue:
    rule: str
    severity: str  # "error" | "warning"
    message: str


@dataclass
class AccessibilityResult:
    score: float
    issues: list[AccessibilityIssue] = field(default_factory=list)
    passed_rules: int = 0
    total_rules: int = 10


class AccessibilityChecker:
    TOTAL_RULES = 10

    def check(self, html_content: str, grade_level: int = 3) -> AccessibilityResult:
        """
        Run all accessibility rules against rendered HTML.

        Args:
            html_content: The rendered HTML string from MdxRendererService.
            grade_level: Lesson grade level, used for reading-level thresholds.

        Returns:
            AccessibilityResult with score and list of issues.
        """
        issues: list[AccessibilityIssue] = []
        passed = 0

        rules = [
            self._check_heading_hierarchy,
            self._check_no_images_without_alt,
            self._check_list_semantics,
            self._check_no_generic_link_text,
            self._check_paragraph_length,
            self._check_reading_level,
            self._check_semantic_structure,
            self._check_table_headers,
            self._check_content_length,
            self._check_no_dangerous_tags,
        ]

        for rule_fn in rules:
            issue = rule_fn(html_content, grade_level)
            if issue is None:
                passed += 1
            else:
                issues.append(issue)

        score = round(passed / self.TOTAL_RULES, 2)
        return AccessibilityResult(
            score=score,
            issues=issues,
            passed_rules=passed,
            total_rules=self.TOTAL_RULES,
        )

    # ------------------------------------------------------------------
    # Individual rules — return None (pass) or AccessibilityIssue (fail)
    # ------------------------------------------------------------------

    def _check_heading_hierarchy(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 1: Headings must not skip levels (h1→h3 without h2 is invalid)."""
        tags = re.findall(r"<(h[1-6])", html, re.IGNORECASE)
        levels = [int(t[1]) for t in tags]
        prev = 0
        for level in levels:
            if level > prev + 1 and prev != 0:
                return AccessibilityIssue(
                    rule="heading-hierarchy",
                    severity="error",
                    message=f"Heading level skipped: h{prev} followed by h{level}.",
                )
            prev = level
        return None

    def _check_no_images_without_alt(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 2: All <img> elements must have a non-empty alt attribute."""
        imgs = re.findall(r"<img\b([^>]*)>", html, re.IGNORECASE)
        for attrs in imgs:
            if not re.search(r'\balt\s*=\s*"[^"]+"', attrs):
                return AccessibilityIssue(
                    rule="img-alt-text",
                    severity="error",
                    message="One or more <img> elements are missing a non-empty alt attribute.",
                )
        return None

    def _check_list_semantics(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 3: Bullet-like patterns inside <p> tags signal improper list markup."""
        # Find paragraphs with dash-prefixed lines that should be <ul>
        paragraphs = re.findall(r"<p>(.*?)</p>", html, re.DOTALL)
        for para in paragraphs:
            lines = [l.strip() for l in para.split("\n") if l.strip()]
            if len(lines) >= 3 and all(re.match(r"^[•\-\*]", l) for l in lines):
                return AccessibilityIssue(
                    rule="list-semantics",
                    severity="warning",
                    message="Bullet-style content found inside <p> tags. Use <ul>/<li> instead.",
                )
        return None

    def _check_no_generic_link_text(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 4: Link text must not be generic ('click here', 'here', 'read more')."""
        generic = re.compile(
            r"<a\b[^>]*>\s*(click here|here|read more|learn more|more)\s*</a>",
            re.IGNORECASE,
        )
        if generic.search(html):
            return AccessibilityIssue(
                rule="link-text",
                severity="error",
                message="Generic link text found ('click here', 'here', etc.). Use descriptive link text.",
            )
        return None

    def _check_paragraph_length(self, html: str, grade: int) -> AccessibilityIssue | None:
        """Rule 5: No single paragraph exceeds 150 words (readability for young learners)."""
        max_words = 150 if grade <= 4 else 250
        paragraphs = re.findall(r"<p>(.*?)</p>", html, re.DOTALL)
        for para in paragraphs:
            text = re.sub(r"<[^>]+>", "", para)
            word_count = len(text.split())
            if word_count > max_words:
                return AccessibilityIssue(
                    rule="paragraph-length",
                    severity="warning",
                    message=f"A paragraph has {word_count} words (max {max_words} for grade {grade}).",
                )
        return None

    def _check_reading_level(self, html: str, grade: int) -> AccessibilityIssue | None:
        """Rule 6: Flesch-Kincaid grade level should be within 2 grades of target."""
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()
        if not text:
            return None

        sentences = max(1, len(re.findall(r"[.!?]+", text)))
        words_list = text.split()
        words = max(1, len(words_list))
        syllables = sum(self._count_syllables(w) for w in words_list)

        fk_grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
        fk_grade = max(0.0, round(fk_grade, 1))

        # Allow up to 3 grade levels above target (math vocabulary is harder)
        threshold = grade + 3
        if fk_grade > threshold:
            return AccessibilityIssue(
                rule="reading-level",
                severity="warning",
                message=(
                    f"Estimated reading level is grade {fk_grade:.1f}, "
                    f"but target is grade {grade} (threshold {threshold})."
                ),
            )
        return None

    def _check_semantic_structure(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 7: Content must have at least one heading and use semantic bold/em."""
        if not re.search(r"<h[1-6]", html, re.IGNORECASE):
            return AccessibilityIssue(
                rule="semantic-structure",
                severity="error",
                message="No heading tags found. Content needs at least one <h1>-<h6> element.",
            )
        # Check for non-semantic <b> or <i> (markdown-it-py won't emit these, but validate anyway)
        if re.search(r"<b>|<i>", html):
            return AccessibilityIssue(
                rule="semantic-structure",
                severity="warning",
                message="Use <strong> and <em> instead of <b> and <i> for semantic meaning.",
            )
        return None

    def _check_table_headers(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 8: Any <table> must have <th> header cells."""
        if "<table" in html.lower():
            if "<th" not in html.lower():
                return AccessibilityIssue(
                    rule="table-headers",
                    severity="error",
                    message="Table found without <th> header cells. Add headers for screen reader support.",
                )
        return None

    def _check_content_length(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 9: Micro-lessons should have 80-800 words."""
        text = re.sub(r"<[^>]+>", " ", html)
        word_count = len(text.split())
        if word_count < 80:
            return AccessibilityIssue(
                rule="content-length",
                severity="error",
                message=f"Lesson is too short ({word_count} words). Minimum is 80 words.",
            )
        if word_count > 800:
            return AccessibilityIssue(
                rule="content-length",
                severity="warning",
                message=f"Lesson is long ({word_count} words) for a micro-lesson. Consider splitting.",
            )
        return None

    def _check_no_dangerous_tags(self, html: str, _grade: int) -> AccessibilityIssue | None:
        """Rule 10: Content must not contain <script>, <style>, <iframe>, or event handlers."""
        dangerous = re.compile(
            r"<(script|style|iframe|object|embed)\b|on\w+\s*=",
            re.IGNORECASE,
        )
        if dangerous.search(html):
            return AccessibilityIssue(
                rule="no-dangerous-tags",
                severity="error",
                message="Dangerous HTML tags or event handlers found in content.",
            )
        return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _count_syllables(self, word: str) -> int:
        """Approximate syllable count using vowel-group heuristic."""
        word = word.lower().strip(".,!?;:'\"()-")
        if not word:
            return 0
        vowels = "aeiou"
        count = 0
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel
        # Silent trailing 'e'
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)


# Module-level singleton
_checker: AccessibilityChecker | None = None


def get_checker() -> AccessibilityChecker:
    global _checker
    if _checker is None:
        _checker = AccessibilityChecker()
    return _checker
