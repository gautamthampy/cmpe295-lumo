# Import all models so SQLAlchemy's metadata is complete for migrations and seeding.
from app.models.lesson import Lesson  # noqa: F401
from app.models.auth import Parent, Student  # noqa: F401
from app.models.subject import (  # noqa: F401
    Subject,
    Topic,
    MisconceptionTaxonomy,
    StudentSubject,
    GenerationRun,
    DiagnosticAssessment,
)
