```markdown
# Design System Strategy: The Supportive Academic Editorial

## 1. Overview & Creative North Star
Most Learning Management Systems feel like cold, utilitarian spreadsheets. This design system rejects the "admin dashboard" trope in favor of **The Supportive Academic Editorial**. 

Our Creative North Star is a high-end, digital concierge experience for parents. It combines the warmth of premium stationery with the precision of a modern newsroom. We break the "template" look by using intentional white space (utilizing our 16 and 24 spacing tokens) and a sophisticated layering strategy that relies on tonal depth rather than rigid lines. This is not just a portal; it is a reliable, calm environment that empowers parents through clarity and prestige.

---

## 2. Colors & Surface Architecture
The palette is rooted in a "New Academic" aesthetic: deep, trustworthy blues (`primary`), growth-oriented greens (`secondary`), and a foundation of warm, paper-like neutrals (`surface`).

### The "No-Line" Rule
To achieve a premium editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through background color shifts.
*   **Example:** A `surface-container-low` section should sit directly on a `surface` background. The shift in tone provides the boundary, creating a softer, more sophisticated transition.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to define importance:
*   **Base Layer:** `surface` (#fdf9f1) for the main viewport.
*   **Section Layer:** `surface-container-low` (#f7f3ec) for large content areas.
*   **Content Cards:** `surface-container-lowest` (#ffffff) to make critical information "pop" with a clean, crisp finish.
*   **Interactive Overlays:** Use `surface-bright` for elements that need to feel illuminated.

### The "Glass & Gradient" Rule
For floating navigation or high-level alerts, use semi-transparent `surface` colors with a `backdrop-blur` effect. To add "soul," use subtle linear gradients on primary CTAs:
*   **Primary Action:** Transition from `primary` (#19498e) to `primary_container` (#3761a8) at a 135-degree angle. This removes the "flatness" of standard UI.

---

## 3. Typography: The Curated Voice
We utilize a dual-font pairing to balance authority with approachability.

*   **Display & Headlines (Manrope):** This is our "Editorial" voice. Use `display-lg` and `headline-md` with generous tracking to anchor pages. It feels modern, structural, and confident.
*   **Body & Labels (Plus Jakarta Sans):** This is our "Functional" voice. Its slightly wider apertures ensure high legibility for parent-teacher communications and grade reports. 
*   **Hierarchy Note:** Always maintain a high contrast between `headline-sm` (Manrope) and `body-md` (Plus Jakarta Sans). This distinct change in typeface personality signals a clear transition from "reading a title" to "absorbing information."

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often messy. We convey depth through **Ambient Light** and **Tonal Stacking**.

*   **The Layering Principle:** Place a `surface-container-lowest` card (Pure White) onto a `surface-container-high` background. The contrast in lightness creates a natural lift without a single pixel of shadow.
*   **Ambient Shadows:** If a card must "float" (e.g., a modal), use a diffused shadow: `blur: 24px`, `opacity: 6%`, using the `on-surface` color (#1c1c17) as the tint.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use the `outline-variant` token at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Apply to top-level navigation bars using a 70% opacity `surface` fill and a `20px backdrop-blur`. This allows student profile colors to subtly bleed through as the parent scrolls.

---

## 5. Components

### Buttons
*   **Primary:** Gradient (`primary` to `primary_container`), `md` (0.75rem) roundedness, `on_primary` text.
*   **Secondary:** `secondary_container` background with `on_secondary_container` text. No border.
*   **Tertiary:** Ghost style. No background; `primary` text. Use for low-priority actions like "Cancel."

### Input Fields
*   **Structure:** Use `surface_container_highest` for the input background to create a "recessed" feel. 
*   **Labels:** Always use `label-md` in `on_surface_variant`. 
*   **Micro-copy:** Use `body-sm` in `tertiary` (#56482e) to provide a warm, supportive hint.

### Cards & Lists
*   **The Divider Ban:** Strictly forbid 1px horizontal dividers. To separate students or assignments, use a spacing of `spacing.4` (1.4rem) or alternate the background between `surface_container_low` and `surface_container_high`.
*   **Student Progress Cards:** Use a `secondary_fixed` (#baf0b6) background for "passing" states to evoke a sense of calm achievement.

### Progress Trackers
*   Avoid the "loading bar" look. Use thick, `xl` (1.5rem) rounded tracks in `surface_variant` with a `primary` fill to make the progress feel substantial and tactile.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `spacing.8` (2.75rem) for page margins to give the content "breathing room" typical of high-end magazines.
*   **Do** use `tertiary` colors for instructional "asides"—this warm brown feels more human than a neutral grey.
*   **Do** leverage `surface_dim` for "read" states in a notification center to provide clear visual feedback without using icons.

### Don't
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#1c1c17) to maintain the "soft academic" warmth.
*   **Don't** use `none` roundedness. Even the most formal elements should have at least `sm` (0.25rem) corners to remain approachable.
*   **Don't** use high-contrast borders for form fields. Let the background tone change handle the focus state (shift from `surface_container_highest` to `primary_fixed`).

---

## 7. Signature Element: The "Student Focus" Header
When a parent selects a specific child's profile, the `surface_variant` should subtly shift to a tinted version of that child's assigned color (using `primary_fixed` or `secondary_fixed`). This creates a "bounded context" that makes the portal feel personalized and intentional.```