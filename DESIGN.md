# LUMO Implementation Design Document

## Purpose

This document is the living implementation-facing design reference for the LUMO parent and student entry experience. The original visual brief remains in `stitch_remix_of_forgot_password_parent_portal/pathway_pro/DESIGN.md`, while the student-facing sign-in and playful library direction also pull from the stitch explorations under `stitch_remix_of_forgot_password_parent_portal/stitch/`. This file tracks what has actually been implemented, what states exist, and what backend dependencies each flow requires.

It also records the current validation surfaces that are wired in the repository today, including the real-stack auth smoke suite, the targeted mocked browser coverage that was updated for student code login, and the repo-local SSL bootstrap required in TLS-intercepted environments.

## Principles

- Preserve the supportive academic editorial look from the original brief.
- Use tonal surfaces instead of hard borders wherever possible.
- Keep auth pages transaction-focused and visually calm.
- Reflect backend constraints in the UI instead of hiding them.
- Update this document whenever a new route, component pattern, or backend-visible UX state is introduced.

## Implemented Routes

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Implemented redirect | Immediately redirects to `/sign-in` |
| `/sign-in` | Implemented | Mirrors supplied sign-in design |
| `/sign-up` | Implemented | Mirrors supplied sign-up design |
| `/forgot-password` | Implemented | Mirrors supplied forgot-password design |
| `/forgot-password/sent` | Implemented | Added completion state not present in source mocks |
| `/reset-password` | Implemented | Added token-based completion flow not present in source mocks |
| `/verify-email` | Implemented | Added verification gate screen for V1 |
| `/portal` | Implemented | Protected server-rendered placeholder that validates the session cookie, exposes sign-out, and links to `/students` |
| `/login` | Compatibility redirect | Legacy auth alias that redirects to `/sign-in` |
| `/register` | Compatibility redirect | Legacy auth alias that redirects to `/sign-up` |
| `/student-login` | Implemented | Student sign-in now uses a parent-email challenge plus a one-time 4-digit code |
| `/students` | Implemented | Protected parent dashboard for viewing existing student profiles and generating child-specific sign-in codes; the UI does not yet expose profile creation |
| `/learn` | Implemented | Client-guarded student landing route backed by the student token in Zustand while the playful library continues to expand |

## Shared UI Patterns

### Top bars

- Transactional auth pages use either a centered brand anchor or a slim top bar.
- Sign in uses a centered standalone brand presentation.
- Sign up, forgot password, reset password, and verify email use a fixed top bar.

### Surfaces

- Page background uses warm paper-like neutrals.
- Cards sit on `surface-container-lowest`.
- Inputs use recessed `surface-container-highest` backgrounds.
- Shadows remain diffuse and low-contrast.

### Typography

- Headings use Manrope.
- Body and labels use Plus Jakarta Sans.
- Headings are intentionally large, compact, and editorial.

### Buttons

- Primary CTAs use the blue gradient from `primary` to `primary-container`.
- Secondary navigation actions use textual links rather than outlined buttons.

### Student-facing playful surfaces

- The student sign-in screen uses the Tactile Playground direction rather than the calmer editorial auth layout.
- Student entry surfaces rely on warm yellow, sky blue, and soft paper-like neutrals instead of the stricter parent-portal palette.
- Parent portal features remain visually calmer even when they expose student-access actions.

## Current UX States

### Sign in

- Default
- Submitting
- Error banner from backend response

### Sign up

- Default
- Password mismatch validation
- Submitting
- Success redirect to verification prompt
- Error banner from backend response

### Forgot password request

- Default
- Submitting
- Success redirect to generic confirmation page
- Error banner from backend response

### Reset password

- Default
- Missing token
- Password mismatch validation
- Submitting
- Success state with sign-in return path
- Error banner from backend response

### Verify email

- Waiting for verification
- Token-driven email verification completion
- Resend verification action wired to backend

### Portal

- Protected server-rendered placeholder after successful sign-in
- Anonymous requests redirect to sign in with a preserved next path
- Invalid or revoked cookies are rejected by the server-rendered session check
- Verified parents can actively sign out from the route
- Route exposes a direct navigation path into the protected student-access dashboard

### Student sign in

- Default state with parent email request and 4-digit code entry on the same card
- Generic success response when requesting a code so parent account existence is not exposed
- Development mode currently surfaces the raw 4-digit code in the confirmation message so browser and local manual testing can proceed before real email delivery is wired
- Invalid or expired code error state
- Multi-student household branch that requires explicit learner selection after code verification
- Successful student token issuance and redirect to `/learn`

### Parent students dashboard

