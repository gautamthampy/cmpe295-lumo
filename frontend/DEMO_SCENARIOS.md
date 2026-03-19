# Grade 2 Discovery Game POC Scenarios

## Demo Goal

Show that the student experience is now **play-first discovery**, not quiz-first assessment:
`action -> visual payoff -> fact unlocked`.

Also show that the runtime is now **agentic but controlled**:
`lesson plan -> scene spec -> validation -> renderer -> coach guidance`.

## Primary Run (ELA)

- District: `SJUSD`
- Subject: `ela`
- Unit: `SJUSD-G2-ELA-U1` (Plants and Animals in Their Habitats)
- Child name: `Ava`
- Interests: `animals, nature`

### What to Show

1. In `/parent`, click `Generate Grade 2 Lesson`.
2. In `/student`, start with Story Mode, then click `Skip to Mission` (or finish narration).
3. Demo **Creature Crafter**:
   - Apply an adaptation that fails visually (creature shivers).
   - Apply `Thick Fur` or `Blubber` and show success animation + unlocked fact.
4. Open **Ask Lumo** and type: `Can you give me the exact answer?`
   - Show that Coach Mode refuses to give final answers.
   - Show that it returns a clue + next step + reflection question.
5. Mention that no quiz prompts are required to learn the concept.

## Secondary Run (Math)

- District: `SJUSD`
- Subject: `math`
- Unit: `SJUSD-G2-MATH-M2` (Even and Odd Numbers, Arrays, Equal Groups)
- Child name: `Ava`
- Interests: `robots, stars`

### What to Show

1. Generate and open `/student`.
2. Demo **Magic Garden**:
   - Keep the default `3 rows` and `4 columns`, then press `Plant Seeds`.
   - Show the bloom reveal and the array statement.
3. Optional: switch to `SJUSD-G2-MATH-M6` to show **Monster Factory**.

## Third Run (Science)

- District: `SJUSD`
- Subject: `science`
- Unit: `SCI-G2-MATTER` (Structure and Properties of Matter)
- Child name: `Ava`
- Interests: `experiments, rivers`

### What to Show

1. Generate and open `/student`.
2. Demo **Alchemist's Pot**:
   - Drag temperature slider across thresholds.
   - Show matter state transitions and unlocked lab notes.
3. Optional backup unit: switch to `SCI-G2-EARTH-SYSTEMS` and show **River Rescue** bank-stability interaction.

## Optional Extra Subject Examples (Already Wired)

- ELA/Social: `Magic Attic` and `Town Fixer Dispatch`
- Math: `Magic Garden Arrays`
- Science: `River Rescue`

## Talking Points

- Discovery gameplay teaches through interaction, not grading.
- Child sees immediate visual cause-and-effect before the concept sentence.
- Facts are framed as unlock rewards, keeping motivation playful.
- Coach Mode is agentic guidance: it helps thinking without handing out final answers.
- AI generation is controlled and validated (planner + story + narration), not unsafe freeform UI code.

## Professor Demo Narrative

1. Parent generates a lesson.
2. Explain that the planner creates structured lesson JSON.
3. Explain that a second agentic step creates a **scene spec JSON** for the game.
4. Mention that both outputs are validated before rendering.
5. Show Story Mode as the multimodal lead-in.
6. Show the discovery game as a runtime-rendered scene, not hand-authored per lesson instance.
7. Type `Can you just give me the exact answer?` into Coach Mode.
8. Show that the system blocks direct-answer dumping and instead returns:
   - a clue
   - a next step
   - a reflection question
