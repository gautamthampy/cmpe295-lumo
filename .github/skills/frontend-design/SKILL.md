---
name: frontend-design
description: 'Create distinctive, production-grade frontend interfaces with high design quality. Use when building or redesigning web components, pages, landing pages, dashboards, app screens, or full applications in React, Next.js, HTML, CSS, Tailwind, or similar frontend stacks. Produces bold, polished, memorable UI code that avoids generic AI aesthetics and ships as real working implementation.'
argument-hint: 'Describe the frontend to build, the audience, constraints, and any visual or technical requirements.'
user-invocable: true
---

# Frontend Design

## What This Skill Does

Use this skill to design and implement frontend work that feels intentional, memorable, and production-ready instead of generic. It should produce real working code, not design theater.

The skill is for:
- New components, pages, flows, dashboards, editors, landing pages, and application shells
- Redesigning existing surfaces that need stronger visual direction
- Translating vague visual goals into a concrete aesthetic and implementation plan
- Raising design quality without breaking product constraints, accessibility, or maintainability

## Core Standard

Every output should satisfy all of the following:
- A clear aesthetic point of view, named and visible in the implementation
- Working production-grade code that matches the project's stack and conventions
- A memorable visual idea instead of a safe default layout
- Responsive behavior across mobile and desktop
- Accessible structure, contrast, focus states, and interaction behavior
- Cohesive typography, color, spacing, motion, and background treatment

## When To Use

Use this skill when the user asks to:
- Build or redesign a frontend component, page, screen, or application
- Make an interface feel more polished, premium, striking, editorial, playful, or distinctive
- Turn a rough product goal into a strong visual direction and working UI
- Improve a bland Tailwind, React, Next.js, or plain HTML/CSS interface

Do not use this skill for:
- Pure backend work
- Design-system documentation without implementation
- Tiny cosmetic tweaks where the user explicitly wants minimal change only

## Required Workflow

### 1. Read The Context Before Designing

Inspect the relevant files before making aesthetic decisions.

Extract:
- The product goal and the user task the interface must support
- The target audience and tone, if stated or implied
- The existing design system, component patterns, and technical stack
- Constraints around accessibility, responsiveness, motion, performance, and framework usage

If the request is ambiguous but still buildable, make explicit assumptions and proceed. Ask concise follow-up questions only when a missing detail would materially change the implementation.

### 2. Commit To One Bold Direction

Choose a single strong concept before writing code.

Define:
- Aesthetic direction: brutally minimal, editorial, retro-futuristic, natural, luxury, brutalist, playful, industrial, art deco, soft, or another precise direction that fits the problem
- One memorable signature element: a layout move, type treatment, motion sequence, texture, framing device, or interaction detail
- Typography pairing: a distinctive display face and a refined body face when the stack permits it
- Color logic: dominant tones, accents, contrast rules, and background atmosphere
- Spatial logic: symmetry vs asymmetry, density vs openness, overlap, rhythm, and grid discipline
- Motion logic: where animation matters and where restraint matters more

Do not hedge between several directions. Choose one and execute it cleanly.

### 3. Branch Based On Context

If working inside an existing product or design system:
- Preserve established patterns, tokens, and interaction models
- Add distinctiveness through composition, hierarchy, motion, and detail instead of fighting the system

If working on a new surface or greenfield page:
- Push the concept further and let the layout, type, and background do more work

If the surface is workflow-heavy or data-dense:
- Prioritize clarity, grouping, readability, and task completion
- Use expressive styling to support hierarchy, not to obscure it

If the request is a small component:
- Keep the concept visible at component scale
- Do not surround a simple element with unnecessary page chrome

### 4. Translate The Direction Into Implementation Decisions

Before coding, decide:
- Which tokens belong in CSS variables
- Which layout primitives should structure the page or component
- Which states must exist: hover, focus, active, disabled, empty, loading, error, success
- Which moments deserve animation and which should stay still
- How the design collapses or reflows on smaller screens

Prefer a few strong decisions over many average ones.

### 5. Build Real Working Code

Implement the interface in the project's actual stack and idioms.

Requirements:
- Keep the code production-grade and maintainable
- Use real semantic HTML and accessible controls
- Hook into actual app structure, state, routes, or data boundaries when relevant
- Reuse existing utilities and components when that strengthens consistency
- Add only the complexity needed to fulfill the concept well

For React and similar frameworks:
- Follow the repo's conventions before introducing new patterns
- Prefer modern framework patterns already used by the codebase
- Do not add incidental abstraction just to look sophisticated

### 6. Refine Past The First Working Version

Do a deliberate polish pass after the UI works.

Review:
- Spacing rhythm and alignment
- Type scale, line length, and contrast between headings and body text
- Background treatment, borders, shadows, overlays, or textures
- Hover and focus behavior
- Animation timing, staging, and restraint
- Mobile layout integrity and content wrapping

The first correct implementation is usually not the finished one.

## Aesthetic Rules

### Typography

- Avoid defaulting to Inter, Roboto, Arial, or generic system stacks unless the existing project already relies on them and changing them would be inconsistent
- Use typography intentionally; the font choice should support the concept, not simply fill space
- Pair expressive display typography with readable supporting text when possible

### Color And Theme

- Use CSS variables or the local token system for palette consistency
- Favor a dominant palette with sharp accents over evenly distributed safe colors
- Avoid the overused purple-gradient-on-white look unless the product explicitly calls for it

### Motion

- Prefer a few meaningful animations over constant motion everywhere
- Focus on high-impact moments such as page-load staging, section reveals, or satisfying hover transitions
- Keep motion purposeful, performant, and compatible with accessibility expectations

### Spatial Composition

- Use composition as a design tool: asymmetry, overlap, framing, cropping, density, or negative space
- Break the default template when the product can support it
- Do not ship cookie-cutter hero sections or interchangeable SaaS layouts unless the brief explicitly demands them

### Backgrounds And Surface Detail

- Create atmosphere with gradients, patterns, texture, layered transparency, shadow, grain, or structural framing when it fits the direction
- Avoid flat empty backgrounds unless minimal restraint is itself the concept

## Explicit Anti-Patterns

Avoid:
- Generic AI-looking layouts with predictable cards, centered hero blocks, and weak hierarchy
- Random visual effects that do not support the concept
- Decorative complexity without functional clarity
- Reusing the same aesthetic defaults across unrelated tasks
- Overspecifying a maximalist direction with underpowered implementation, or oversimplifying a refined direction into something bland

## Completion Checklist

Before finishing, verify:
- The design can be described in one sentence with a specific aesthetic identity
- There is at least one memorable visual or interaction idea
- The result works on both desktop and mobile
- Focus states, semantics, and contrast are acceptable
- The styling is cohesive across typography, spacing, color, and motion
- The implementation fits the existing codebase instead of feeling bolted on
- The UI does not look like a generic autogenerated mockup

## Response Pattern

When using this skill:
1. State the chosen design direction in one or two sentences.
2. Mention the key constraints you are honoring.
3. Implement the working code.
4. Verify the result where practical.
5. Summarize the signature design decisions and any assumptions.

## Example Invocations

- `/frontend-design Build a parent dashboard for a literacy app in Next.js with a warm editorial aesthetic and strong mobile support.`
- `/frontend-design Redesign this lesson card component to feel premium and playful without breaking the existing Tailwind system.`
- `/frontend-design Create a landing page for an AI study coach with a bold art-direction-first look, accessible forms, and responsive sections.`