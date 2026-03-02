"""
Unit tests for interactive activity schema validation and MDX renderer integration.

Covers:
  - Schema validation for all 10 activity types
  - Renderer: extraction, sentinel replacement, HTML placeholders
  - Renderer: adaptive blocks containing interactive blocks
  - Error handling: malformed JSON, unknown type, invalid schema
  - API-level: verify extract_interactive_activities helper
"""
import json
import base64
import pytest
from app.schemas.interactive import validate_interactive_block
from app.services.mdx_renderer import MdxRendererService


@pytest.fixture
def renderer():
    return MdxRendererService()


# ---------------------------------------------------------------------------
# Schema validation — happy paths
# ---------------------------------------------------------------------------

class TestSchemaValidation:
    def test_fill_in_blank(self):
        raw = {
            "type": "FillInBlank",
            "id": "act-1",
            "instruction": "Complete the equation",
            "data": {"prompt": "3 x 0 = ___", "answer": "0"},
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["type"] == "FillInBlank"
        assert result["data"]["answer"] == "0"

    def test_true_or_false(self):
        raw = {
            "type": "TrueOrFalse",
            "id": "act-2",
            "instruction": "True or false?",
            "data": {
                "statement": "3/4 means 3 and 4.",
                "correct": False,
                "explanation": "A fraction is one number, not two separate numbers.",
            },
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["type"] == "TrueOrFalse"
        assert result["data"]["correct"] is False

    def test_multiple_choice(self):
        raw = {
            "type": "MultipleChoice",
            "id": "act-3",
            "instruction": "Choose the correct answer",
            "data": {
                "question": "What is 1/4 + 2/4?",
                "options": [
                    {"id": "a", "text": "1/4"},
                    {"id": "b", "text": "3/4"},
                    {"id": "c", "text": "3/8"},
                ],
                "correct_id": "b",
            },
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["data"]["correct_id"] == "b"

    def test_drag_to_sort(self):
        raw = {
            "type": "DragToSort",
            "id": "act-4",
            "instruction": "Order from smallest to largest",
            "data": {
                "items": ["3/4", "1/4", "1/2"],
                "correct_order": ["1/4", "1/2", "3/4"],
            },
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["type"] == "DragToSort"
        assert result["data"]["correct_order"][0] == "1/4"

    def test_match_pairs(self):
        raw = {
            "type": "MatchPairs",
            "id": "act-5",
            "instruction": "Match each fraction to its name",
            "data": {
                "pairs": [
                    {"left": "1/2", "right": "one half"},
                    {"left": "1/4", "right": "one quarter"},
                ],
            },
        }
        result = validate_interactive_block(json.dumps(raw))
        assert len(result["data"]["pairs"]) == 2

    def test_category_sort(self):
        raw = {
            "type": "CategorySort",
            "id": "act-6",
            "instruction": "Sort each word into the correct category",
            "data": {
                "categories": [
                    {"name": "Nouns", "items": ["dog", "house"]},
                    {"name": "Verbs", "items": ["run", "jump"]},
                ],
            },
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["data"]["categories"][0]["name"] == "Nouns"

    def test_word_bank(self):
        raw = {
            "type": "WordBank",
            "id": "act-7",
            "instruction": "Fill in the blanks using the word bank",
            "data": {
                "passage": "The ___ jumped over the ___.",
                "bank": ["dog", "fence", "cat", "river"],
                "answers": ["dog", "fence"],
            },
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["data"]["answers"] == ["dog", "fence"]

    def test_number_line(self):
        raw = {
            "type": "NumberLine",
            "id": "act-8",
            "instruction": "Place 3/4 on the number line",
            "data": {"min": 0, "max": 1, "divisions": 4, "target": 0.75},
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["data"]["target"] == 0.75

    def test_counting_grid(self):
        raw = {
            "type": "CountingGrid",
            "id": "act-9",
            "instruction": "Tap cells to show 3 × 5",
            "data": {"rows": 3, "cols": 5, "target_count": 15, "prompt": "Tap 15 cells"},
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["data"]["target_count"] == 15

    def test_highlight_text(self):
        raw = {
            "type": "HighlightText",
            "id": "act-10",
            "instruction": "Highlight all adjectives",
            "data": {
                "passage": "The big red dog ran quickly.",
                "targets": ["big", "red"],
                "prompt": "Tap on all the adjectives",
            },
        }
        result = validate_interactive_block(json.dumps(raw))
        assert "big" in result["data"]["targets"]

    def test_optional_fields_default(self):
        raw = {
            "type": "FillInBlank",
            "id": "act-x",
            "instruction": "Fill in",
            "data": {"prompt": "2 + ___ = 5", "answer": "3"},
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["misconception_tag"] is None
        assert result["difficulty"] == "standard"

    def test_misconception_tag_preserved(self):
        raw = {
            "type": "FillInBlank",
            "id": "act-x",
            "instruction": "Fill in",
            "misconception_tag": "zero-property-error",
            "data": {"prompt": "5 x 0 = ___", "answer": "0"},
        }
        result = validate_interactive_block(json.dumps(raw))
        assert result["misconception_tag"] == "zero-property-error"


# ---------------------------------------------------------------------------
# Schema validation — error cases
# ---------------------------------------------------------------------------

class TestSchemaErrors:
    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            validate_interactive_block("{not valid json}")

    def test_unknown_type_raises(self):
        raw = json.dumps({"type": "MagicWidget", "id": "x", "instruction": "do it", "data": {}})
        with pytest.raises(ValueError, match="Unknown activity type"):
            validate_interactive_block(raw)

    def test_missing_required_field_raises(self):
        # FillInBlank without `answer` in data
        raw = json.dumps({
            "type": "FillInBlank",
            "id": "x",
            "instruction": "fill",
            "data": {"prompt": "3 + ___ = 5"},
        })
        with pytest.raises(Exception):
            validate_interactive_block(raw)

    def test_empty_string_raises(self):
        with pytest.raises(ValueError, match="Invalid JSON"):
            validate_interactive_block("")


# ---------------------------------------------------------------------------
# Renderer: interactive block extraction and HTML placeholder
# ---------------------------------------------------------------------------

class TestRendererInteractiveBlocks:
    FILL_IN_BLANK_JSON = json.dumps({
        "type": "FillInBlank",
        "id": "act-1",
        "instruction": "Complete the equation",
        "data": {"prompt": "3 x 0 = ___", "answer": "0"},
    })

    def _make_mdx(self, json_str: str) -> str:
        return f"## Practice\n\nTry this:\n\n<!-- interactive -->\n{json_str}\n<!-- /interactive -->\n\n## Summary\n\nDone."

    def test_interactive_block_produces_placeholder(self, renderer):
        mdx = self._make_mdx(self.FILL_IN_BLANK_JSON)
        html = renderer.render(mdx)
        assert 'data-interactive=' in html
        assert 'interactive-placeholder' in html

    def test_interactive_placeholder_is_valid_base64_json(self, renderer):
        mdx = self._make_mdx(self.FILL_IN_BLANK_JSON)
        html = renderer.render(mdx)

        import re
        m = re.search(r'data-interactive="([^"]+)"', html)
        assert m is not None, "No data-interactive attribute found"
        encoded = m.group(1)
        decoded = json.loads(base64.b64decode(encoded).decode())
        assert decoded["type"] == "FillInBlank"
        assert decoded["data"]["answer"] == "0"

    def test_surrounding_text_preserved(self, renderer):
        mdx = self._make_mdx(self.FILL_IN_BLANK_JSON)
        html = renderer.render(mdx)
        assert "Try this:" in html
        assert "Done." in html

    def test_multiple_interactive_blocks(self, renderer):
        json2 = json.dumps({
            "type": "TrueOrFalse",
            "id": "act-2",
            "instruction": "True or false?",
            "data": {
                "statement": "A fraction is two numbers.",
                "correct": False,
                "explanation": "It is one number.",
            },
        })
        mdx = (
            "## Part 1\n\n"
            f"<!-- interactive -->\n{self.FILL_IN_BLANK_JSON}\n<!-- /interactive -->\n\n"
            "## Part 2\n\n"
            f"<!-- interactive -->\n{json2}\n<!-- /interactive -->"
        )
        html = renderer.render(mdx)
        assert html.count('data-interactive=') == 2

    def test_invalid_json_produces_error_placeholder(self, renderer):
        mdx = "## Test\n\n<!-- interactive -->\nnot json at all\n<!-- /interactive -->"
        html = renderer.render(mdx)
        assert 'interactive-error' in html
        assert 'data-interactive=' not in html

    def test_no_interactive_blocks_unchanged(self, renderer):
        mdx = "## Plain lesson\n\nJust some text.\n\n## Key Takeaway\n\nDone."
        html = renderer.render(mdx)
        assert 'data-interactive=' not in html
        assert 'interactive-placeholder' not in html
        assert "Just some text." in html

    def test_extract_interactive_activities(self, renderer):
        mdx = self._make_mdx(self.FILL_IN_BLANK_JSON)
        activities = renderer.extract_interactive_activities(mdx)
        assert len(activities) == 1
        assert activities[0]["type"] == "FillInBlank"

    def test_extract_skips_invalid_blocks(self, renderer):
        mdx = (
            "<!-- interactive -->\n{bad json}\n<!-- /interactive -->\n\n"
            f"<!-- interactive -->\n{self.FILL_IN_BLANK_JSON}\n<!-- /interactive -->"
        )
        activities = renderer.extract_interactive_activities(mdx)
        assert len(activities) == 1

    def test_render_adaptive_interactive_in_scaffold(self, renderer):
        """Interactive block inside scaffold block: shown at mastery < 0.5, hidden otherwise."""
        json_str = self.FILL_IN_BLANK_JSON
        mdx = (
            "## Lesson\n\nMain content.\n\n"
            "<!-- scaffold -->\n"
            f"<!-- interactive -->\n{json_str}\n<!-- /interactive -->\n"
            "<!-- /scaffold -->\n\n"
            "## Key Takeaway\n\nDone."
        )
        # Low mastery → scaffold shown → interactive block rendered
        html_low = renderer.render_adaptive(mdx, mastery_score=0.3)
        assert 'data-interactive=' in html_low

        # High mastery → scaffold hidden → interactive block removed
        html_high = renderer.render_adaptive(mdx, mastery_score=0.9)
        assert 'data-interactive=' not in html_high

    def test_render_adaptive_interactive_in_advanced(self, renderer):
        """Interactive block inside advanced block: shown at mastery > 0.8 only."""
        json_str = self.FILL_IN_BLANK_JSON
        mdx = (
            "## Lesson\n\nMain content.\n\n"
            "<!-- advanced -->\n"
            f"<!-- interactive -->\n{json_str}\n<!-- /interactive -->\n"
            "<!-- /advanced -->\n\n"
            "## Key Takeaway\n\nDone."
        )
        html_high = renderer.render_adaptive(mdx, mastery_score=0.9)
        assert 'data-interactive=' in html_high

        html_low = renderer.render_adaptive(mdx, mastery_score=0.3)
        assert 'data-interactive=' not in html_low

    def test_existing_tests_unaffected(self, renderer):
        """Plain MDX without interactive blocks renders the same as before."""
        plain = "## Topic\n\nSome content.\n\n## Key Takeaway\n\nDone."
        assert renderer.render(plain) == renderer.render_adaptive(plain, mastery_score=0.5)
