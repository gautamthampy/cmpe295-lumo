"""
SubjectService — manages the subject/topic catalog and misconception taxonomies.

Misconception taxonomies are either statically seeded or AI-generated on first
request for a new subject (persisted to DB so LLM is called only once per subject+grade).
"""
from __future__ import annotations

import json
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.subject import MisconceptionTaxonomy, Subject, Topic

logger = logging.getLogger(__name__)

# Grade 3 math misconception taxonomy (hand-curated, seeded via this service)
_MATH_GRADE3_TAXONOMY = [
    ("fraction-as-two-numbers", "Student treats the numerator and denominator as separate independent numbers rather than parts of a whole", None),
    ("fraction-larger-denominator-bigger", "Student believes a fraction with a larger denominator represents a larger value (e.g., 1/8 > 1/4)", "fraction-as-two-numbers"),
    ("place-value-confusion", "Student confuses the value represented by digit position (ones, tens, hundreds)", None),
    ("multiplication-as-repeated-addition-only", "Student cannot extend multiplication understanding beyond repeated addition to arrays and area models", None),
    ("division-always-gives-smaller-result", "Student believes division always produces a result smaller than the dividend", None),
    ("subtraction-smaller-from-larger", "Student always subtracts the smaller digit from the larger regardless of which is the minuend", "place-value-confusion"),
    ("perimeter-area-confusion", "Student confuses perimeter (distance around) with area (space inside)", None),
    ("rounding-truncation-confusion", "Student truncates instead of rounding (e.g., rounds 67 down to 60 instead of 70)", None),
    ("skip-counting-errors", "Student makes consistent errors in skip-counting sequences (by 2s, 5s, 10s)", None),
    ("word-problem-keyword-overreliance", "Student applies operation based solely on keywords ('more'=add, 'less'=subtract) ignoring actual problem structure", None),
]

# Grade 3 English misconception taxonomy
_ENGLISH_GRADE3_TAXONOMY = [
    ("decoding-sight-word-confusion", "Student attempts to decode sight words phonetically rather than recognising them as whole words", None),
    ("punctuation-end-of-sentence", "Student does not use terminal punctuation consistently or misuses period/question mark/exclamation", None),
    ("plural-irregular-overgeneralisation", "Student applies regular plural rule (-s/-es) to irregular plurals (e.g., 'mouses', 'childs')", None),
    ("verb-tense-consistency", "Student shifts verb tenses within a single sentence or paragraph without reason", None),
    ("homophone-confusion", "Student confuses commonly confused homophones (their/there/they're, to/too/two)", None),
    ("main-idea-vs-detail", "Student cannot distinguish between the main idea of a passage and supporting details", None),
    ("inference-literal-only", "Student only recalls explicitly stated facts and cannot make inferences from context", None),
    ("compound-word-decomposition", "Student cannot identify or use compound words correctly", None),
]


