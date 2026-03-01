"""
MDX/Markdown to HTML rendering service.

Converts MDX lesson content to semantic HTML using markdown-it-py.
Handles CommonMark syntax and gracefully strips JSX component tags
that cannot be rendered server-side.

Adaptive rendering:
  Lesson authors may annotate blocks with HTML comments to control
  which content appears at different mastery levels:

    <!-- scaffold -->
    Extra examples and definitions shown to struggling students (mastery < 0.5).
    <!-- /scaffold -->

    <!-- advanced -->
    Extended challenge problems shown only to advanced students (mastery > 0.8).
    <!-- /advanced -->

  Blocks without annotations are always shown.
"""
import re
from markdown_it import MarkdownIt


class MdxRendererService:
    def __init__(self):
        self.md = MarkdownIt(
            "commonmark",
            {"html": False, "typographer": True, "breaks": False},
        )

    def render(self, mdx_content: str) -> str:
        """Convert MDX/Markdown content to semantic HTML (no adaptive filtering)."""
        cleaned = self._strip_jsx_tags(mdx_content)
        # Remove adaptive annotation comments before rendering
        cleaned = self._strip_adaptive_comments(cleaned)
        html = self.md.render(cleaned)
        return html.strip()

    def render_adaptive(self, mdx_content: str, mastery_score: float) -> str:
        """
        Render MDX with adaptive content filtering based on mastery_score.

        mastery_score < 0.5  → scaffold mode: show <!-- scaffold --> blocks, hide <!-- advanced -->
        mastery_score > 0.8  → advanced mode: show <!-- advanced --> blocks, hide <!-- scaffold -->
        otherwise            → standard mode: show all non-annotated content
        """
        cleaned = self._strip_jsx_tags(mdx_content)

        show_scaffold = mastery_score < 0.5
        show_advanced = mastery_score > 0.8

        cleaned = self._filter_adaptive_blocks(cleaned, show_scaffold, show_advanced)
        html = self.md.render(cleaned)
        return html.strip()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _strip_jsx_tags(self, text: str) -> str:
        """Remove self-closing JSX tags (e.g. <Quiz />) the backend can't render."""
        # Self-closing: <ComponentName ... />
        text = re.sub(r"<[A-Z]\w*[^>]*/\s*>", "", text)
        # Block-level JSX: <ComponentName>...</ComponentName>
        text = re.sub(r"<[A-Z]\w*[^>]*>.*?</[A-Z]\w*>", "", text, flags=re.DOTALL)
        # import/export statements from MDX
        text = re.sub(r"^(import|export)\s+.*$", "", text, flags=re.MULTILINE)
        return text

    def _strip_adaptive_comments(self, text: str) -> str:
        """Remove all <!-- scaffold --> ... <!-- /scaffold --> and advanced blocks, keeping content."""
        for tag in ("scaffold", "advanced"):
            text = re.sub(
                rf"<!--\s*{tag}\s*-->(.*?)<!--\s*/{tag}\s*-->",
                r"\1",
                text,
                flags=re.DOTALL,
            )
        return text

    def _filter_adaptive_blocks(
        self, text: str, show_scaffold: bool, show_advanced: bool
    ) -> str:
        """
        Include or exclude annotated blocks based on mastery level.
        Non-annotated content is always preserved.
        """
        def replace_block(tag: str, include: bool):
            nonlocal text
            if include:
                # Keep content, remove comment tags
                text = re.sub(
                    rf"<!--\s*{tag}\s*-->(.*?)<!--\s*/{tag}\s*-->",
                    r"\1",
                    text,
                    flags=re.DOTALL,
                )
            else:
                # Remove entire block including content
                text = re.sub(
                    rf"<!--\s*{tag}\s*-->.*?<!--\s*/{tag}\s*-->",
                    "",
                    text,
                    flags=re.DOTALL,
                )

        replace_block("scaffold", show_scaffold)
        replace_block("advanced", show_advanced)
        return text


# Module-level singleton
_renderer: MdxRendererService | None = None


def get_renderer() -> MdxRendererService:
    global _renderer
    if _renderer is None:
        _renderer = MdxRendererService()
    return _renderer
