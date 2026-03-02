# LUMO Frontend

Next.js/TypeScript web app for lesson, quiz, feedback interfaces, and dashboards.

## Quick Start

```bash
# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:3000

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Content**: MDX for lessons
- **State Management**: Zustand (planned)
- **API Client**: Axios

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── globals.css         # Global styles
│   ├── lessons/            # Lesson pages (TBD Phase 2)
│   ├── quizzes/            # Quiz pages (TBD Phase 2)
│   └── dashboard/          # Dashboard pages (TBD Phase 2)
├── components/             # Reusable components (TBD Phase 2)
│   ├── lessons/           # Lesson components
│   ├── quizzes/           # Quiz components
│   ├── feedback/          # Feedback components
│   └── dashboard/         # Dashboard components
├── lib/
│   └── api.ts             # API client
├── public/                # Static assets
├── styles/                # Additional styles (if needed)
└── types/                 # TypeScript type definitions (TBD)
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Lint
```bash
npm run lint
```

### Format
```bash
npm run format  # (if configured)
```

## Phase 2 Implementation

### Team Responsibilities

**Gautam - Lesson Design**
- Create lesson renderer component with MDX support
- Implement accessibility checks (WCAG compliance)
- Design lesson navigation and progress tracking
- Create interactive examples and story components

**Bhavya - Feedback Interface**
- Build hint request interface
- Create motivational message displays
- Implement re-quiz trigger UI (behind feature flag)
- Design error feedback visualizations

**Alshama - Quiz Interface**
- Create quiz question components
- Implement answer selection UI
- Show distractor feedback
- Design quiz results and scoring display

**Nivedita - Dashboard**
- Build parent/teacher dashboard views
- Visualize mastery scores and progress
- Show attention metrics and peak times
- Display strengths/weaknesses analysis

## Components to Build (Phase 2)

### Lesson Components
- `LessonViewer`: MDX content renderer
- `LessonProgress`: Progress indicator
- `LessonNavigation`: Next/previous controls
- `AccessibilityControls`: Font size, contrast, etc.

### Quiz Components
- `QuizQuestion`: Question display
- `AnswerOptions`: Multiple choice selector
- `QuizTimer`: Optional timer display
- `QuizResults`: Score and feedback

### Feedback Components
- `HintButton`: Request hint interface
- `HintDisplay`: Tiered hint visualization
- `Explanation`: Answer explanation
- `MotivationalMessage`: Encouragement display

### Dashboard Components
- `MasteryChart`: Visual mastery progress
- `AttentionHeatmap`: Peak time visualization
- `ProgressSummary`: Overall statistics
- `ConceptList`: Strengths and weaknesses

## API Integration

The `lib/api.ts` file provides API client functions:

```typescript
import { lessonsAPI, quizzesAPI, feedbackAPI, analyticsAPI } from '@/lib/api';

// Example usage
const lessons = await lessonsAPI.getAll();
const quiz = await quizzesAPI.generate(lessonId, userId);
const hint = await feedbackAPI.requestHint(questionId, userId, sessionId);
```

## Styling Guidelines

Using Tailwind CSS:
- Primary color: `primary-{50-900}` (blue shades)
- Use semantic class names
- Responsive design: mobile-first approach
- Dark mode support (planned)

## Accessibility

Following WCAG 2.1 Level AA standards:
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios
- Screen reader compatibility

## Testing (Planned)

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## Deployment

The app can be deployed to Vercel, Netlify, or any Next.js-compatible hosting:

```bash
# Build
npm run build

# Preview
npm run start
```

## Next Steps

1. Create component library with Storybook (optional)
2. Implement lesson viewer with MDX support
3. Build quiz interface with adaptive question display
4. Create feedback system with tiered hints
5. Develop dashboard with data visualization
6. Add authentication and session management
7. Implement responsive design and accessibility features
8. Write comprehensive tests
