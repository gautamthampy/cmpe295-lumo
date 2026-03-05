"""
DiagnosticService — generates probing assessments to identify student misconceptions.

Flow:
1. Parent requests diagnostic for a student + subject
2. Service fetches misconception taxonomy (seeds if missing)
3. Generates 6 probing MultipleChoice/TrueOrFalse activities via LLM
4. Student completes the assessment
5. Service scores responses, extracts weak_tags, updates mastery_scores
6. Returns suggested lessons (from existing DB or newly generated)
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.subject import DiagnosticAssessment, MisconceptionTaxonomy, Subject

logger = logging.getLogger(__name__)

_PROBE_ACTIVITY_COUNT = 6


class DiagnosticService:
    def __init__(self, db: Session, gemini=None, subject_svc=None):
        self.db = db
        self.gemini = gemini
        self.subject_svc = subject_svc

    async def generate_diagnostic(
        self,
        subject: Subject,
        grade_level: int,
        student_id: UUID,
        topic_id: Optional[UUID] = None,
        requested_by: str = "parent",
    ) -> DiagnosticAssessment:
        """Generate a diagnostic assessment and persist it."""
        # Ensure taxonomy exists
        if self.subject_svc:
            taxonomy = await self.subject_svc.get_or_generate_taxonomy(subject, grade_level)
        else:
            taxonomy = (
                self.db.query(MisconceptionTaxonomy)
                .filter(MisconceptionTaxonomy.subject_id == subject.subject_id)
                .all()
            )

        priority_tags = self._select_probe_tags(taxonomy)
        activities = await self._generate_probe_activities(priority_tags, subject, grade_level)

        assessment = DiagnosticAssessment(
            subject_id=subject.subject_id,
            student_id=student_id,
            topic_id=topic_id,
            status="active",
            activities=activities,
            requested_by=requested_by,
        )
        self.db.add(assessment)
        self.db.commit()
        self.db.refresh(assessment)
        return assessment

    def score_diagnostic(
        self,
        assessment_id: UUID,
        responses: list[dict],
    ) -> DiagnosticAssessment:
        """
        Score student responses and derive weak_tags.
        responses: [{"activity_id": str, "answer": str}]
        """
        assessment = (
            self.db.query(DiagnosticAssessment)
            .filter(DiagnosticAssessment.assessment_id == assessment_id)
            .first()
        )
        if not assessment:
            raise ValueError(f"Assessment {assessment_id} not found")

        activities = assessment.activities or []
        activity_map = {a.get("id"): a for a in activities}
        response_map = {r["activity_id"]: r["answer"] for r in responses}

        scored = []
        weak_tags: list[str] = []

        for act in activities:
            act_id = act.get("id")
            student_answer = response_map.get(act_id)
            correct_answer = self._get_correct_answer(act)
            is_correct = student_answer == correct_answer

            if not is_correct:
                tag = act.get("misconception_tag")
                if tag and tag not in weak_tags:
                    weak_tags.append(tag)

            scored.append({
                "activity_id": act_id,
                "student_answer": student_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "misconception_tag": act.get("misconception_tag"),
            })

        assessment.results = scored
        assessment.weak_tags = weak_tags
        assessment.status = "completed"
        assessment.completed_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(assessment)
        return assessment

    async def suggest_lessons(self, assessment: DiagnosticAssessment) -> list[dict]:
        """
        After scoring, suggest or generate lessons targeting the weak_tags.
        Returns a list of {lesson_id, title, subject} dicts.
        """
        if not assessment.weak_tags:
            return []

        from app.models.lesson import Lesson
        from sqlalchemy import cast
        from sqlalchemy.dialects.postgresql import ARRAY, TEXT

        # Find existing lessons whose misconception_tags overlap weak_tags
        lessons = (
            self.db.query(Lesson)
            .filter(
                Lesson.status == "active",
                Lesson.misconception_tags.overlap(cast(assessment.weak_tags, ARRAY(TEXT))),
            )
            .limit(3)
            .all()
        )

        suggestions = [
            {
                "lesson_id": str(l.lesson_id),
                "title": l.title,
                "subject": l.subject,
                "match_reason": "Targets detected misconceptions",
            }
            for l in lessons
        ]

        # If fewer than 2 suggestions and Gemini available, generate one more
        if len(suggestions) < 2 and self.gemini and assessment.student_id:
            subject = (
                self.db.query(Subject)
                .filter(Subject.subject_id == assessment.subject_id)
                .first()
            )
            if subject:
                from app.services.generation.misconception_strategy import MisconceptionStrategy
                from app.services.generation.base import GenerationContext

                ctx = GenerationContext(
                    topic=f"Review: {', '.join(assessment.weak_tags[:2])}",
                    subject_name=subject.name,
                    grade_level=3,
                    student_id=assessment.student_id,
                    misconception_tags=assessment.weak_tags,
                    recent_errors=assessment.weak_tags,
                )
                strategy = MisconceptionStrategy(self.gemini)
                try:
                    result = await strategy.generate(ctx)
                    suggestions.append({
                        "lesson_id": None,
                        "title": f"Personalised: {ctx.topic}",
                        "subject": subject.name,
                        "generated_mdx": result.mdx_content,
                        "match_reason": "Generated to address your specific difficulties",
                    })
                except Exception as e:
                    logger.warning(f"Diagnostic lesson generation failed: {e}")

        return suggestions

    def _select_probe_tags(self, taxonomy: list) -> list[str]:
        """Pick fundamental (parent_tag IS NULL) tags first, then children."""
        fundamental = [t for t in taxonomy if not t.parent_tag]
        children = [t for t in taxonomy if t.parent_tag]
        ordered = fundamental + children
        return [t.tag for t in ordered[:_PROBE_ACTIVITY_COUNT]]

    async def _generate_probe_activities(
        self, tags: list[str], subject: Subject, grade_level: int
    ) -> list[dict]:
        """Generate one probing activity per misconception tag."""
        if not tags:
            return []

        if not self.gemini or not self.gemini._client:
            return self._stub_activities(tags)

        prompt = f"""Generate {len(tags)} diagnostic quiz activities to probe Grade {grade_level} {subject.name} misconceptions.