class SubjectService:
    def __init__(self, db: Session, gemini=None):
        self.db = db
        self.gemini = gemini

    def get_subject_by_slug(self, slug: str) -> Optional[Subject]:
        return self.db.query(Subject).filter(Subject.slug == slug).first()

    def get_subject_by_name(self, name: str) -> Optional[Subject]:
        return self.db.query(Subject).filter(Subject.name == name).first()

    def get_or_create_subject(self, name: str) -> Subject:
        """Get existing subject or create a new one with a derived slug."""
        subject = self.db.query(Subject).filter(Subject.name == name).first()
        if subject:
            return subject
        slug = name.lower().replace(" ", "-")[:50]
        subject = Subject(name=name, slug=slug)
        self.db.add(subject)
        self.db.commit()
        self.db.refresh(subject)
        logger.info(f"Created new subject: {name} ({slug})")
        return subject

    def get_topics(self, subject_id: UUID, grade_level: Optional[int] = None) -> list[Topic]:
        q = self.db.query(Topic).filter(Topic.subject_id == subject_id)
        if grade_level is not None:
            q = q.filter((Topic.grade_level == grade_level) | (Topic.grade_level.is_(None)))
        return q.order_by(Topic.name).all()

    def get_taxonomy(self, subject_id: UUID, grade_level: int) -> list[MisconceptionTaxonomy]:
        return (
            self.db.query(MisconceptionTaxonomy)
            .filter(
                MisconceptionTaxonomy.subject_id == subject_id,
                MisconceptionTaxonomy.grade_levels.any(grade_level),
            )
            .all()
        )

    async def get_or_generate_taxonomy(
        self, subject: Subject, grade_level: int
    ) -> list[MisconceptionTaxonomy]:
        """
        Return existing taxonomy for this subject+grade.
        If none exists, seed from hand-curated data or generate via LLM.
        """
        existing = self.get_taxonomy(subject.subject_id, grade_level)
        if existing:
            return existing

        # Try hand-curated seed data first
        seeded = self._seed_taxonomy(subject, grade_level)
        if seeded:
            return seeded

        # Fall back to AI generation if Gemini is available
        if self.gemini and self.gemini._client:
            return await self._generate_taxonomy_via_llm(subject, grade_level)

        return []

    def _seed_taxonomy(
        self, subject: Subject, grade_level: int
    ) -> list[MisconceptionTaxonomy]:
        """Insert hand-curated taxonomy rows for known subjects."""
        if subject.slug == "math" and grade_level == 3:
            data = _MATH_GRADE3_TAXONOMY
        elif subject.slug == "english" and grade_level == 3:
            data = _ENGLISH_GRADE3_TAXONOMY
        else:
            return []

        entries = []
        for tag, description, parent_tag in data:
            existing = (
                self.db.query(MisconceptionTaxonomy)
                .filter(
                    MisconceptionTaxonomy.subject_id == subject.subject_id,
                    MisconceptionTaxonomy.tag == tag,
                )
                .first()
            )
            if not existing:
                entry = MisconceptionTaxonomy(
                    subject_id=subject.subject_id,
                    tag=tag,
                    description=description,
                    grade_levels=[grade_level],
                    parent_tag=parent_tag,
                    generated_by="static",
                )
                self.db.add(entry)
                entries.append(entry)

        if entries:
            self.db.commit()
            for e in entries:
                self.db.refresh(e)
        return entries or self.get_taxonomy(subject.subject_id, grade_level)

    async def _generate_taxonomy_via_llm(
        self, subject: Subject, grade_level: int
    ) -> list[MisconceptionTaxonomy]:
        """Generate a misconception taxonomy via Gemini for a new/unknown subject."""
        prompt = f"""Generate a structured misconception taxonomy for Grade {grade_level} {subject.name}.

Return a JSON array of 12-20 objects with this schema:
[{{"tag": "kebab-case-identifier", "description": "One sentence describing the specific wrong belief or error", "parent_tag": "parent-tag or null"}}]

Focus on the most common and impactful misconceptions students hold at this grade level.
Return ONLY valid JSON, no preamble.
"""
        raw = await self.gemini._generate_content(prompt)
        try:
            # Strip markdown fences if present
            clean = raw.strip()
            if clean.startswith("```"):
                clean = "\n".join(clean.split("\n")[1:-1])
            items = json.loads(clean)
        except Exception as e:
            logger.error(f"Failed to parse LLM taxonomy JSON: {e}")
            return []

        entries = []
        for item in items:
            tag = item.get("tag", "").strip()[:100]
            if not tag:
                continue
            entry = MisconceptionTaxonomy(
                subject_id=subject.subject_id,
                tag=tag,
                description=item.get("description", "")[:500],
                grade_levels=[grade_level],
                parent_tag=item.get("parent_tag"),
                generated_by="ai_generated",
            )
            self.db.add(entry)
            entries.append(entry)

        if entries:
            self.db.commit()
            for e in entries:
                self.db.refresh(e)
        return entries
