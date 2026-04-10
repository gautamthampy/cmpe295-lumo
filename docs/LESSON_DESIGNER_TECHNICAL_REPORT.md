# LUMO Lesson Designer Agent — Technical Report

**Author:** Gautam Thampy
**Course:** CMPE 295 — Master's Project, San Jose State University
**Date:** March 2026
**Component:** Lesson Designer Agent (within LUMO Multi-Agent AI Study Coach)

---

## Abstract

This report presents the design, implementation, and evaluation of the **Lesson Designer Agent**, a core component of LUMO — a multi-agent AI study coach for Grade 3 elementary mathematics. The Lesson Designer is responsible for the entire content lifecycle: AI-powered lesson generation using pedagogically-grounded strategies, interactive activity authoring, adaptive content rendering, accessibility enforcement, and curriculum sequencing. The system implements four generation strategies rooted in learning science — Zone of Proximal Development (ZPD), Bayesian Knowledge Tracing (BKT), Misconception-Targeted Instruction, and a Hybrid fusion approach — each producing structured MDX content with embedded interactive activities. A deterministic WCAG 2.1 Level AA accessibility checker enforces a publish guardrail, ensuring all content meets accessibility standards before reaching students. The frontend delivers lessons through an accessible, section-based viewer with 10 interactive activity types, real-time quiz integration, and adaptive scaffolding. The system comprises approximately 11,000 lines of production code across backend services (Python/FastAPI) and frontend components (TypeScript/Next.js), backed by 98 passing unit tests and 179 end-to-end test cases.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Pedagogical Foundations](#3-pedagogical-foundations)
4. [AI Generation Pipeline](#4-ai-generation-pipeline)
5. [Content Representation & Rendering](#5-content-representation--rendering)
6. [Interactive Activity System](#6-interactive-activity-system)
7. [Accessibility Engineering](#7-accessibility-engineering)
8. [Authentication & Multi-Tenancy](#8-authentication--multi-tenancy)
9. [Curriculum Sequencing & Adaptive Delivery](#9-curriculum-sequencing--adaptive-delivery)
10. [Evaluation Framework](#10-evaluation-framework)
11. [Testing Strategy](#11-testing-strategy)
12. [Design Decisions & Trade-offs](#12-design-decisions--trade-offs)
13. [Integration with Other Agents](#13-integration-with-other-agents)
14. [Limitations & Future Work](#14-limitations--future-work)
15. [Conclusion](#15-conclusion)
16. [References](#16-references)

---

## 1. Introduction

### 1.1 Problem Statement

Elementary math education faces a persistent challenge: the tension between personalized instruction and scalable content delivery. Traditional learning management systems deliver static content that cannot adapt to individual learner states, while fully generative AI systems often produce content that lacks pedagogical rigor, accessibility compliance, or alignment with known student misconceptions.

### 1.2 Proposed Solution

The Lesson Designer Agent addresses this gap by combining **generative AI** (Google Gemini) with **learning-theoretic strategies** to produce structured, accessible, interactive lessons that adapt to individual student mastery profiles. Rather than treating the LLM as an unconstrained generator, the system constrains generation through strategy-specific prompts that encode pedagogical theory, validates output through deterministic accessibility rules, and renders content through a type-safe pipeline that prevents arbitrary code execution.

### 1.3 Scope of This Report

This report covers the Lesson Designer's architecture across four implementation phases:

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | Core lesson CRUD, MDX rendering, prerequisite sequencing | Complete |
| **Phase 2** | Authentication, subject taxonomy, diagnostic assessments | Complete |
| **Phase 3** | AI generation strategies (ZPD, BKT, Misconception, Hybrid), evaluation framework | Complete |
| **Phase 4** | Interactive activities (10 types), accessibility checker, adaptive rendering, editor | Complete |

### 1.4 Contribution Summary

| Metric | Value |
|--------|-------|
| Backend Python LOC | ~3,600 (services, endpoints, schemas, evaluation) |
| Frontend TypeScript LOC | ~7,450 (components, pages, API layer, tests) |
| Backend unit tests | 98 passing |
| E2E test cases | 179 (across 15 Playwright suites) |
| Interactive activity types | 10 |
| WCAG 2.1 AA rules enforced | 10 |
| Generation strategies | 4 |
| Evaluation rubrics | 6 |
| API endpoints | 15+ |
| Database tables (new) | 8 |

---

## 2. System Architecture

### 2.1 High-Level Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 15)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Lesson  │  │   MDX    │  │ Learning │  │  Interactive   │  │
│  │  Viewer  │  │  Editor  │  │   Path   │  │  Activities   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │             │                │           │
│  ┌────┴──────────────┴─────────────┴────────────────┴───────┐  │
│  │              API Client (Axios + JWT Interceptors)        │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │         Zustand Auth Store (localStorage/sessionStorage)  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/REST
┌─────────────────────────────┴───────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Layer (v1)                           │ │
│  │  /lessons  /lessons/generate  /auth  /diagnostics  /eval   │ │
│  └──────┬──────────┬──────────────┬──────────┬────────┬───────┘ │
│         │          │              │          │        │          │
│  ┌──────┴───┐ ┌────┴────┐  ┌─────┴────┐ ┌──┴──┐ ┌──┴───┐     │
│  │   MDX    │ │Strategy │  │   Auth   │ │Diag.│ │ Eval │     │
│  │ Renderer │ │Registry │  │ Service  │ │Svc. │ │Engine│     │
│  └──────────┘ │         │  └──────────┘ └─────┘ └──────┘     │
│               │ ┌─────┐ │                                      │
│               │ │ ZPD │ │  ┌────────────────┐                  │
│               │ ├─────┤ │  │  Accessibility │                  │
│               │ │ BKT │ │  │    Checker     │                  │
│               │ ├─────┤ │  │  (10 WCAG      │                  │
│               │ │Misc.│ │  │   rules)       │                  │
│               │ ├─────┤ │  └────────────────┘                  │
│               │ │Hybr.│ │                                      │
│               │ └─────┘ │  ┌────────────────┐                  │
│               └─────────┘  │ Context Builder│                  │
│                            │ (DB → Strategy)│                  │
│  ┌─────────────────────────┴────────────────┴───────────────┐  │
│  │              SQLAlchemy ORM + Pydantic v2 Schemas        │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    PostgreSQL (Docker)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────┐  │
│  │  content  │  │   auth   │  │        learner / events      │  │
│  │ .lessons  │  │ .parents │  │ (future: mastery tracking)   │  │
│  │ .subjects │  │.students │  │                              │  │
│  │ .topics   │  └──────────┘  └──────────────────────────────┘  │
│  │.taxonomies│                                                  │
│  │.gen_runs  │     ┌────────────┐     ┌────────────┐           │
│  │.diagnostics│    │   Redis    │     │   MinIO    │           │
│  └───────────┘     └────────────┘     └────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v3 | Server-side rendering, type safety, utility-first CSS |
| State Management | Zustand with persist middleware | Lightweight, role-aware storage partitioning |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2 | Async-first, OpenAPI docs, schema validation |
| Database | PostgreSQL 15 | JSONB for flexible schemas, ARRAY types for tags |
| AI | Google Gemini (gemini-3.1-pro-preview) | Long-context generation with structured output |
| Testing | pytest (backend), Playwright (E2E) | Unit isolation, browser-based integration |

### 2.3 Key Design Principles

1. **Strategies as Pure Functions**: Generation strategies receive an immutable `GenerationContext` and return a `GenerationResult`, with no database access. All I/O is centralized in the `GenerationContextBuilder`.

2. **Security by Default**: The MDX renderer operates with `html=False`, preventing raw HTML injection. Interactive blocks use a sentinel-based extraction pipeline that preserves this security invariant.

3. **Graceful Degradation**: Every external service (Gemini, PostgreSQL, Redis) has a stub fallback, enabling offline development and demo mode.

4. **Accessibility as a First-Class Constraint**: Content cannot be published unless it passes a deterministic accessibility check (score >= 0.8).

---

## 3. Pedagogical Foundations

The Lesson Designer's generation strategies are grounded in three complementary learning theories, each addressing a different dimension of adaptive instruction.

### 3.1 Zone of Proximal Development (Vygotsky, 1978)

Vygotsky's ZPD defines the space between what a learner can do independently and what they can achieve with guidance. The system estimates the ZPD from mastery scores:

```
Given: mastery_scores: dict[tag → float]
       avg = mean(mastery_scores.values())

ZPD bounds:
  lower = max(0.0, avg - 0.15)
  upper = min(1.0, avg + 0.25)

Difficulty routing:
  avg < 0.40  →  "scaffold"  (within lower ZPD)
  avg > 0.75  →  "advanced"  (beyond upper ZPD)
  otherwise   →  "standard"  (within ZPD)
```

The asymmetric bandwidth (0.15 below, 0.25 above) reflects the pedagogical principle that learners benefit more from upward challenge than from downward simplification (Chaiklin, 2003).

### 3.2 Bayesian Knowledge Tracing (Corbett & Anderson, 1995)

BKT models each knowledge component as a hidden Markov model with four parameters:

| Parameter | Symbol | Default | Meaning |
|-----------|--------|---------|---------|
| Prior mastery | P(L₀) | 0.40 | Initial probability of mastery |
| Learn rate | P(T) | 0.30 | Probability of learning from one opportunity |
| Guess rate | P(G) | 0.25 | Probability of correct answer without mastery |
| Slip rate | P(S) | 0.10 | Probability of error despite mastery |

The posterior update after observing a response:

```
If correct:
  P(L|obs) = P(L)·(1-P(S)) / [P(L)·(1-P(S)) + (1-P(L))·P(G)]

If incorrect:
  P(L|obs) = P(L)·P(S) / [P(L)·P(S) + (1-P(L))·(1-P(G))]

Learning transition:
  P(L_{n+1}) = P(L|obs) + (1 - P(L|obs))·P(T)
```

Knowledge components with P(mastery) < 0.60 are flagged as **weak components** and prioritized in content generation.

### 3.3 Misconception-Targeted Instruction

Drawing from research on common mathematical misconceptions in elementary education, the system maintains a **misconception taxonomy** — a hierarchical tag structure mapping specific errors to their conceptual roots:

```
fraction-as-two-numbers
  ├── fraction-larger-denominator-bigger
  └── fraction-addition-add-across

place-value-confusion
  ├── place-value-digit-vs-value
  └── place-value-zero-placeholder

multiplication-as-addition-only
  └── multiplication-commutative-confusion
```

The Misconception strategy uses **Socratic confrontation**: explicitly showing the common mistake, explaining why it's wrong, and guiding toward correct reasoning. This approach is supported by research showing that directly addressing misconceptions is more effective than simply teaching the correct procedure (Chi, 2008).

### 3.4 Hybrid Fusion Strategy

The Hybrid strategy composes all three signals into a single generation prompt without additional LLM calls:

```
┌─────────────────────────────────────────┐
│             Hybrid Strategy             │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌────────┐  │
│  │   ZPD   │  │   BKT   │  │ Miscon.│  │
│  │ Signal  │  │ Signal  │  │ Signal │  │
│  └────┬────┘  └────┬────┘  └───┬────┘  │
│       │            │           │        │
│       └────────────┼───────────┘        │
│                    │                    │
│          ┌─────────┴─────────┐          │
│          │  Composite Prompt │          │
│          │  (single LLM call)│          │
│          └─────────┬─────────┘          │
│                    │                    │
│          ┌─────────┴─────────┐          │
│          │ GenerationResult  │          │
│          └───────────────────┘          │
└─────────────────────────────────────────┘
```

The composite prompt includes three labeled sections (ZPD SIGNAL, BKT SIGNAL, MISCONCEPTION SIGNAL), allowing the LLM to weigh the signals contextually. This avoids the latency penalty of sequential strategy execution while preserving multi-theoretic grounding.

---

## 4. AI Generation Pipeline

### 4.1 Pipeline Architecture

```
Topic + Subject + Grade + Student ID
            │
            ▼
  ┌─────────────────────┐
  │  GenerationContext   │
  │     Builder          │  ← DB reads (taxonomy, mastery, recent errors)
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  Strategy Registry   │  ← get_strategy(name, gemini_service)
  │  (ZPD|BKT|Misc|Hyb) │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  strategy.generate() │  ← LLM call (or stub fallback)
  │  → GenerationResult  │
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  MDX Renderer        │  ← render() → HTML
  │  + A11y Checker      │  ← check() → score, issues
  └──────────┬──────────┘
             │
             ▼
  ┌─────────────────────┐
  │  Quality Gate        │  ← score < 0.3 → reject
  │  Save as Draft       │  ← persist to content.lessons
  │  Log GenerationRun   │  ← latency_ms, eval_scores
  └─────────────────────┘
```

### 4.2 Context Builder (Builder Pattern)

The `GenerationContextBuilder` centralizes all database reads required by generation strategies, keeping strategies pure and testable:

```python
class GenerationContextBuilder:
    async def build(self, topic, subject, grade_level, student_id) -> GenerationContext:
        taxonomy_tags = await self._load_taxonomy_tags(subject, grade_level)
        mastery_scores = await self._load_mastery_scores(student_id)
        recent_errors  = await self._load_recent_errors(student_id)
        zpd_lower, zpd_upper = self._estimate_zpd(mastery_scores)

        return GenerationContext(
            topic=topic, subject_name=subject.name, grade_level=grade_level,
            student_id=student_id, misconception_tags=taxonomy_tags,
            mastery_scores=mastery_scores, recent_errors=recent_errors,
            zpd_lower=zpd_lower, zpd_upper=zpd_upper,
        )
```

**Recent errors** are extracted from `events.user_events` over a 14-day sliding window, filtered for `event_type = 'activity_incorrect'`, providing just-in-time misconception detection.

### 4.3 Strategy Registry (Factory Pattern)

```python
STRATEGY_REGISTRY: dict[str, type[LessonGenerationStrategy]] = {
    "zpd":           ZPDStrategy,
    "misconception": MisconceptionStrategy,
    "bkt":           BKTStrategy,
    "hybrid":        HybridStrategy,
}

def get_strategy(name: StrategyName, gemini: GeminiService) -> LessonGenerationStrategy:
    return STRATEGY_REGISTRY[name](gemini)
```

This registry enables:
- **Runtime strategy selection** via the `/lessons/generate` endpoint's `strategy` parameter
- **Comparative evaluation** by iterating all registered strategies
- **Extensibility** — new strategies require only a class definition and a registry entry

### 4.4 Interactive Activity Schema Specification

Each strategy's prompt includes a structured specification for 10 interactive activity types, ensuring the LLM produces valid JSON that the frontend can render:

```
<!-- interactive -->
{
  "type": "MultipleChoice",
  "id": "act-1",
  "instruction": "Which fraction is equal to one half?",
  "misconception_tag": "fraction-as-two-numbers",
  "difficulty": "standard",
  "data": {
    "options": [
      { "id": "a", "text": "1/2", "correct": true },
      { "id": "b", "text": "1/3", "correct": false },
      { "id": "c", "text": "2/4", "correct": true },
      { "id": "d", "text": "2/1", "correct": false }
    ]
  }
}
<!-- /interactive -->
```

All generated JSON is validated against Pydantic v2 discriminated union schemas before rendering, rejecting malformed output at the pipeline stage rather than at the user-facing layer.

---

## 5. Content Representation & Rendering

### 5.1 MDX as Content Format

Lessons are stored as MDX (Markdown + JSX) in the `content_mdx` column. The choice of MDX over raw HTML provides:

- **Author-friendly syntax**: Markdown headings, bold, lists, images
- **Embedded interactivity**: Interactive blocks via HTML comment delimiters
- **Adaptive regions**: `<!-- scaffold -->` and `<!-- advanced -->` blocks for mastery-based visibility
- **Security**: `html=False` in markdown-it-py prevents injection

### 5.2 Sentinel-Based Rendering Pipeline

The rendering pipeline must solve a key tension: interactive blocks contain JSON (which could be misinterpreted as HTML), but the renderer must run with `html=False` for security. The solution uses **sentinel-based extraction**:

```
Step 1: Extract interactive blocks
  Input:  "# Lesson\n<!-- interactive -->{...}<!-- /interactive -->\nMore text"
  Output: blocks = [{json: {...}, index: 0}]
          cleaned = "# Lesson\nLUMO_INTERACTIVE_BLOCK_0\nMore text"

Step 2: Render markdown (html=False — safe)
  Input:  cleaned markdown
  Output: "<h1>Lesson</h1>\n<p>LUMO_INTERACTIVE_BLOCK_0</p>\n<p>More text</p>"

Step 3: Restore sentinels as data attributes
  Input:  rendered HTML with sentinels
  Output: "<h1>Lesson</h1>\n<div data-interactive=\"BASE64_JSON\"></div>\n<p>More text</p>"

Step 4: Frontend decodes Base64 → JSON → React component
  Input:  <div data-interactive="eyJ0eXBlIjoiRmlsbEluQmxhbmsiLC4uLn0=">
  Output: <FillInBlankActivity {...parsedProps} />
```

**Base64 encoding** avoids quote-escaping issues in HTML attributes and enables clean, single-pass decoding in React.

### 5.3 Adaptive Content Rendering

```python
def render_adaptive(self, mdx: str, mastery_score: float) -> str:
    if mastery_score < 0.5:
        # Keep scaffold blocks, remove advanced
        mdx = self._keep_blocks(mdx, "scaffold")
        mdx = self._remove_blocks(mdx, "advanced")
    elif mastery_score > 0.8:
        # Remove scaffold, keep advanced
        mdx = self._remove_blocks(mdx, "scaffold")
        mdx = self._keep_blocks(mdx, "advanced")
    else:
        # Keep both (transitional zone)
        mdx = self._keep_blocks(mdx, "scaffold")
        mdx = self._keep_blocks(mdx, "advanced")

    return self.render(mdx)
```

Scaffold blocks provide simplified explanations and additional examples for struggling students. Advanced blocks contain extension challenges and enrichment for high-performing students. The thresholds (0.5 and 0.8) create a **hysteresis band** that prevents oscillation between modes.

---

## 6. Interactive Activity System

### 6.1 Activity Type Taxonomy

The system supports 10 interactive activity types, organized by pedagogical function:

| Category | Type | LOC | Pedagogical Purpose |
|----------|------|-----|-------------------|
| **Universal** | FillInBlank | 122 | Recall, procedural fluency |
| | TrueOrFalse | 75 | Conceptual understanding verification |
| | MultipleChoice | 97 | Discrimination between correct and misconception-aligned distractors |
| | DragToSort | 136 | Ordering, sequencing (with drag + click-to-swap fallback) |
| | MatchPairs | 133 | Association, relationship mapping |
| | CategorySort | 132 | Classification, categorical reasoning |
| | WordBank | 147 | Contextual vocabulary, sentence completion |
| **Math-specific** | NumberLine | 121 | Spatial numerical reasoning (SVG-based) |
| | CountingGrid | 112 | Array-based multiplication/area concepts |
| **English-specific** | HighlightText | 116 | Textual evidence identification |

### 6.2 Dispatcher Architecture (Discriminated Union)

```typescript
// InteractiveBlock.tsx — Type-safe factory dispatch
export default function InteractiveBlock({ activity, onResult }: Props) {
  switch (activity.type) {
    case 'FillInBlank':      return <FillInBlankActivity {...} />;
    case 'TrueOrFalse':      return <TrueOrFalseActivity {...} />;
    case 'MultipleChoice':   return <MultipleChoiceActivity {...} />;
    case 'DragToSort':       return <DragToSortActivity {...} />;
    case 'MatchPairs':       return <MatchPairsActivity {...} />;
    case 'CategorySort':     return <CategorySortActivity {...} />;
    case 'WordBank':         return <WordBankActivity {...} />;
    case 'NumberLine':       return <NumberLineActivity {...} />;
    case 'CountingGrid':     return <CountingGridActivity {...} />;
    case 'HighlightText':    return <HighlightTextActivity {...} />;
    default:                 return <div role="alert">Unknown type</div>;
  }
}
```

The discriminated union pattern ensures **exhaustive type checking** at compile time — adding a new activity type without a corresponding case produces a TypeScript error.

### 6.3 Unified Result Interface

Every activity reports results through a standardized interface:

```typescript
interface ActivityResult {
  activityId: string;
  correct: boolean;
  attempts: number;
  misconceptionTag: string | null;  // Links to taxonomy for targeted feedback
  timeSpentMs: number;
}
```

The `misconceptionTag` field enables closed-loop integration with the Quiz Agent and Feedback Agent — when a student answers incorrectly, the triggered misconception tag feeds forward into the next quiz generation and feedback routing.

### 6.4 Accessibility Implementation per Activity

Each activity implements WCAG 2.1 AA requirements:

| Requirement | Implementation | SC |
|-------------|---------------|-----|
| Keyboard operability | Tab/Enter/Space/Arrow key handlers on all interactive elements | 2.1.1 |
| Focus visible | Outline styling on focused elements; tabIndex management | 2.4.7 |
| Name, role, value | `aria-label`, `aria-pressed`, `aria-selected`, `role` attributes | 4.1.2 |
| Status messages | `aria-live="polite"` regions for correct/incorrect feedback | 4.1.3 |
| Instruction association | `aria-labelledby` linking instructions to input elements | 1.3.1 |
| Non-text alternatives | Text-only feedback (never color-alone) | 1.4.1 |

**DragToSort** provides a click-to-swap fallback for users who cannot perform drag operations, ensuring equivalent functionality for keyboard-only users.

---

## 7. Accessibility Engineering

### 7.1 Deterministic WCAG Checker

The backend accessibility checker enforces 10 rules, each contributing 0.10 to the total score (0.0–1.0):

| # | Rule | WCAG SC | Check |
|---|------|---------|-------|
| 1 | Heading hierarchy | 1.3.1 | No skipped heading levels (h1→h3 without h2) |
| 2 | Image alt text | 1.1.1 | All `<img>` tags have non-empty `alt` |
| 3 | List semantics | 1.3.1 | Bullet-style content uses `<ul>/<li>`, not `<p>` |
| 4 | Link text | 2.4.4 | No generic link text ("click here", "read more") |
| 5 | Paragraph length | 3.1.5 | Max 150 words (grade ≤ 4) or 250 (higher) |
| 6 | Reading level | 3.1.5 | Flesch-Kincaid grade ≤ target + 3 |
| 7 | Semantic structure | 1.3.1 | At least one heading; `<strong>/<em>` not `<b>/<i>` |
| 8 | Table headers | 1.3.1 | Tables have `<th>` cells |
| 9 | Content length | 3.1 | 80–800 words |
| 10 | No dangerous tags | 4.1.1 | No `<script>`, `<iframe>`, or event handlers |

**Flesch-Kincaid implementation:**

```python
def _count_syllables(word: str) -> int:
    """Vowel-group heuristic with silent-e rule."""
    vowels = "aeiou"
    count = 0
    prev_vowel = False
    for char in word.lower():
        is_vowel = char in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.lower().endswith("e") and count > 1:
        count -= 1
    return max(1, count)

grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
```

### 7.2 Publish Guardrail

The `/lessons/{id}/publish` endpoint enforces:

```python
if accessibility_score < 0.8:
    raise HTTPException(
        status_code=422,
        detail=f"Accessibility score {score:.2f} below threshold 0.80. "
               f"Issues: {[i.message for i in issues]}"
    )
```

This ensures **no lesson reaches students without meeting accessibility standards**, making accessibility a hard constraint rather than an advisory metric.

### 7.3 Frontend Accessibility Features

The LessonViewer implements comprehensive accessibility:

**Skip-to-Content Link:**
```html
<a href="#lesson-content"
   class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50">
  Skip to lesson content
</a>
```

**ARIA Live Regions:**
```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  Section {current} of {total}: {sectionTitle}
</div>
```

**Focus Management:**
```typescript
const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
useEffect(() => {
  sectionHeadingRef.current?.focus();
}, [currentSection]);
```

**Accessibility Settings Dialog:**
- Font size toggle: normal / large / x-large
- High contrast mode: `bg-black text-white`
- Dialog: `role="dialog"` with Escape key dismissal
- All toggles use `aria-pressed` for state communication

---

## 8. Authentication & Multi-Tenancy

### 8.1 Dual-Role Authentication

The system supports two user roles with different security profiles:

| | Parent | Student |
|---|--------|---------|
| Credential | Email + password | 4-digit PIN |
| Hash | bcrypt (12 rounds) | bcrypt (12 rounds) |
| Token expiry | 24 hours | 8 hours |
| Storage | localStorage | sessionStorage |
| Persistence | Survives browser restart | Cleared on tab close |
| Capabilities | Account management, diagnostic requests | Lesson access, quiz submission |

### 8.2 JWT Token Structure

```json
{
  "sub": "uuid",
  "role": "parent | student",
  "parent_id": "uuid (student only)",
  "display_name": "string",
  "exp": 1709654400
}
```

### 8.3 Route Protection (Middleware)

```typescript
// Next.js middleware — server-side route guard
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes: no auth required
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // Student routes: require student token
  if (pathname.startsWith('/learn') || pathname.startsWith('/diagnostic')) {
    const token = request.cookies.get('lumo_token')?.value;
    if (!token) return NextResponse.redirect(new URL('/student-login', request.url));
  }

  return NextResponse.next();
}
```

### 8.4 Storage Partitioning

The Zustand auth store uses **role-aware persistence**:

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({ /* ... */ }),
    {
      name: 'lumo-auth',
      storage: localStorage,
      partialize: (state) =>
        state.role === 'parent'
          ? { role, userId, displayName, token }
          : { role: null, userId: null, displayName: null, token: null },
    }
  )
);
```

Student tokens are stored in `sessionStorage` (via a separate write in the `login` action), ensuring child sessions don't persist across browser restarts — a **COPPA-informed** design decision for child privacy.

---

## 9. Curriculum Sequencing & Adaptive Delivery

### 9.1 Prerequisite Graph

Lessons form a directed acyclic graph (DAG) via the `prerequisites: UUID[]` column:

```
Understanding Place Value
    └── Adding 3-Digit Numbers
            └── Subtracting with Regrouping

Introduction to Fractions
    └── Comparing Fractions
```

### 9.2 BFS-Ordered Learning Path

The frontend `LearningPath` component linearizes the prerequisite graph using breadth-first search:

```typescript
// Identify root lessons (no prerequisites or external prerequisites)
const roots = lessons.filter(l =>
  l.prerequisites.length === 0 ||
  l.prerequisites.every(pid => !lessonIdSet.has(pid))
);

// BFS traversal
const queue = [...roots];
const visited = new Set<string>();
const ordered: LessonResponse[] = [];

while (queue.length > 0) {
  const current = queue.shift()!;
  if (visited.has(current.lesson_id)) continue;
  visited.add(current.lesson_id);
  ordered.push(current);
  // Enqueue successors (lessons that list current as prerequisite)
  successors.get(current.lesson_id)?.forEach(s => queue.push(s));
}
```

### 9.3 Next-Lesson Auto-Discovery

The render endpoint automatically discovers the next lesson in sequence:

```python
next_lesson = db.query(Lesson).filter(
    Lesson.prerequisites.contains([lesson.lesson_id]),
    Lesson.status == "active"
).first()
```

This creates a seamless learning flow: complete a lesson → pass the quiz → navigate to the next lesson in the prerequisite chain.

### 9.4 Two-Pass Seeding

Database seeding uses a two-pass approach to handle prerequisite circular dependencies:

```python
# Pass 1: Insert all lessons, collect IDs
for lesson_data in LESSONS:
    lesson = Lesson(**lesson_data, prerequisites=[])
    db.add(lesson)
    db.flush()  # Get ID without committing
    id_map[lesson.title] = lesson.lesson_id

# Pass 2: Wire prerequisites by title
for lesson_data in LESSONS:
    if lesson_data.get("prereq_titles"):
        lesson = id_map[lesson_data["title"]]
        lesson.prerequisites = [id_map[t] for t in lesson_data["prereq_titles"]]
```

---

## 10. Evaluation Framework

### 10.1 Rubric-Based Scoring

The evaluation framework defines 6 rubrics for comparative strategy analysis:

| Rubric | Score Range | Measurement |
|--------|------------|-------------|
| **Accessibility** | 0.0–1.0 | WCAG 2.1 AA 10-rule checker score |
| **Reading Level** | 0.0–1.0 | Flesch-Kincaid alignment with target grade (±1.5 tolerance) |
| **Misconception Coverage** | 0.0–1.0 | Fraction of priority misconception tags addressed in content |
| **Activity Count** | 0.0–1.0 | Quality curve: 0→0.0, 1→0.5, 2-4→1.0, 5→0.8, 6+→diminishing |
| **Scaffold Presence** | 0.0–1.0 | Presence of `<!-- scaffold -->` / `<!-- advanced -->` blocks when required by difficulty level |
| **Coherence** | 0.0–1.0 | Heading structure + topic mention + "Key Takeaway" + bold terms (0.25 each) |

### 10.2 Offline Batch Evaluation

```bash
python -m evaluation.run_eval \
  --topics "fractions,multiplication,place value" \
  --subject "Mathematics" \
  --grade 3 \
  --strategies zpd misconception bkt hybrid \
  --output results/eval_$(date +%Y%m%d).csv
```

**Output format** (CSV):

| topic | strategy | difficulty | latency_ms | accessibility | reading_level | misconception_coverage | activity_count | scaffold_presence | coherence | total_score |
|-------|----------|-----------|------------|---------------|--------------|----------------------|---------------|-------------------|-----------|-------------|
| fractions | hybrid | standard | 1842 | 0.90 | 0.85 | 0.67 | 1.00 | 0.50 | 0.75 | 4.67 |

### 10.3 Online Strategy Comparison

The `/evaluation/strategy-comparison` endpoint aggregates `GenerationRun` records:

```json
{
  "strategies": [
    {
      "strategy": "hybrid",
      "avg_accessibility_score": 0.87,
      "avg_latency_ms": 1650,
      "sample_count": 42
    },
    {
      "strategy": "zpd",
      "avg_accessibility_score": 0.82,
      "avg_latency_ms": 1420,
      "sample_count": 38
    }
  ]
}
```

This enables data-driven strategy selection as more generation runs accumulate.

---

## 11. Testing Strategy

### 11.1 Backend Unit Tests (98 tests — 100% pass rate)

| Test File | Count | Coverage Area |
|-----------|-------|--------------|
| `test_mdx_renderer.py` | 20 | Markdown rendering, JSX stripping, adaptive blocks, sentinel extraction |
| `test_accessibility_checker.py` | 33 | All 10 WCAG rules × multiple scenarios (pass, fail, edge cases) |
| `test_interactive.py` | 27 | All 10 activity schemas, optional fields, error handling, renderer integration |
| `test_lessons_api.py` | 18 | Render pipeline, publish guardrail, quiz templates, adaptive content |

**Testing approach**: Pure service-level tests using SQLite in-memory database. No Docker or external services required.

### 11.2 E2E Test Suite (179 tests across 15 Playwright suites)

| Suite | Tests | Coverage |
|-------|-------|---------|
| `auth.spec.ts` | 28 | Login, registration wizard, student PIN |
| `editor.spec.ts` | 22 | MDX authoring, AI generation, save/publish |
| `accessibility.spec.ts` | 17 | ARIA landmarks, keyboard nav, focus management |
| `activities-basic.spec.ts` | 7 | MultipleChoice, TrueOrFalse, FillInBlank |
| `activities-drag.spec.ts` | 8 | DragToSort, MatchPairs |
| `activities-special.spec.ts` | 11 | NumberLine, CountingGrid, HighlightText, WordBank, CategorySort |
| `lesson-viewer.spec.ts` | 12 | Section navigation, progress tracking |
| `lesson-quiz.spec.ts` | 7 | Quiz generation and submission |
| `analytics.spec.ts` | 8 | Dashboard metrics, per-lesson cards |
| `route-protection.spec.ts` | 11 | Middleware redirects |
| Other (5 files) | 48 | Home, learn, students, browse, error states |

**Test infrastructure**:
- **Page Object Model**: 8 page classes abstracting DOM selectors
- **Custom fixtures**: `lessonData` (fetches seeded lessons), `authMocks` (JWT injection)
- **Assertions**: ARIA attribute verification, role-based queries (`getByRole`)

### 11.3 Test Coverage Analysis

| Area | Unit Tests | E2E Tests | Coverage |
|------|-----------|-----------|----------|
| MDX rendering | 20 | 12 | Comprehensive |
| Accessibility rules | 33 | 17 | Comprehensive |
| Interactive activities (schema) | 27 | 26 | Comprehensive |
| Auth flow | — | 28 | E2E only |
| Generation strategies | — | — | Gap (requires Gemini) |
| Lesson CRUD | 18 | 8 | Good |
| Curriculum sequencing | — | 8 | E2E only |

---

## 12. Design Decisions & Trade-offs

| Decision | Alternatives Considered | Rationale |
|----------|------------------------|-----------|
| **markdown-it-py** for rendering | remark (Node.js), MDX compiler | Pure Python, no Node subprocess. JSX tags stripped with regex. |
| **10-rule deterministic checker** | axe-core, pa11y, WAVE API | Testable, fast, no external service. Rules map directly to WCAG 2.1 AA SCs. |
| **Publish guardrail at 0.8** | Advisory warnings, manual review | Hard constraint ensures accessibility is non-negotiable before student exposure. |
| **HTML comment delimiters** for blocks | Custom JSX tags, JSON blocks | Zero MDX spec deviation. Comments are invisible in rendered output. Consistent with scaffold/advanced pattern. |
| **Sentinel-based extraction** | HTML parser, AST transform | Preserves `html=False` security invariant. Simple string replacement. |
| **Base64 JSON in data attributes** | Escaped JSON, separate endpoint | Avoids quote-escaping bugs. Single-pass decode in React. Self-contained. |
| **JSON → pre-built React components** | MDX component mapping, eval() | LLM generates typed JSON; frontend renders known components. No eval(), no XSS. |
| **BKT with static parameters** | Adaptive parameter estimation (ABKT) | Simpler implementation for demo. Static defaults are well-studied in literature. |
| **Stub fallbacks for Gemini** | Hard dependency, mock service | Enables offline development, demo mode, and CI without API keys. |
| **Zustand over Redux** | Redux Toolkit, React Context | Minimal boilerplate, built-in persist middleware, role-aware storage. |
| **sessionStorage for student tokens** | Cookie with short expiry, in-memory | Cleared on tab close. COPPA-informed: child sessions should not persist. |
| **Two-pass seeding** | Topological sort, deferred FKs | Simpler than topological sort. `db.flush()` gets IDs without committing. |

---

## 13. Integration with Other Agents

The Lesson Designer operates within LUMO's multi-agent architecture, producing structured data consumed by three other agents:

### 13.1 Quiz Agent (Alshama)

**Interface**: `QuizContext` object returned with each rendered lesson:

```python
QuizContext(
    lesson_id=lesson.lesson_id,
    misconception_tags=lesson.misconception_tags,
    subject=lesson.subject,
    grade_level=lesson.grade_level,
    suggested_question_count=5
)
```

The Quiz Agent uses `misconception_tags` to generate questions with misconception-aligned distractors. For example, a lesson tagged `fraction-as-two-numbers` will produce distractors that reflect this specific misconception.

### 13.2 Feedback Agent (Bhavya)

**Interface**: `ActivityResult.misconceptionTag` from interactive activities.

When a student answers an activity incorrectly, the `misconception_tag` is passed to the Feedback Agent, which generates:
- Socratic hints targeting the specific misconception
- Motivational feedback calibrated to the student's affect
- Tone-guardrailed responses appropriate for Grade 3 students

### 13.3 Attention Agent (Nivedita)

**Interface**: `mastery_scores` table (future integration).

The Attention Agent monitors student engagement (time-on-task, response patterns, session behavior) and updates mastery scores that feed back into the Lesson Designer's generation strategies via the `GenerationContextBuilder`.

```
┌─────────────┐     misconception_tags      ┌─────────────┐
│   Lesson    │ ──────────────────────────→ │    Quiz     │
│  Designer   │                              │   Agent     │
│             │ ←────────────────────────── │             │
│             │     mastery_scores           │             │
└──────┬──────┘                              └─────────────┘
       │
       │ ActivityResult.misconceptionTag
       │
       ▼
┌─────────────┐                              ┌─────────────┐
│  Feedback   │                              │  Attention  │
│   Agent     │                              │   Agent     │
│             │ ←────────────────────────── │             │
└─────────────┘     engagement signals       └─────────────┘
```

---

## 14. Limitations & Future Work

### 14.1 Current Limitations

1. **No Real Event Data**: Analytics use deterministic mock values seeded from lesson UUIDs. Real event tracking requires integration with the Attention Agent.

2. **Demo Authentication**: Authentication is fully implemented but operates with a demo account (`demo@lumo.app` / `demo1234`). Production deployment would require email verification, password reset, and rate limiting.

3. **Static BKT Parameters**: The current BKT implementation uses fixed parameters (P(T)=0.30, P(G)=0.25, P(S)=0.10). Adaptive parameter estimation (ABKT) would improve accuracy.

4. **Gemini Dependency**: Real-time generation requires a Gemini API key. The stub fallback produces structurally valid but pedagogically generic content.

5. **No Frontend Component Tests**: Interactive activity components are tested via E2E only. Unit tests (Jest/Vitest) would provide faster feedback.

6. **Prerequisites Always Met**: The `prerequisites_met` flag is always `true` — mastery-based prerequisite enforcement requires integration with the Attention Agent's mastery data.

### 14.2 Future Work

1. **Adaptive BKT Parameter Estimation**: Implement expectation-maximization for per-student, per-knowledge-component parameter tuning.

2. **Real-Time Collaboration**: WebSocket-based co-authoring in the MDX Editor for instructor teams.

3. **Multi-Language Support**: i18n framework for content delivery in multiple languages, with reading level calibration per language.

4. **Content Version Diffing**: Visual diff tool for lesson revisions, showing changes between versions with accessibility impact analysis.

5. **A/B Testing Framework**: Randomized strategy assignment for controlled experiments measuring learning outcomes across generation strategies.

6. **Mastery-Gated Prerequisites**: Connect with Attention Agent mastery data to enforce prerequisite completion before lesson access.

---

## 15. Conclusion

The Lesson Designer Agent demonstrates that **pedagogically-grounded AI generation** can produce structured, accessible, interactive educational content at scale. By embedding learning-theoretic principles (ZPD, BKT, misconception targeting) directly into the generation pipeline, the system produces content that is not merely well-formatted, but is calibrated to individual learner states.

Key technical contributions include:

- **Strategy Pattern for generation**: Four pluggable strategies with a shared context builder, enabling comparative evaluation and runtime selection.
- **Sentinel-based rendering**: A novel approach to embedding interactive blocks in markdown while preserving `html=False` security.
- **Deterministic accessibility enforcement**: A 10-rule WCAG 2.1 AA checker that serves as a publish guardrail, ensuring every lesson meets accessibility standards.
- **10-type interactive activity system**: A type-safe, accessibility-compliant component library with unified result reporting.
- **Comprehensive evaluation framework**: 6 rubrics with offline batch evaluation, enabling data-driven strategy comparison.

The system comprises approximately 11,000 lines of production code, 98 passing unit tests, and 179 end-to-end test cases, forming a foundation for a multi-agent AI study coach that prioritizes pedagogical effectiveness, accessibility, and security.

---

## 16. References

1. Vygotsky, L. S. (1978). *Mind in Society: The Development of Higher Psychological Processes*. Harvard University Press.

2. Corbett, A. T., & Anderson, J. R. (1995). Knowledge tracing: Modeling the acquisition of procedural knowledge. *User Modeling and User-Adapted Interaction*, 4(4), 253–278.

3. Chi, M. T. H. (2008). Three types of conceptual change: Belief revision, mental model transformation, and categorical shift. In S. Vosniadou (Ed.), *International Handbook of Research on Conceptual Change* (pp. 61–82). Routledge.

4. Chaiklin, S. (2003). The zone of proximal development in Vygotsky's analysis of learning and instruction. In A. Kozulin et al. (Eds.), *Vygotsky's Educational Theory in Cultural Context* (pp. 39–64). Cambridge University Press.

5. Web Content Accessibility Guidelines (WCAG) 2.1. (2018). W3C Recommendation. https://www.w3.org/TR/WCAG21/

6. Baker, R. S. J. d., Corbett, A. T., & Aleven, V. (2008). More accurate student modeling through contextual estimation of slip and guess probabilities in Bayesian knowledge tracing. *Proceedings of ITS 2008* (pp. 406–415).

7. Kincaid, J. P., Fishburne, R. P., Rogers, R. L., & Chissom, B. S. (1975). Derivation of new readability formulas for Navy enlisted personnel. *Research Branch Report 8-75*, Naval Technical Training Command.

---

*This report documents work completed as part of the CMPE 295 Master's Project at San Jose State University. The LUMO system is a collaborative effort; this report covers only the Lesson Designer Agent component authored by Gautam Thampy.*