For each misconception tag below, generate one MultipleChoice activity that:
- Correctly identifies students who hold that misconception
- Includes a distractor that is the "misconception answer" (what a student with that belief would pick)
- Is answerable in under 30 seconds

Misconception tags: {', '.join(tags)}

Return a JSON array of objects with this schema:
[{{
  "type": "MultipleChoice",
  "id": "diag-N",
  "instruction": "Choose the best answer",
  "misconception_tag": "<tag>",
  "difficulty": "standard",
  "data": {{
    "question": "<question text>",
    "options": [{{"id": "a", "text": "..."}}, {{"id": "b", "text": "..."}}, {{"id": "c", "text": "..."}}],
    "correct_id": "<a|b|c>"
  }}
}}]

Return ONLY valid JSON, no preamble.
"""
        raw = await self.gemini._generate_content(prompt)
        try:
            clean = raw.strip()
            if clean.startswith("```"):
                clean = "\n".join(clean.split("\n")[1:-1])
            return json.loads(clean)
        except Exception as e:
            logger.error(f"Failed to parse diagnostic activities JSON: {e}")
            return self._stub_activities(tags)

    def _stub_activities(self, tags: list[str]) -> list[dict]:
        return [
            {
                "type": "TrueOrFalse",
                "id": f"diag-{i + 1}",
                "instruction": f"Check your understanding of {tag}",
                "misconception_tag": tag,
                "difficulty": "standard",
                "data": {
                    "statement": f"I understand the concept of {tag.replace('-', ' ')}.",
                    "correct": True,
                    "explanation": "This is a self-check question.",
                },
            }
            for i, tag in enumerate(tags)
        ]

    def _get_correct_answer(self, activity: dict) -> Optional[str]:
        data = activity.get("data", {})
        if activity.get("type") == "MultipleChoice":
            return data.get("correct_id")
        if activity.get("type") == "TrueOrFalse":
            return str(data.get("correct", True)).lower()
        if activity.get("type") == "FillInBlank":
            return data.get("answer")
        return None
