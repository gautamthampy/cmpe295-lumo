"""
Tests for the Lessons API — service and schema level.

These tests focus on the render pipeline and schema validation
without requiring a running Postgres instance.

For full endpoint integration tests with real DB, run:
  pytest -m integration  (requires docker-compose up -d)
"""
import pytest
from uuid import uuid4

from app.services.mdx_renderer import MdxRendererService
from app.services.accessibility_checker import AccessibilityChecker, AccessibilityIssue


# ------------------------------------------------------------------ #
# Render pipeline (service-level, no DB needed)                        #
# ------------------------------------------------------------------ #

GOOD_MDX = """## What Is a Fraction?

A **fraction** tells us about equal parts of a whole.
The **denominator** shows how many equal parts there are.
The **numerator** shows how many parts we have.
Fractions are one number, not two.
Learning fractions helps us understand parts.

## Key Ideas

Here are some important things to know about fractions:

- The numerator is the top number.
- The denominator is the bottom number.
- Equal parts make a fraction.

## Key Takeaway

A fraction is one number that describes a part of a whole divided equally.
Practice helps you understand fractions better.
"""


@pytest.fixture
def renderer():
    return MdxRendererService()


@pytest.fixture
def checker():
    return AccessibilityChecker()


class TestRenderPipeline:
    def test_produces_html_headings(self, renderer):
        html = renderer.render(GOOD_MDX)
        assert "<h2>" in html

    def test_produces_html_paragraphs(self, renderer):
        html = renderer.render(GOOD_MDX)
        assert "<p>" in html

    def test_bold_converted_to_strong(self, renderer):
        html = renderer.render(GOOD_MDX)
        assert "<strong>" in html

    def test_list_items_converted(self, renderer):
        html = renderer.render(GOOD_MDX)
        assert "<ul>" in html and "<li>" in html

    def test_no_raw_markdown_in_output(self, renderer):
        html = renderer.render(GOOD_MDX)
        assert "##" not in html
        assert "**" not in html

    def test_score_between_0_and_1(self, renderer, checker):
        html = renderer.render(GOOD_MDX)
        result = checker.check(html, grade_level=3)
        assert 0.0 <= result.score <= 1.0

    def test_good_lesson_scores_high(self, renderer, checker):
        html = renderer.render(GOOD_MDX)
        result = checker.check(html, grade_level=3)
        assert result.score >= 0.7

    def test_publish_guardrail_bad_content(self, renderer, checker):
        """Very short content should fail at least some accessibility rules."""
        html = renderer.render("short")
        result = checker.check(html, grade_level=3)
        # Short content fails semantic-structure and content-length; score <= 0.8
        assert result.score <= 0.8
        assert len(result.issues) >= 2

    def test_good_lesson_can_publish(self, renderer, checker):
        """Good MDX should produce score >= 0.8."""
        html = renderer.render(GOOD_MDX)
        result = checker.check(html, grade_level=3)
        assert result.score >= 0.8, (
            f"Good lesson scored {result.score:.2f}. "
            f"Failing: {[i.rule for i in result.issues]}"
        )

    def test_issues_have_required_fields(self, renderer, checker):
        html = renderer.render("no headings here just text text text")
        result = checker.check(html)
        for issue in result.issues:
            assert issue.rule and issue.severity in ("error", "warning") and issue.message

    def test_adaptive_scaffold_visible_at_low_mastery(self, renderer):
        mdx = GOOD_MDX + "\n<!-- scaffold -->\nExtra help.\n<!-- /scaffold -->\n"
        html = renderer.render_adaptive(mdx, mastery_score=0.3)
        assert "Extra help." in html

    def test_adaptive_advanced_hidden_at_low_mastery(self, renderer):
        mdx = GOOD_MDX + "\n<!-- advanced -->\nChallenge.\n<!-- /advanced -->\n"
        html = renderer.render_adaptive(mdx, mastery_score=0.3)
        assert "Challenge." not in html


class TestSchemaValidation:
    def test_lesson_create_requires_title(self):
        from pydantic import ValidationError
        from app.schemas.lesson import LessonCreate
        with pytest.raises(ValidationError):
            LessonCreate(
                subject="Math",
                grade_level=3,
                content_mdx="## Test\n\nContent here.",
                misconception_tags=[],
            )  # type: ignore

    def test_lesson_create_grade_level_max(self):
        from pydantic import ValidationError
        from app.schemas.lesson import LessonCreate
        with pytest.raises(ValidationError):
            LessonCreate(title="T", subject="M", grade_level=99, content_mdx="x")

    def test_rendered_response_score_max(self):
        from pydantic import ValidationError
        from app.schemas.lesson import RenderedLessonResponse, QuizContext
        qc = QuizContext(lesson_id=uuid4(), misconception_tags=[], subject="M", grade_level=3)
        with pytest.raises(ValidationError):
            RenderedLessonResponse(
                lesson_id=uuid4(),
                html_content="<p>hi</p>",
                estimated_time_minutes=1,
                accessibility_score=1.5,  # Above 1.0 — invalid
                misconception_tags=[],
                quiz_context=qc,
            )


class TestMockQuizTemplates:
    def test_known_tags_exist(self):
        from app.api.v1.endpoints.mock_quiz import MISCONCEPTION_TEMPLATES
        for tag in ["fraction-as-two-numbers", "multiplication-as-addition", "division-as-subtraction"]:
            assert tag in MISCONCEPTION_TEMPLATES, f"Missing template for: {tag}"

    def test_all_templates_have_3_distractors(self):
        from app.api.v1.endpoints.mock_quiz import MISCONCEPTION_TEMPLATES
        for tag, tmpl in MISCONCEPTION_TEMPLATES.items():
            assert len(tmpl["distractors"]) == 3, f"Expected 3 distractors for {tag}"

    def test_all_templates_have_required_keys(self):
        from app.api.v1.endpoints.mock_quiz import MISCONCEPTION_TEMPLATES
        for tag, tmpl in MISCONCEPTION_TEMPLATES.items():
            for key in ("question", "correct", "distractors"):
                assert key in tmpl, f"Missing '{key}' in template '{tag}'"
