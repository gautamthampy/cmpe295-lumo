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

Interactive activities:
  Authors embed structured JSON activities using HTML comment delimiters:

    <!-- interactive -->
    {"type":"FillInBlank","id":"act-1","instruction":"Complete the equation",
     "misconception_tag":"zero-property-error","difficulty":"standard",
     "data":{"prompt":"3 x 0 = ___","answer":"0"}}
    <!-- /interactive -->

  The renderer validates each JSON block, replaces it with a text sentinel
  before markdown-it runs (preserving html=False security), then replaces
  the rendered sentinel paragraph with a <div data-interactive="..."> placeholder
  that the frontend React layer swaps for the appropriate component.
"""
import base64
import json
import re
from markdown_it import MarkdownIt

from app.schemas.interactive import validate_interactive_block


# Unique prefix that won't collide with lesson content
_SENTINEL_PREFIX = "LUMO_INTERACTIVE_BLOCK"


class MdxRendererService:
    def __init__(self):
        self.md = MarkdownIt(
            "commonmark",
            {"html": False, "typographer": True, "breaks": False},
        )

    def render(self, mdx_content: str) -> str:
        """Convert MDX/Markdown content to semantic HTML (no adaptive filtering)."""
        cleaned = self._strip_jsx_tags(mdx_content)
        cleaned = self._strip_adaptive_comments(cleaned)
        cleaned, sentinels = self._extract_interactive_blocks(cleaned)
        html = self.md.render(cleaned)
        html = self._restore_sentinels(html, sentinels)
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
        cleaned, sentinels = self._extract_interactive_blocks(cleaned)
        html = self.md.render(cleaned)
        html = self._restore_sentinels(html, sentinels)
        return html.strip()

    def extract_interactive_activities(self, mdx_content: str) -> list[dict]:
        """
        Extract and validate all interactive activity blocks from MDX content.
        Returns a list of activity dicts (same data that appears in data-interactive).
        Invalid blocks are skipped with a warning.
        """
        pattern = re.compile(
            r"<!--\s*interactive\s*-->(.*?)<!--\s*/interactive\s*-->",
            re.DOTALL,
        )
        activities = []
        for match in pattern.finditer(mdx_content):
            json_str = match.group(1).strip()
            try:
                activity = validate_interactive_block(json_str)
                if activity:
                    activities.append(activity)
            except (ValueError, Exception):
                pass
        return activities

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
                text = re.sub(
                    rf"<!--\s*{tag}\s*-->(.*?)<!--\s*/{tag}\s*-->",
                    r"\1",
                    text,
                    flags=re.DOTALL,
                )
            else:
                text = re.sub(
                    rf"<!--\s*{tag}\s*-->.*?<!--\s*/{tag}\s*-->",
                    "",
                    text,
                    flags=re.DOTALL,
                )

        replace_block("scaffold", show_scaffold)
        replace_block("advanced", show_advanced)
        return text

    def _extract_interactive_blocks(self, text: str) -> tuple[str, dict[str, str]]:
        """
        Find all <!-- interactive -->...<!-- /interactive --> blocks.

        Replaces each with a unique text sentinel on its own paragraph so
        markdown-it renders it as <p>SENTINEL</p>.  Returns the modified text
        and a mapping of {sentinel: base64_encoded_json_or_error_marker}.
        """
        pattern = re.compile(
            r"<!--\s*interactive\s*-->(.*?)<!--\s*/interactive\s*-->",
            re.DOTALL,
        )
        sentinels: dict[str, str] = {}
        counter = [0]

        def replacer(m: re.Match) -> str:
            json_str = m.group(1).strip()
            sentinel = f"{_SENTINEL_PREFIX}_{counter[0]}"
            counter[0] += 1

            try:
                activity = validate_interactive_block(json_str)
                if activity:
                    encoded = base64.b64encode(
                        json.dumps(activity).encode()
                    ).decode()
                    sentinels[sentinel] = encoded
                else:
                    sentinels[sentinel] = "ERROR"
            except (ValueError, Exception):
                sentinels[sentinel] = "ERROR"

            # Surround with blank lines so markdown-it wraps it as a paragraph
            return f"\n\n{sentinel}\n\n"

        modified = pattern.sub(replacer, text)
        return modified, sentinels

    def _restore_sentinels(self, html: str, sentinels: dict[str, str]) -> str:
        """
        Replace <p>SENTINEL</p> tags in the rendered HTML with interactive
        placeholder divs (or error divs for invalid blocks).
        """
        for sentinel, encoded in sentinels.items():
            # markdown-it wraps bare text in <p>; match with optional whitespace
            pattern = re.compile(
                rf"<p>\s*{re.escape(sentinel)}\s*</p>",
                re.IGNORECASE,
            )
            if encoded == "ERROR":
                replacement = (
                    '<div class="interactive-error" role="alert" '
                    'style="color:red;border:1px solid red;padding:8px;margin:8px 0;">'
                    "Invalid interactive activity block</div>"
                )
            else:
                replacement = (
                    f'<div data-interactive="{encoded}" '
                    f'class="interactive-placeholder"></div>'
                )
            html = pattern.sub(replacement, html)
        return html


# Module-level singleton
_renderer: MdxRendererService | None = None


def get_renderer() -> MdxRendererService:
    global _renderer
    if _renderer is None:
        _renderer = MdxRendererService()
    return _renderer
