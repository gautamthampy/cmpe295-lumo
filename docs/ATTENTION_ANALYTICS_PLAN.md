## Attention & Analytics Agent – Implementation Plan

This document breaks the Attention & Analytics Agent work (from the design spec and `docs/`) into small, reviewable commits, grouped by phases up through Phase 5.

Each bullet under a phase is intended to be one focused commit (or at most a very small pair of commits) so that code review stays easy for your teammates.

---

## Phase 1.5 – Finish Core Attention & Event Ingest

**Goal:** Solidify the behavioral attention core and event ingest so later analytics (peaks, dashboards) have clean data.

- **Commit 1 – Add time bucketing to attention metrics**
  - Extend the `AttentionMetric` model and DB schema to include `hour_of_day` and `day_of_week` fields, aligned with the spec.
  - Populate these columns when inserting new rows (derived from `recorded_at` or the event timestamp).
  - Add/update unit tests to confirm correct hour/day derivation.

- **Commit 2 – Align analytics event ingest with event schema**
  - Extend `POST /api/v1/analytics/events` to accept multiple event types beyond `question_answered` (e.g., `lesson_started`, `lesson_completed`, `quiz_started`, `quiz_completed`, `hint_requested`), at least at the validation level.
  - Ensure the payload structure is consistent with `docs/event_schema.json` (types and required fields).
  - Add tests that post the new event types and confirm they are accepted and/or ignored gracefully by the attention engine when they are not relevant.

- **Commit 3 – Persist raw events to events.user_events**
  - Add or wire a persistence layer to store every ingested analytics event into the `events.user_events` table with JSON `event_data`, using the event schema.
  - Keep attention-specific logic (rolling features, drift) separate but driven by these same requests.
  - Add tests to verify rows are written to `events.user_events` for representative event types.

- **Commit 4 – Add “current attention” endpoint**
  - Implement `GET /analytics/attention/current?user_id=&session_id=` (or the closest API shape) that returns the latest `attention_score`, `drift`, and `rationale` for the active session.
  - Reuse `attention_engine` and Redis state rather than recomputing from scratch.
  - Add tests to verify correct behavior for:
    - Active sessions with recent events.
    - Sessions with no/insufficient data (fallback behavior).

---

## Phase 2 – Peak Windows & Dashboard Aggregates

**Goal:** Turn raw attention metrics into higher-level insights: peak focus windows and trend/dashboards.

- **Commit 5 – DB support for peak windows**
  - Create SQL view(s) or helper queries for `attention_peaks_daily` (user_id, day_of_week, hour_of_day, avg_score, samples), matching the design spec.
  - Ensure they depend on the new `hour_of_day` and `day_of_week` columns.
  - Add unit/integration tests that insert synthetic metrics and verify computed peaks.

- **Commit 6 – Implement /analytics/attention/peaks API**
  - Add `GET /analytics/attention/peaks?user_id=...` endpoint that returns the top-K peak windows as specified (day-of-week, hour-of-day, score, updated_at).
  - Hook this endpoint up to the DB queries/views from Commit 5.
  - Add tests for:
    - Basic “some peaks exist” case.
    - Edge cases with insufficient data (no peaks or empty list).

- **Commit 7 – Implement /analytics/attention/summary API**
  - Implement `GET /analytics/attention/summary?user_id=...&range=...` to return:
    - Daily average attention scores over the requested range.
    - Optional drift count, basic aggregates needed for dashboards.
  - Align the response with the `AttentionSummary`-style schema in `docs/api_contracts.yaml` as much as practical.
  - Add tests that create metrics over several days and verify the summary.

- **Commit 8 – Implement /analytics/dashboard/{user_id} API**
  - Implement `GET /analytics/dashboard/{user_id}` to return `DashboardData` as defined in `api_contracts.yaml`, including:
    - Attention information (`attention_summary`).
    - Basic mastery and usage counts pulled from existing tables.
  - Add tests to verify structure and core fields in the response.

- **Commit 9 – Wire minimal dashboard UI (optional / small)**
  - Add or extend frontend dashboard components to:
    - Display a simple attention trend chart.
    - Show a basic “focus heatmap” (hour vs weekday) using the peaks API.
  - Keep this commit small by focusing on data fetching and very simple visualizations.

---

## Phase 3 – Mini-Test, Self-Report, and Gaze Integration

**Goal:** Complement behavioral telemetry with dedicated mini-tests, self-report check-ins, and optional presence/gaze signals while preserving privacy.

- **Commit 10 – Define mini-test events and backend schema**
  - Extend the event schema and/or add Pydantic models for:
    - `attention_mini_test_started`
    - `attention_mini_test_completed` (with score and result details).
  - Add DB storage (either in `user_events` or a small dedicated table) for mini-test results.
  - Add tests to validate and persist these events.

