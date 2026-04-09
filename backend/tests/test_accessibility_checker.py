"""
Unit tests for AccessibilityChecker.

Tests all 10 WCAG 2.1 AA rules individually, verifies scoring logic,
and checks combined-rule scenarios.
"""
import pytest
from app.services.accessibility_checker import AccessibilityChecker, AccessibilityResult


@pytest.fixture
def checker():
    return AccessibilityChecker()


def _run(checker: AccessibilityChecker, html: str, grade: int = 3) -> AccessibilityResult:
    return checker.check(html, grade_level=grade)


# ------------------------------------------------------------------ #
# Rule 1: Heading hierarchy                                            #
# ------------------------------------------------------------------ #

class TestHeadingHierarchy:
    def test_valid_hierarchy(self, checker):
        html = "<h1>Main</h1><h2>Sub</h2><h3>Sub-sub</h3>"
        result = _run(checker, html)
        assert not any(i.rule == "heading-hierarchy" for i in result.issues)

    def test_skipped_level_flagged(self, checker):
        html = "<h1>Main</h1><h3>Skipped h2</h3>"
        result = _run(checker, html)
        assert any(i.rule == "heading-hierarchy" for i in result.issues)

    def test_first_heading_can_be_any_level(self, checker):
        html = "<h2>First heading</h2><p>Some text.</p>"
        result = _run(checker, html)
        assert not any(i.rule == "heading-hierarchy" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 2: Image alt text                                               #
# ------------------------------------------------------------------ #

class TestImageAltText:
    def test_img_with_alt_passes(self, checker):
        html = '<img src="dog.png" alt="A friendly dog sitting on a chair">'
        result = _run(checker, html)
        assert not any(i.rule == "img-alt-text" for i in result.issues)

    def test_img_without_alt_fails(self, checker):
        html = '<img src="dog.png">'
        result = _run(checker, html)
        assert any(i.rule == "img-alt-text" for i in result.issues)

    def test_img_with_empty_alt_fails(self, checker):
        html = '<img src="dog.png" alt="">'
        result = _run(checker, html)
        assert any(i.rule == "img-alt-text" for i in result.issues)

    def test_no_images_passes(self, checker):
        html = "<p>No images here.</p>"
        result = _run(checker, html)
        assert not any(i.rule == "img-alt-text" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 3: List semantics                                               #
# ------------------------------------------------------------------ #

class TestListSemantics:
    def test_proper_list_passes(self, checker):
        html = "<ul><li>Item A</li><li>Item B</li><li>Item C</li></ul>"
        result = _run(checker, html)
        assert not any(i.rule == "list-semantics" for i in result.issues)

    def test_bullet_in_paragraph_fails(self, checker):
        html = "<p>- Apple\n- Banana\n- Cherry</p>"
        result = _run(checker, html)
        assert any(i.rule == "list-semantics" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 4: Generic link text                                            #
# ------------------------------------------------------------------ #

class TestLinkText:
    def test_descriptive_link_passes(self, checker):
        html = '<a href="/fractions">Learn about fractions</a>'
        result = _run(checker, html)
        assert not any(i.rule == "link-text" for i in result.issues)

    def test_click_here_fails(self, checker):
        html = '<a href="/fractions">click here</a>'
        result = _run(checker, html)
        assert any(i.rule == "link-text" for i in result.issues)

    def test_here_fails(self, checker):
        html = '<p>Read about fractions <a href="/f">here</a>.</p>'
        result = _run(checker, html)
        assert any(i.rule == "link-text" for i in result.issues)

    def test_no_links_passes(self, checker):
        html = "<p>No links in this content.</p>"
        result = _run(checker, html)
        assert not any(i.rule == "link-text" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 5: Paragraph length                                             #
# ------------------------------------------------------------------ #

class TestParagraphLength:
    def test_short_paragraph_passes(self, checker):
        html = "<p>" + " ".join(["word"] * 50) + "</p>"
        result = _run(checker, html, grade=3)
        assert not any(i.rule == "paragraph-length" for i in result.issues)

    def test_long_paragraph_for_grade3_fails(self, checker):
        html = "<p>" + " ".join(["word"] * 160) + "</p>"
        result = _run(checker, html, grade=3)
        assert any(i.rule == "paragraph-length" for i in result.issues)

    def test_long_paragraph_ok_for_older_grade(self, checker):
        html = "<p>" + " ".join(["word"] * 160) + "</p>"
        result = _run(checker, html, grade=7)
        assert not any(i.rule == "paragraph-length" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 6: Reading level                                                #
# ------------------------------------------------------------------ #

class TestReadingLevel:
    def test_simple_text_passes_for_grade3(self, checker):
        # Short words, short sentences — low FK score
        html = "<h2>Cats</h2><p>I see a cat. The cat is big. It can run. I like cats.</p>"
        result = _run(checker, html, grade=3)
        assert not any(i.rule == "reading-level" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 7: Semantic structure                                           #
# ------------------------------------------------------------------ #

class TestSemanticStructure:
    def test_content_with_heading_passes(self, checker):
        html = "<h2>Topic</h2><p>Some content.</p>"
        result = _run(checker, html)
        assert not any(i.rule == "semantic-structure" for i in result.issues)

    def test_content_without_heading_fails(self, checker):
        html = "<p>Just a paragraph, no heading.</p>" * 5
        result = _run(checker, html)
        assert any(i.rule == "semantic-structure" for i in result.issues)

    def test_non_semantic_bold_fails(self, checker):
        html = "<h2>Title</h2><p>This is <b>bad bold</b>.</p>"
        result = _run(checker, html)
        assert any(i.rule == "semantic-structure" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 8: Table headers                                                #
# ------------------------------------------------------------------ #

class TestTableHeaders:
    def test_table_with_th_passes(self, checker):
        html = "<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>"
        result = _run(checker, html)
        assert not any(i.rule == "table-headers" for i in result.issues)

    def test_table_without_th_fails(self, checker):
        html = "<table><tr><td>A</td><td>B</td></tr></table>"
        result = _run(checker, html)
        assert any(i.rule == "table-headers" for i in result.issues)

    def test_no_table_passes(self, checker):
        html = "<h2>No table</h2><p>Just text.</p>"
        result = _run(checker, html)
        assert not any(i.rule == "table-headers" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 9: Content length                                               #
# ------------------------------------------------------------------ #

class TestContentLength:
    def test_appropriate_length_passes(self, checker):
        html = "<h2>Topic</h2><p>" + " ".join(["word"] * 150) + "</p>"
        result = _run(checker, html)
        assert not any(i.rule == "content-length" for i in result.issues)

    def test_too_short_fails(self, checker):
        html = "<h2>Topic</h2><p>Short.</p>"
        result = _run(checker, html)
        assert any(i.rule == "content-length" for i in result.issues)

    def test_too_long_flagged(self, checker):
        html = "<h2>Topic</h2><p>" + " ".join(["word"] * 900) + "</p>"
        result = _run(checker, html)
        assert any(i.rule == "content-length" for i in result.issues)


# ------------------------------------------------------------------ #
# Rule 10: No dangerous tags                                           #
# ------------------------------------------------------------------ #

class TestNoDangerousTags:
    def test_clean_html_passes(self, checker):
        html = "<h2>Safe</h2><p>Normal content.</p>"
        result = _run(checker, html)
        assert not any(i.rule == "no-dangerous-tags" for i in result.issues)

    def test_script_tag_fails(self, checker):
        html = "<h2>Oops</h2><script>alert('xss')</script>"
        result = _run(checker, html)
        assert any(i.rule == "no-dangerous-tags" for i in result.issues)

    def test_iframe_fails(self, checker):
        html = "<h2>Video</h2><iframe src='https://example.com'></iframe>"
        result = _run(checker, html)
        assert any(i.rule == "no-dangerous-tags" for i in result.issues)

    def test_event_handler_fails(self, checker):
        html = "<h2>Click</h2><p onclick='doSomething()'>Click me!</p>"
        result = _run(checker, html)
        assert any(i.rule == "no-dangerous-tags" for i in result.issues)


# ------------------------------------------------------------------ #
# Scoring                                                              #
# ------------------------------------------------------------------ #

class TestScoring:
    def test_perfect_score(self, checker):
        # A well-formed lesson should get a perfect score
        html = (
            "<h2>What Is a Fraction?</h2>"
            "<p>" + " ".join(["A fraction is part of a whole."] * 10) + "</p>"
            "<ul><li>The top number is the numerator.</li>"
            "<li>The bottom number is the denominator.</li>"
            "<li>Equal parts make a fraction.</li></ul>"
            "<h2>Key Takeaway</h2>"
            "<p>A fraction describes a part of a whole divided into equal pieces.</p>"
        )
        result = _run(checker, html, grade=3)
        assert result.score == 1.0
        assert result.passed_rules == 10
        assert len(result.issues) == 0

    def test_score_decrements_per_failure(self, checker):
        # No heading = -0.10
        html = "<p>" + " ".join(["word"] * 100) + "</p>"
        result = _run(checker, html)
        assert result.score < 1.0
        failed = result.total_rules - result.passed_rules
        assert abs(result.score - round(result.passed_rules / 10, 2)) < 0.01
        assert failed >= 1

    def test_total_rules_always_ten(self, checker):
        result = _run(checker, "<h2>X</h2><p>y</p>")
        assert result.total_rules == 10
