# Agentic Lesson POC Workflow

## Executive Summary

This POC uses a **controlled agentic pipeline**:

1. AI plans the lesson
2. AI generates a **scene spec** for the discovery game
3. The app validates every structured output
4. Trusted renderers turn specs into child-safe UI
5. AI helps with coaching, but does **not** give final answers

This is closer to an **A2UI-style architecture** than raw prompt-to-UI generation, but it remains deterministic and demo-safe.

## Workflow Diagram

```mermaid
flowchart TD
    A[Parent chooses district, unit, child interests] --> B[Lesson Planner LLM]
    B --> C[Lesson Spec JSON]
    C --> D[Lesson Validator]

    D --> E[Agentic Scene Spec LLM]
    E --> F[Scene Spec JSON]
    F --> G[Scene Spec Validator]

    D --> H[Story Planner LLM]
    H --> I[Story Plan JSON]
    I --> J[Scene Image Generation]
    I --> K[Transcript Builder]
    K --> L[On-Demand TTS]

    G --> M[Deterministic Scene Renderer]
    J --> N[Story Theater Renderer]
    L --> N

    N --> O[Student Story Experience]
    M --> P[Student Discovery Game]
    O --> P

    P --> Q[Ask Lumo Coach]
    Q --> R[Learning Coach LLM]
    R --> S[Hint, Next Step, Reflection Question]
    S --> P

    R --> T[Direct Answer Guardrail]
    T --> U[No final answer dumping]

    V[File Cache + In-Flight Dedup] --> B
    V --> E
    V --> J
    V --> L
    V --> R
```

## Why This Matters

- The **lesson planner** decides what should be taught.
- The **scene-spec generator** decides how the discovery game should be structured.
- The **renderer does not trust raw model output blindly**. It only renders validated structured specs.
- The **coach agent** supports thinking, not answer copying.
- The **cache layer** reduces cost and makes demos repeatable.

## Value Proposition For A Technical Audience

- More innovative than fixed educational content because the experience is dynamically composed.
- Safer than fully freeform prompt-to-UI generation because the runtime only accepts validated schemas.
- More pedagogically defensible than answer-generation tools because the coach is constrained to Socratic guidance.
- More practical than full Unity/Godot pipelines for a short POC because it preserves web delivery speed and iteration velocity.

## Honest Positioning

- This is **not** literally Google A2UI.
- It **is** an A2UI-like pattern:
  - model produces structured UI/game intent
  - schema validates that intent
  - runtime renderer instantiates the experience

## Demo Talking Line

“Instead of asking the model to directly write arbitrary UI code, we let the model produce structured educational scene specifications, validate them, and then render them through trusted components. That gives us adaptive, agentic behavior without losing safety or control.”