- Protected parent-only route backed by the same session cookie as `/portal`
- Student list display when linked profiles exist
- Empty state when no student profiles are present yet
- Per-student code generation action with transient code reveal in the portal and email dispatch contract to the parent address on file
- Cooldown / rate-limit error state when a code was generated too recently for the same student
- Student profile creation is supported by the backend but not yet surfaced in this route's UI

### Student learn landing

- Client-side guard returns anonymous or expired student sessions to `/student-login`
- Active student session renders a lightweight signed-in confirmation shell rather than the full library experience
- Student can sign out locally and return to the code-login entry route

## Backend Dependencies

### Required endpoints

- `POST /api/v1/auth/sign-up`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/sign-in`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/students`
- `POST /api/v1/auth/student-login/request-code`
- `POST /api/v1/auth/student-login/verify-code`
- `POST /api/v1/auth/student-login/select-student`
- `POST /api/v1/auth/students/{student_id}/login-code`

### Current backend assumptions

- Email verification is required before the application treats the parent as fully authenticated.
- Forgot-password requests must not reveal whether an email exists.
- Sessions are intended to use secure HttpOnly cookies.
- PostgreSQL is the source of truth for users, sessions, verification tokens, and reset tokens.
- Redis is intended for rate limiting and short-lived auth support.
- Development flows currently surface verification and reset tokens in API responses when debug token mode is enabled, so end-to-end auth can be tested before email delivery is wired.
- Student login codes are stored hashed server-side, expire after 10 minutes, and are single-use.
- A generic student login code requested by parent email proves family email access first; it does not silently choose the wrong child when multiple student profiles exist.
- Parent portal code generation is child-specific and can reveal the raw code only in the immediate authenticated response used by the dashboard UI.
- The backend already supports authenticated student profile creation for a signed-in parent, but the current frontend only consumes read and code-generation operations.

## Backend Scenario Coverage

The auth backend now needs to be exercised as a screen-driven matrix, not just endpoint-by-endpoint.

| Screen / Flow | Backend scenarios that must pass |
| --- | --- |
| Sign up | success, duplicate email, invalid email, short password |
| Verify email | success, invalid token, expired token, reused token, resend replaces older token |
| Sign in | success, invalid credentials, blocked unverified account, remember-me cookie issuance |
| Session bootstrap | anonymous session, valid session cookie, revoked session cookie |
| Logout | clears cookie, revokes current session, anonymous logout stays safe |
| Forgot password | existing email success, missing email generic success, token issuance in debug mode |
| Reset password | success, invalid token, expired token, reused token, old password invalid after reset, previous sessions revoked |
| Student profile creation | authenticated parent success, unauthenticated rejection, normalized persisted student fields |
| Student login code request | existing verified family success, missing email generic success, cooldown protection |
| Student login code verify | success for single-student household, invalid code, expired code, reused code |
| Student login child selection | multi-student household requires explicit student selection after code verification |
| Parent code generation | authenticated parent success, unauthenticated rejection, wrong-student rejection, cooldown protection |

The backend test suite should continue to mirror this table as screens and flows expand.

## Database Scenario Coverage

Auth persistence needs direct database coverage in addition to API coverage.

| Database concern | Required scenarios |
| --- | --- |
| Parent user persistence | create and commit, rollback before commit, update and persist |
| Verification token lifecycle | save token, replace previous active token, mark used |
| Reset token lifecycle | save token, replace previous active token, mark used |
| Session lifecycle | create session, persist remember-me flag and expiry, revoke session |
| Deletion behavior | deleting a parent cascades to sessions and tokens |
| Student profile persistence | create and fetch linked students under a parent account |
| Student login code lifecycle | create hashed code, replace older active code in the same scope, mark used, expire and reject reuse |

These database tests should remain runnable without Docker, using the isolated SQLite harness, while still reflecting the intended PostgreSQL semantics closely enough to catch persistence regressions.

## Frontend Integration Coverage

The auth UI should be verified against backend-like outcomes, not only static rendering.

| Screen / UI | Required frontend reactions |
| --- | --- |
| Sign in | invalid-credentials banner, verification-required redirect, successful redirect to next path, remember-me submission preserved |
| Sign up | client-side password mismatch, duplicate-email banner, successful redirect with verification token query |
| Forgot password | successful redirect to confirmation screen with email/token query, backend failure banner |
| Reset password | missing-token banner, mismatch validation, invalid-token banner, success message and redirect |
| Verify email | token-driven verification success, token-driven verification failure, resend-verification success message |
| Student sign in | request-code generic success, invalid-code banner, multi-student selection state, successful redirect to `/learn` |
| Parent students dashboard | protected render, student cards, generate-code success state, transient code reveal, generate-code cooldown error, empty state when no students exist |
| Student learn landing | client-side student-session guard, signed-in confirmation content, local sign-out back to `/student-login` |

