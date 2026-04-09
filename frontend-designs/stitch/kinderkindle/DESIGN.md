# Design System Strategy: The Tactile Playground

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Montessori"**

This design system moves away from the flat, sterile "ed-tech" templates of the past. Instead, it draws inspiration from physical learning environments—sandboxes, building blocks, and layered paper craft. By using intentional asymmetry, organic depth, and a "vibrant-yet-soft" palette, we create an interface that feels like a tangible toy rather than a computer program. 

The system rejects rigid grids in favor of **Dynamic Composition**. We use overlapping containers and varying border radii to mimic the way a child might spread out art supplies on a large table. This design system is built to be "poked, prodded, and played with," ensuring that the UI itself is an invitation to learn.

---

## 2. Colors: Tonal Depth over Linework
Our palette is curated to be high-energy but low-stress. We use Material-inspired tonal ranges to ensure that even with a "vibrant" look, the interface remains accessible and sophisticated.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders to define sections. 
*   **The How:** Separation must be achieved through background shifts. Place a `surface_container_low` (#fbf5c1) card on a `surface` (#fffadf) background. For high-priority interactive zones, use a `primary_container` (#ffdeac) to create a clear visual "island" without a single black line in sight.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested trays. 
*   **Base:** `surface` (#fffadf)
*   **Secondary Content:** `surface_container` (#f6f0bb)
*   **Floating Interactive Elements:** `surface_container_lowest` (#ffffff)
This nesting creates a "3D Paper" effect, making the app feel deep and explorable.

### The "Glass & Gradient" Rule
To elevate the "playful" vibe to a "premium" experience, use Glassmorphism for overlays (e.g., Modals, Pause Screens). Use `surface_bright` at 80% opacity with a `20px backdrop-blur`. 
*   **Signature Textures:** For Hero CTAs, use a subtle linear gradient from `primary` (#7e5700) to `primary_fixed_dim` (#ffba38) at a 135° angle. This adds a "sunny glow" that flat color cannot replicate.

---

## 3. Typography: The Friendly Voice
We utilize a duo-font system to balance whimsy with extreme legibility.

*   **Display & Headlines (Plus Jakarta Sans):** This is our "Brand Voice." Its wide apertures and geometric curves feel modern and approachable. Use `display-lg` (3.5rem) for celebratory moments (e.g., "Level Up!") to create a sense of scale and excitement.
*   **Titles & Body (Be Vietnam Pro):** This is our "Learning Voice." It is incredibly legible for early readers. The `title-lg` (1.375rem) should be used for lesson headers, providing a clear anchor for the eye.
*   **The Tonal Scale:** Maintain high contrast. Use `on_surface_variant` (#52452a) for body text rather than pure black to keep the vibe "soft" and less clinical.

---

## 4. Elevation & Depth: Tonal Layering
In this system, "Up" is defined by color and blur, not by shadows alone.

*   **The Layering Principle:** Stack `surface_container_highest` (#eae4b1) on top of `surface_dim` (#e1dca9) to create a natural "lift." This mimics the way cardstock layers look under a soft classroom light.
*   **Ambient Shadows:** For elements that must float (like a "Back to Top" button), use a shadow color of `primary` (#7e5700) at 6% opacity with a 32px blur and 8px Y-offset. It should feel like a soft glow, not a dark drop-shadow.
*   **The "Ghost Border" Fallback:** If a divider is mandatory for accessibility, use the `outline_variant` (#d8c4a0) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Tactile & Friendly

### Buttons (The "Juicy" Interaction)
*   **Primary:** Large radius (`xl`: 3rem). Background: `primary` (#7e5700). Text: `on_primary` (#ffffff).
*   **Secondary:** Background: `secondary_container` (#cae6ff). Text: `on_secondary_container` (#004b70).
*   **Interaction:** On hover/press, scale the button by 5% (1.05x). Avoid color shifts; use physical scaling to mimic a squishy button.

### Cards & Learning Modules
*   **Design:** Forbid all dividers. Use `spacing.8` (2.75rem) to separate content blocks. 
*   **Asymmetry:** Occasionally use a `DEFAULT` (1rem) radius on one corner and `xl` (3rem) on the others to give a "hand-cut" organic feel to module cards.

### Input Fields
*   **Style:** Use `surface_container_high` (#f0eab6) as the fill. 
*   **Focus:** Instead of a high-contrast border, use a 4px "glow" of `secondary_fixed` (#cae6ff) when the child taps the field.

### Progress Bubbles (Custom Component)
Instead of a standard progress bar, use a series of `tertiary` (#006e1c) rounded chips that "pop" into place with a spring animation as the student completes tasks.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Intentional Asymmetry:** Align text to the left but float an illustration slightly "off-grid" to the right.
*   **Embrace Whitespace:** Use `spacing.16` (5.5rem) for page margins to prevent the "cluttered classroom" feel.
*   **Layer Surfaces:** Use `surface_container_lowest` (#ffffff) for the most important interactive elements to make them "pop" against the `surface` background.

### Don't:
*   **Don't Use Sharp Corners:** Never use `none` or `sm` radius. Everything should be "bonk-proof"—safe and rounded.
*   **Don't Use 1px Dividers:** If you feel the need for a line, use a background color change or an extra `spacing.6` gap instead.
*   **Don't Use Pure Grey:** Our neutrals are tinted with warmth (`surface_dim`). Pure greys will make the app look "industrial" and kill the cheerful vibe.