"""
MDX/Markdown to HTML rendering service.

Converts MDX lesson content to semantic HTML using markdown-it-py.
Handles CommonMark syntax and gracefully strips JSX component tags
that cannot be rendered server-side.
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
        """Convert MDX/Markdown content to semantic HTML."""
        cleaned = self._strip_jsx_tags(mdx_content)
        html = self.md.render(cleaned)
        return html.strip()

    def _strip_jsx_tags(self, text: str) -> str:
        """Remove self-closing JSX tags (e.g. <Quiz />) the backend can't render."""
        # Self-closing: <ComponentName ... />
        text = re.sub(r"<[A-Z]\w*[^>]*/\s*>", "", text)
        # Block-level JSX: <ComponentName>...</ComponentName>
        text = re.sub(r"<[A-Z]\w*[^>]*>.*?</[A-Z]\w*>", "", text, flags=re.DOTALL)
        # import/export statements from MDX
        text = re.sub(r"^(import|export)\s+.*$", "", text, flags=re.MULTILINE)
        return text


# Module-level singleton
_renderer: MdxRendererService | None = None


def get_renderer() -> MdxRendererService:
    global _renderer
    if _renderer is None:
        _renderer = MdxRendererService()
    return _renderer