- **Commit 11 – Implement mini-test attention scoring logic**
  - Define how mini-test results are turned into a 0–1 `attention_score` and recommended action (`continue|recap|break`).
  - Optionally combine this with the behavioral score (e.g., as a short-lived override or calibration).
  - Add unit tests for the scoring function.

- **Commit 12 – Frontend mini-test UI**
  - Implement a simple, fun mini-test UI:
    - Triggered at session start or when drift is detected.
    - Sends mini-test start/completed events to the backend.
  - Keep UI minimal in this commit; focus on correct wiring.

- **Commit 13 – Self-report check-ins (backend)**
  - Add API and models for storing self-reported attention states (e.g., emojis/slider response with timestamp and session).
  - Wire to analytics so these values are available for later calibration/analysis.
  - Add tests for validation and storage.

- **Commit 14 – Self-report prompts (frontend)**
  - Add opt-in UI prompts after certain activities:
    - “Did you feel focused?” etc., with simple emoji/slider responses.
  - Call the self-report API and show simple confirmation/feedback to the learner.

- **Commit 15 – Optional gaze/presence integration**
  - Formalize how the existing presence/camera check reports a derived metric (e.g., `gaze_attention_likelihood`) to the backend in `/analytics/events` (telemetry only, no raw video).
  - Ensure strong adherence to `docs/PRIVACY_GUARDRAILS.md` (local-only processing, opt-in, no persistence of raw A/V).
  - Add tests (and maybe a feature flag) so this path can be disabled in environments where camera is not available or desired.

---

## Phase 4 – Planner/Feedback Integration & Event Loop

**Goal:** Close the loop between Attention, Planner, Feedback, and the UI using events and APIs.

- **Commit 16 – Emit attention_drift_detected and related events**
  - When drift is detected, emit an `attention_drift_detected` event that conforms to `docs/event_schema.json`.
  - Optionally log these both to `events.user_events` and any existing attention-related tables.
  - Add tests to confirm events are written with correct fields.

- **Commit 17 – Integrate with Feedback/Planner APIs**
  - On drift, have the backend:
    - Notify FeedbackAPI (or Planner) that a recap/break is recommended, using existing or small new endpoints.
  - Ensure this wiring is simple and clearly scoped so reviewers can see the integration point.

- **Commit 18 – Break/recap suggestion events**
  - When the UI surfaces a break/recap suggestion, log:
    - `break_suggested` event with reason and suggested duration.
    - `break_accepted` / `break_declined` or equivalent.
  - Add tests around these events and verify that they are consistent with the event schema.

- **Commit 19 – Use attention signals in Planner (minimal)**
  - Implement a minimal hook in Planner (or similar service) that:
    - Reads peak windows and recent attention history.
    - Uses them to make at least one small, visible scheduling decision (e.g., scheduling a “hard quiz” in a peak window).
  - Keep this commit small by focusing on one planner decision path and associated tests.

---

## Phase 5 – Privacy, Metrics, and Ops Hardening

**Goal:** Ensure the Attention & Analytics agent is privacy-respecting, observable, and robust under load, aligned with `PRIVACY_GUARDRAILS.md` and the design spec’s NFRs.

- **Commit 20 – Wire anonymization/retention jobs**
  - Connect the existing anonymization function (for `events.user_events`) into a scheduled job (cron, pg_cron, or a simple background task).
  - Respect user-level retention configuration where possible (`data_retention_days` on `learner.users`).
  - Add tests or scripts that simulate events older than 90 days and verify anonymization.

- **Commit 21 – Privacy/PII audit and logging cleanup**
  - Review attention/analytics logs and responses to ensure no PII is emitted (per `PRIVACY_GUARDRAILS.md`).
  - Introduce logging helpers or filters that scrub identifiers where not strictly needed.
  - Add a short section to docs describing what is logged and why.

- **Commit 22 – Metrics and alerts**
  - Export counters and histograms for:
    - `analytics_events_total{event_type}`
    - `attention_scores_total{bucket}`
    - `attention_drifts_total`
    - Latency histograms for scoring and drift evaluation.
  - Add basic alert rules (Prometheus-style or equivalent), including the `DriftSpike` example from the spec.

- **Commit 23 – Load and resilience tests**
  - Add a basic Locust (or similar) load test scenario:
    - Many concurrent sessions sending events.
    - Check p95 latency for scoring and drift paths.
  - Add documentation on how to run these tests locally.

- **Commit 24 – Documentation and demo polish**
  - Update `readMeAA.md`, `backend/README.md`, and `docs/` to:
    - Reflect all implemented APIs and flows (events, peaks, dashboards, planner integration).
    - Include updated demo scripts for classroom/teammate demos.
  - Ensure the doc you are reading stays accurate by marking which commits/phases are complete.

---

This plan is intentionally broken into small, reviewable units.  
We can adjust commit boundaries as we go (e.g., split a commit in two if it grows too large), but this serves as the default roadmap for the Attention & Analytics agent through Phase 5.

