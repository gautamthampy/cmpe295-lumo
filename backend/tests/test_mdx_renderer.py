"""
Unit tests for MdxRendererService.

Covers: MDX→HTML conversion, JSX stripping, import/export removal,
adaptive rendering (scaffold/advanced blocks), edge cases.
"""
import pytest
from app.services.mdx_renderer import MdxRendererService


@pytest.fixture
def renderer():
    return MdxRendererService()


# ------------------------------------------------------------------ #
# Basic rendering                                                      #
# ------------------------------------------------------------------ #

class TestBasicRendering:
    def test_renders_heading(self, renderer):
        html = renderer.render("## Hello World")
        assert "<h2>Hello World</h2>" in html

    def test_renders_bold(self, renderer):
        html = renderer.render("This is **bold** text.")
        assert "<strong>bold</strong>" in html

    def test_renders_ordered_list(self, renderer):
        html = renderer.render("1. First\n2. Second\n3. Third")
        assert "<ol>" in html
        assert "<li>First</li>" in html

    def test_renders_unordered_list(self, renderer):
        html = renderer.render("- Apple\n- Banana\n- Cherry")
        assert "<ul>" in html
        assert "<li>Apple</li>" in html

    def test_renders_paragraph(self, renderer):
        html = renderer.render("A simple paragraph of text.")
        assert "<p>" in html
        assert "A simple paragraph of text." in html

    def test_empty_input_returns_empty(self, renderer):
        assert renderer.render("") == ""
        assert renderer.render("   ") == ""

    def test_renders_em(self, renderer):
        html = renderer.render("This is *italic* text.")
        assert "<em>italic</em>" in html


# ------------------------------------------------------------------ #
# JSX stripping                                                        #
# ------------------------------------------------------------------ #

class TestJsxStripping:
    def test_strips_self_closing_jsx(self, renderer):
        html = renderer.render("## Lesson\n\n<Quiz />\n\nSome text.")
        assert "<Quiz" not in html
        assert "Some text." in html

    def test_strips_jsx_with_props(self, renderer):
        html = renderer.render("<InteractiveExample id='1' color='blue' />")
        assert "<InteractiveExample" not in html

    def test_strips_block_jsx(self, renderer):
        mdx = "<Callout>\nThis is a callout block.\n</Callout>"
        html = renderer.render(mdx)
        assert "<Callout" not in html

    def test_strips_import_statements(self, renderer):
        mdx = "import { Quiz } from '@/components'\n\n## Lesson"
        html = renderer.render(mdx)
        assert "import" not in html
        assert "<h2>" in html

    def test_strips_export_statements(self, renderer):
        mdx = "export const meta = { title: 'Fractions' }\n\n## Lesson"
        html = renderer.render(mdx)
        assert "export" not in html

    def test_preserves_lowercase_html_tags(self, renderer):
        """JSX stripper only removes PascalCase tags; lowercase tags are untouched.
        markdown-it with html=False escapes inline HTML, so content remains."""
        html = renderer.render("Before <strong>word</strong> after.")
        # Content is present (may be escaped by markdown-it, but word is always there)
        assert "word" in html
        assert "strong" in html


# ------------------------------------------------------------------ #
# Adaptive rendering                                                   #
# ------------------------------------------------------------------ #

class TestAdaptiveRendering:
    SCAFFOLD_MDX = """## Lesson

Main content here.

<!-- scaffold -->
Extra scaffolding for struggling students.
<!-- /scaffold -->

<!-- advanced -->
Challenge extension for advanced students.
<!-- /advanced -->

## Key Takeaway
Summary here.
"""

    def test_scaffold_mode_includes_scaffold(self, renderer):
        """mastery < 0.5 → scaffold block visible."""
        html = renderer.render_adaptive(self.SCAFFOLD_MDX, mastery_score=0.3)
        assert "Extra scaffolding for struggling students." in html

    def test_scaffold_mode_excludes_advanced(self, renderer):
        """mastery < 0.5 → advanced block hidden."""
        html = renderer.render_adaptive(self.SCAFFOLD_MDX, mastery_score=0.3)
        assert "Challenge extension" not in html

    def test_advanced_mode_includes_advanced(self, renderer):
        """mastery > 0.8 → advanced block visible."""
        html = renderer.render_adaptive(self.SCAFFOLD_MDX, mastery_score=0.9)
        assert "Challenge extension for advanced students." in html

    def test_advanced_mode_excludes_scaffold(self, renderer):
        """mastery > 0.8 → scaffold block hidden."""
        html = renderer.render_adaptive(self.SCAFFOLD_MDX, mastery_score=0.9)
        assert "Extra scaffolding" not in html

    def test_standard_mode_excludes_both_annotated(self, renderer):
        """0.5 <= mastery <= 0.8 → neither scaffold nor advanced."""
        html = renderer.render_adaptive(self.SCAFFOLD_MDX, mastery_score=0.65)
        assert "Extra scaffolding" not in html
        assert "Challenge extension" not in html

    def test_standard_mode_keeps_main_content(self, renderer):
        html = renderer.render_adaptive(self.SCAFFOLD_MDX, mastery_score=0.65)
        assert "Main content here." in html
        assert "Summary here." in html

    def test_render_without_adaptive_annotations(self, renderer):
        """Plain MDX should render identically with render() and render_adaptive()."""
        plain = "## Topic\n\nSome content.\n\n## Key Takeaway\n\nDone."
        assert renderer.render(plain) == renderer.render_adaptive(plain, mastery_score=0.5)