Frontend integration tests should continue to mirror these UI reactions as the auth flows expand.

## End-to-End Coverage

The auth slice now has a dedicated browser smoke suite that runs the real frontend and backend together.

| End-to-end path | Required outcome |
| --- | --- |
| Anonymous `/portal` visit | Redirects to sign in with `next=/portal` |
| Verified sign-in | Backend cookie is issued, frontend lands on `/portal`, portal renders verified identity |
| Sign out | Backend session is revoked, cookie is cleared, protected route redirects again |
| Forgot password to reset password | Debug reset link is surfaced through the UI, password rotates, old password fails, new password succeeds |
| Parent generates student code | Protected `/students` route renders, a child-specific code is issued, and the code can be exchanged for a student session |
| Student signs in with code | Parent-email request succeeds, 4-digit code verifies, and the student lands on `/learn` |

This suite is intentionally separate from the older broad `frontend/e2e/` directory so the current auth implementation can be validated in CI without inheriting unrelated legacy scenarios.

The repository also contains a mocked browser layer under `frontend/e2e/`.

- The student-code flows in `frontend/e2e/auth.spec.ts` have been updated to match the new parent-email plus 4-digit code design.
- The mocked suite still auto-starts only the frontend on port `3000` and expects intercepted API responses rather than a live backend.
- Some broader legacy mocked auth coverage still references older route and endpoint shapes, so the current source of truth for fully integrated auth behavior remains the real-stack smoke suite under `frontend/e2e-auth/`.

Operational constraints for this suite:

- It runs on isolated ports `3100` for the frontend and `8100` for the backend so it does not attach to already-running local dev servers.
- It prefers a locally installed Chrome or Edge binary when available, which avoids Playwright browser-download failures in corporate TLS-intercepted environments.
- It uses a dedicated SQLite file for the smoke backend so auth flows can run end to end without Docker.
- In certificate-managed environments, `scripts/use-repo-certs.ps1` should be loaded before browser runs so Node, npm, and backend HTTP clients share the repo-local CA bundle under `certs/`.

## Validation Pipeline

The current auth slice is expected to stay green across the validation layers that are presently wired in the repo:

| Layer | Current command | Purpose |
| --- | --- | --- |
| Frontend type safety | `npm run typecheck` | Ensures route and component changes remain type-safe |
| Frontend integration | `npm run test` | Verifies form-level UI reactions against backend-like outcomes |
| Frontend production build | `npm run build` | Ensures the current app tree compiles for production |
| Backend API and database | `uv run pytest` | Verifies auth API and persistence behavior |
| Browser smoke | `npm run test:e2e:auth` | Verifies the live frontend/backend auth flow with real cookies and redirects |
| Targeted mocked student browser regression | `npx playwright test -c playwright.config.ts e2e/auth.spec.ts --grep "Student Code Login"` | Verifies the updated student code-login UI against intercepted responses without starting the real backend |

GitHub Actions currently mirrors the first five rows above through `.github/workflows/ci.yml`; the targeted mocked student browser regression is useful locally but is not yet wired into CI as a separate job.

## Components Inventory

| Component | Purpose |
| --- | --- |
| `AuthTopBar` | Slim transactional header |
| `CenteredBrand` | Centered brand anchor for sign-in |
| `AuthCard` | Shared card shell |
| `FormField` | Shared labeled input with icon, helper text, and error state |
| `PrimaryButton` | Gradient CTA with loading state |
| `AuthFooterNote` | Supportive bottom copy |
| `StatusPanel` | Success and guidance message panel |
| `PortalLogoutButton` | Parent-portal sign-out control backed by the backend logout endpoint |
| `StudentCodeLogin` | Student-facing parent-email request, code entry, and child-selection flow |
| `ParentStudentCodeButton` | Parent dashboard action for generating and briefly revealing child-specific student login codes |

## Pending Work

- Add the remaining playful subject and topic library screens after the student auth entry path.
- Replace the current placeholder student landing content on `/learn` with the full library experience.
- Connect the `/students` UI to the existing authenticated `POST /api/v1/auth/students` backend path so parents can create learner profiles without leaving the dashboard.
- Add explicit email delivery infrastructure beyond debug-token mode and document the provider contract here.
- Add accessibility verification for the new student code-entry and parent code-reveal flows.
- Continue reconciling older mocked browser scenarios in `frontend/e2e/` with the current route and endpoint contracts beyond the already-updated student-code paths.
