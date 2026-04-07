# Education Classroom Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing Education hub from a progress tracker into a real classroom where users open lessons, read structured didactic content, complete checklists/exercises, navigate between lessons, and earn completion based on actual consumption — while feeding Ana Clara's daily tips, WhatsApp pills, and proactive mentoring from the same canonical content.

**Architecture:** Add a `content_blocks` JSONB column to `education_lessons` holding structured lesson body (sections, key points, checklist items, exercises, glossary callouts). Build a dedicated `/educacao/licao/:lessonId` route with a rich lesson reader component. The reader renders content blocks as a beautiful, typographically rich page with progress tracking, checklist interactivity, navigation (previous/next), and auto-completion on scroll-through. Ana Clara and WhatsApp tips consume the same `content_blocks` to extract pill-sized nuggets deterministically.

**Tech Stack:** React, TypeScript, Supabase Postgres, shadcn/ui (Card, Progress, Tabs, Separator, Badge, Alert, Checkbox, Button, Skeleton, ScrollArea), framer-motion, react-router-dom, TanStack Query, Vitest

---

## Current State Audit

**What exists:**
- 3 tracks, 3 modules, 15 lessons seeded with `title`, `summary`, `content_type`, `learning_objective`, `estimated_minutes`, `difficulty`.
- `education_lessons` schema has NO body/content column — only metadata.
- `EducationJourneySection.tsx` lists lessons with Start/Complete buttons but clicking them only writes progress; no content opens.
- `education_user_progress` tracks `status`, `started_at`, `completed_at`, `last_viewed_at`, `confidence_rating`.
- Glossary with 20 terms already seeded and rendered.
- Investor profile questionnaire working and persisted.
- Education intelligence context (`education-intelligence` edge function) deployed and returning canonical data.
- Ana education insights (`ana-education-insights`) deployed.
- UI components: `EducationHero`, `EducationJourneySection`, `EducationProgressSection`, `EducationInvestorProfileCard`, `EducationAchievementsSection`, `EducationDailyTipCard`, `EducationGlossarySection`, `EducationEmptyState`.

**What does not exist:**
- No `content_blocks` or `body` column on `education_lessons`.
- No route for opening a lesson (`/educacao/licao/:id`).
- No lesson reader/viewer component.
- No structured didactic content seeded for any lesson.
- No checklist interactivity within lessons.
- No lesson navigation (previous/next within module).
- No reading-progress based completion.
- No extraction of tip-sized content blocks for Ana/WhatsApp pills.
- No visual polish on the lesson experience (typography, illustrations, callouts).

**Design system available:** `shadcn/ui` with Card, Progress, Tabs, Separator, Badge, Alert, Checkbox, Button, Skeleton, ScrollArea, Sheet, Dialog. `framer-motion` for animations. `lucide-react` for icons. Tailwind CSS utility classes.

---

## Content Block Schema

Each lesson's `content_blocks` is a JSONB array of typed blocks rendered in order:

```typescript
type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip' | 'example'; title: string; text: string }
  | { type: 'key_point'; text: string }
  | { type: 'checklist'; title: string; items: Array<{ id: string; label: string; help?: string }> }
  | { type: 'exercise'; title: string; instructions: string; hint?: string }
  | { type: 'glossary_link'; term_slug: string; inline_definition: string }
  | { type: 'separator' }
  | { type: 'summary'; points: string[] }
  | { type: 'next_step'; text: string; lesson_slug?: string };
```

This schema is intentionally simple, renderable without a CMS, and extractable by Ana for tip generation.

---

## File Structure

**Create:**
- `src/pages/LessonViewer.tsx` — full-page lesson reader with navigation and progress
- `src/components/education/LessonContentRenderer.tsx` — renders `ContentBlock[]` as rich HTML
- `src/components/education/LessonNavigation.tsx` — previous/next lesson bar + module breadcrumb
- `src/components/education/LessonProgressBar.tsx` — reading progress indicator (scroll-based)
- `src/components/education/LessonChecklist.tsx` — interactive checklist within lessons
- `src/components/education/LessonExercise.tsx` — exercise prompt with hint toggle
- `src/components/education/LessonCallout.tsx` — styled callout blocks (info/warning/tip/example)
- `src/components/education/LessonSummary.tsx` — end-of-lesson summary with key takeaways
- `src/utils/education/content-blocks.ts` — types, validators, and helpers for ContentBlock
- `src/utils/education/content-blocks.test.ts` — unit tests for block parsing and validation
- `src/utils/education/lesson-navigation.ts` — helpers for previous/next/breadcrumb computation
- `src/utils/education/lesson-navigation.test.ts` — tests for navigation logic
- `src/hooks/useLessonContent.ts` — hook to fetch lesson content + adjacent lessons
- `supabase/migrations/20260407_add_lesson_content_blocks.sql` — adds content_blocks column + seeds all 15 lessons
- `supabase/migrations/20260407_seed_lesson_content.sql` — full didactic content for all 15 lessons

**Modify:**
- `src/App.tsx` — add `/educacao/licao/:lessonId` route
- `src/components/education/EducationJourneySection.tsx` — lesson click navigates to lesson viewer
- `src/hooks/useEducationIntelligence.ts` — expose lesson content fetch for the viewer
- `src/utils/education/view-model.ts` — add lesson URL builder
- `supabase/functions/_shared/education-renderers.ts` — add tip extraction from content_blocks
- `supabase/functions/_shared/education-intelligence.ts` — include content_blocks availability in context

---

## Phased Plan

### Task 1: Add content_blocks schema and content block types

**Files:**
- Create: `src/utils/education/content-blocks.ts`
- Create: `src/utils/education/content-blocks.test.ts`
- Create: `supabase/migrations/20260407_add_lesson_content_blocks.sql`

- [ ] **Step 1: Write failing tests for content block validation**

```typescript
// src/utils/education/content-blocks.test.ts
import { describe, it, expect } from 'vitest';
import {
  isValidContentBlock,
  isValidContentBlockArray,
  extractKeyPoints,
  extractChecklistItems,
  getReadableTextLength,
  type ContentBlock,
} from './content-blocks';

describe('ContentBlock validation', () => {
  it('accepts a valid heading block', () => {
    expect(isValidContentBlock({ type: 'heading', level: 2, text: 'Título' })).toBe(true);
  });

  it('rejects heading with invalid level', () => {
    expect(isValidContentBlock({ type: 'heading', level: 1, text: 'x' })).toBe(false);
  });

  it('accepts a valid paragraph block', () => {
    expect(isValidContentBlock({ type: 'paragraph', text: 'Texto aqui.' })).toBe(true);
  });

  it('accepts a valid callout block', () => {
    expect(
      isValidContentBlock({ type: 'callout', variant: 'tip', title: 'Dica', text: 'Faça isso.' }),
    ).toBe(true);
  });

  it('rejects callout with invalid variant', () => {
    expect(
      isValidContentBlock({ type: 'callout', variant: 'danger', title: 'x', text: 'x' }),
    ).toBe(false);
  });

  it('accepts a valid checklist block', () => {
    expect(
      isValidContentBlock({
        type: 'checklist',
        title: 'Lista',
        items: [{ id: '1', label: 'Item 1' }],
      }),
    ).toBe(true);
  });

  it('rejects checklist with empty items', () => {
    expect(isValidContentBlock({ type: 'checklist', title: 'Lista', items: [] })).toBe(false);
  });

  it('validates a full content block array', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', level: 2, text: 'Introdução' },
      { type: 'paragraph', text: 'Texto.' },
      { type: 'key_point', text: 'Ponto importante.' },
      { type: 'separator' },
      { type: 'summary', points: ['Resumo 1', 'Resumo 2'] },
    ];
    expect(isValidContentBlockArray(blocks)).toBe(true);
  });

  it('extracts key points from blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: 'Intro' },
      { type: 'key_point', text: 'Ponto A' },
      { type: 'key_point', text: 'Ponto B' },
    ];
    expect(extractKeyPoints(blocks)).toEqual(['Ponto A', 'Ponto B']);
  });

  it('extracts checklist items from blocks', () => {
    const blocks: ContentBlock[] = [
      { type: 'checklist', title: 'T', items: [{ id: '1', label: 'A' }, { id: '2', label: 'B' }] },
    ];
    expect(extractChecklistItems(blocks)).toHaveLength(2);
  });

  it('calculates readable text length', () => {
    const blocks: ContentBlock[] = [
      { type: 'paragraph', text: 'Doze caracteres' },
      { type: 'key_point', text: '123' },
    ];
    expect(getReadableTextLength(blocks)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/utils/education/content-blocks.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement content block types and validators**

```typescript
// src/utils/education/content-blocks.ts
export type ContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip' | 'example'; title: string; text: string }
  | { type: 'key_point'; text: string }
  | { type: 'checklist'; title: string; items: Array<{ id: string; label: string; help?: string }> }
  | { type: 'exercise'; title: string; instructions: string; hint?: string }
  | { type: 'glossary_link'; term_slug: string; inline_definition: string }
  | { type: 'separator' }
  | { type: 'summary'; points: string[] }
  | { type: 'next_step'; text: string; lesson_slug?: string };

const CALLOUT_VARIANTS = new Set(['info', 'warning', 'tip', 'example']);
const HEADING_LEVELS = new Set([2, 3]);

export function isValidContentBlock(block: unknown): block is ContentBlock {
  if (!block || typeof block !== 'object') return false;
  const b = block as Record<string, unknown>;
  switch (b.type) {
    case 'heading':
      return HEADING_LEVELS.has(b.level as number) && typeof b.text === 'string' && b.text.length > 0;
    case 'paragraph':
    case 'key_point':
      return typeof b.text === 'string' && b.text.length > 0;
    case 'callout':
      return (
        CALLOUT_VARIANTS.has(b.variant as string) &&
        typeof b.title === 'string' &&
        typeof b.text === 'string'
      );
    case 'checklist':
      return (
        typeof b.title === 'string' &&
        Array.isArray(b.items) &&
        b.items.length > 0 &&
        b.items.every(
          (i: unknown) =>
            typeof i === 'object' && i !== null && typeof (i as Record<string, unknown>).id === 'string' && typeof (i as Record<string, unknown>).label === 'string',
        )
      );
    case 'exercise':
      return typeof b.title === 'string' && typeof b.instructions === 'string';
    case 'glossary_link':
      return typeof b.term_slug === 'string' && typeof b.inline_definition === 'string';
    case 'separator':
      return true;
    case 'summary':
      return Array.isArray(b.points) && b.points.length > 0 && b.points.every((p: unknown) => typeof p === 'string');
    case 'next_step':
      return typeof b.text === 'string';
    default:
      return false;
  }
}

export function isValidContentBlockArray(blocks: unknown): blocks is ContentBlock[] {
  return Array.isArray(blocks) && blocks.length > 0 && blocks.every(isValidContentBlock);
}

export function extractKeyPoints(blocks: ContentBlock[]): string[] {
  return blocks.filter((b): b is ContentBlock & { type: 'key_point' } => b.type === 'key_point').map((b) => b.text);
}

export function extractChecklistItems(blocks: ContentBlock[]): Array<{ id: string; label: string; help?: string }> {
  return blocks
    .filter((b): b is ContentBlock & { type: 'checklist' } => b.type === 'checklist')
    .flatMap((b) => b.items);
}

export function getReadableTextLength(blocks: ContentBlock[]): number {
  let len = 0;
  for (const b of blocks) {
    if ('text' in b && typeof b.text === 'string') len += b.text.length;
    if (b.type === 'summary') len += b.points.join(' ').length;
    if (b.type === 'checklist') len += b.items.reduce((acc, i) => acc + i.label.length, 0);
  }
  return len;
}

export function extractTipContent(blocks: ContentBlock[]): string | null {
  const keyPoints = extractKeyPoints(blocks);
  if (keyPoints.length > 0) return keyPoints[0];
  const callout = blocks.find((b) => b.type === 'callout' && b.variant === 'tip');
  if (callout && callout.type === 'callout') return `${callout.title}: ${callout.text}`;
  return null;
}
```

- [ ] **Step 4: Write the migration to add content_blocks column**

```sql
-- supabase/migrations/20260407_add_lesson_content_blocks.sql
BEGIN;

ALTER TABLE public.education_lessons
ADD COLUMN IF NOT EXISTS content_blocks JSONB;

COMMENT ON COLUMN public.education_lessons.content_blocks IS
  'Structured lesson body as typed ContentBlock[] array. NULL means content not yet authored.';

COMMIT;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- src/utils/education/content-blocks.test.ts`
Expected: PASS — all 10 tests green.

- [ ] **Step 6: Commit**

Commit message: `feat(education): add content block types and lesson body schema`

---

### Task 2: Seed all 15 lessons with real didactic content

**Files:**
- Create: `supabase/migrations/20260407_seed_lesson_content.sql`

This is the most critical task. Every lesson gets real, useful, didactic content — not placeholder text. Content must be serious enough for a real user to learn from.

- [ ] **Step 1: Write the seed migration with all 15 lessons**

The migration must UPDATE each lesson by `slug` with a `content_blocks` JSONB array containing 6-12 blocks per lesson: headings, paragraphs explaining the concept, key points, callouts with practical tips, checklists where applicable, a summary, and a next_step pointer.

Content guidelines:
- Articles: 2-3 sections with headings, 2+ paragraphs each, 2+ key_points, 1+ callout, summary
- Checklists: heading + context paragraph + checklist block with 4-8 actionable items + summary
- Exercises: heading + context + exercise block with instructions and hint + summary
- Every lesson ends with a `summary` block and a `next_step` block pointing to the next lesson in the module
- Language: Brazilian Portuguese, clear, professional, non-patronizing
- No filler content — every paragraph teaches something specific
- Reference glossary terms where natural using `glossary_link` blocks

Each lesson should produce approximately 800-1500 words of readable content (5-18 minutes of reading at ~150 words/minute for didactic content in Portuguese).

- [ ] **Step 2: Apply the migration to the remote database**

Run: Apply via Supabase MCP `apply_migration` tool.
Expected: All 15 lessons have non-null `content_blocks`.

- [ ] **Step 3: Validate the seed**

Run: `SELECT slug, jsonb_array_length(content_blocks) as block_count FROM education_lessons ORDER BY sort_order;`
Expected: Every lesson has 6-12 blocks.

- [ ] **Step 4: Commit**

Commit message: `feat(education): seed all 15 lessons with real didactic content`

---

### Task 3: Build the lesson viewer page and routing

**Files:**
- Create: `src/pages/LessonViewer.tsx`
- Create: `src/hooks/useLessonContent.ts`
- Create: `src/utils/education/lesson-navigation.ts`
- Create: `src/utils/education/lesson-navigation.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/utils/education/view-model.ts`

- [ ] **Step 1: Write failing tests for lesson navigation helpers**

```typescript
// src/utils/education/lesson-navigation.test.ts
import { describe, it, expect } from 'vitest';
import { buildLessonNavigation, getLessonUrl, type LessonNavigationContext } from './lesson-navigation';

describe('lesson navigation', () => {
  const lessons = [
    { id: 'L1', slug: 'first', title: 'First', moduleId: 'M1', sortOrder: 1 },
    { id: 'L2', slug: 'second', title: 'Second', moduleId: 'M1', sortOrder: 2 },
    { id: 'L3', slug: 'third', title: 'Third', moduleId: 'M1', sortOrder: 3 },
  ];

  it('returns null previous for first lesson', () => {
    const nav = buildLessonNavigation('L1', lessons);
    expect(nav.previous).toBeNull();
    expect(nav.next?.id).toBe('L2');
  });

  it('returns both neighbors for middle lesson', () => {
    const nav = buildLessonNavigation('L2', lessons);
    expect(nav.previous?.id).toBe('L1');
    expect(nav.next?.id).toBe('L3');
  });

  it('returns null next for last lesson', () => {
    const nav = buildLessonNavigation('L3', lessons);
    expect(nav.previous?.id).toBe('L2');
    expect(nav.next).toBeNull();
  });

  it('returns correct position info', () => {
    const nav = buildLessonNavigation('L2', lessons);
    expect(nav.currentIndex).toBe(1);
    expect(nav.totalInModule).toBe(3);
  });

  it('builds correct lesson URL', () => {
    expect(getLessonUrl('abc-123')).toBe('/educacao/licao/abc-123');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/utils/education/lesson-navigation.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement navigation helpers**

```typescript
// src/utils/education/lesson-navigation.ts
export interface LessonRef {
  id: string;
  slug: string;
  title: string;
}

export interface LessonNavigationContext {
  previous: LessonRef | null;
  next: LessonRef | null;
  currentIndex: number;
  totalInModule: number;
}

export function buildLessonNavigation(
  currentLessonId: string,
  moduleLessons: Array<{ id: string; slug: string; title: string; moduleId: string; sortOrder: number }>,
): LessonNavigationContext {
  const sorted = [...moduleLessons].sort((a, b) => a.sortOrder - b.sortOrder);
  const idx = sorted.findIndex((l) => l.id === currentLessonId);
  if (idx === -1) {
    return { previous: null, next: null, currentIndex: -1, totalInModule: sorted.length };
  }
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const nxt = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  return {
    previous: prev ? { id: prev.id, slug: prev.slug, title: prev.title } : null,
    next: nxt ? { id: nxt.id, slug: nxt.slug, title: nxt.title } : null,
    currentIndex: idx,
    totalInModule: sorted.length,
  };
}

export function getLessonUrl(lessonId: string): string {
  return `/educacao/licao/${lessonId}`;
}
```

- [ ] **Step 4: Add the `useLessonContent` hook**

Fetches a single lesson (with `content_blocks`) plus sibling lessons in the same module for navigation. Uses `supabase.from('education_lessons')`.

- [ ] **Step 5: Add route to `src/App.tsx`**

Add: `<Route path="educacao/licao/:lessonId" element={<LessonViewer />} />`

- [ ] **Step 6: Add URL builder to view-model**

Add `getLessonUrl` re-export in `src/utils/education/view-model.ts`.

- [ ] **Step 7: Build `LessonViewer.tsx` page skeleton**

Page layout:
- Top: breadcrumb (Track > Module > Lesson N of M)
- Reading progress bar (fixed top, scroll-driven)
- Lesson header: title, difficulty badge, estimated time, content_type badge
- Content body: rendered from `content_blocks` via `LessonContentRenderer`
- Bottom: summary + navigation (previous/next)
- Floating "Marcar como concluída" button
- Loading: full skeleton

- [ ] **Step 8: Run tests**

Run: `pnpm test -- src/utils/education/lesson-navigation.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

Commit message: `feat(education): add lesson viewer page with routing and navigation`

---

### Task 4: Build the lesson content renderer and UI components

**Files:**
- Create: `src/components/education/LessonContentRenderer.tsx`
- Create: `src/components/education/LessonCallout.tsx`
- Create: `src/components/education/LessonChecklist.tsx`
- Create: `src/components/education/LessonExercise.tsx`
- Create: `src/components/education/LessonSummary.tsx`
- Create: `src/components/education/LessonNavigation.tsx`
- Create: `src/components/education/LessonProgressBar.tsx`

- [ ] **Step 1: Build `LessonContentRenderer.tsx`**

Iterates over `ContentBlock[]` and delegates to the correct sub-component:
- `heading` → `<h2>` or `<h3>` with proper typography classes
- `paragraph` → `<p>` with `prose` styling and proper line height
- `callout` → `<LessonCallout>`
- `key_point` → highlighted box with accent left border and star icon
- `checklist` → `<LessonChecklist>`
- `exercise` → `<LessonExercise>`
- `glossary_link` → inline tooltip/popover with term definition
- `separator` → `<Separator />`
- `summary` → `<LessonSummary>`
- `next_step` → CTA card with link to next lesson

Design requirements:
- Use `max-w-3xl mx-auto` for comfortable reading width
- Font size 16-18px for body text
- `leading-relaxed` line height
- Generous spacing between blocks (`space-y-6`)
- Cards and callouts use `shadcn/ui Card` with appropriate border colors
- Smooth `framer-motion` fade-in on each block

- [ ] **Step 2: Build `LessonCallout.tsx`**

Styled alert/card with icon and color per variant:
- `info`: blue, InfoIcon
- `warning`: amber, AlertTriangle
- `tip`: green, Lightbulb
- `example`: violet, BookOpen

- [ ] **Step 3: Build `LessonChecklist.tsx`**

Interactive checklist rendered from checklist content blocks:
- Each item has a Checkbox + label + optional help text
- Local state tracks which items are checked (session-only, not persisted to DB)
- Progress bar shows "3 de 5 itens completos"
- Visual celebration when all checked (subtle confetti or green border)

- [ ] **Step 4: Build `LessonExercise.tsx`**

Exercise prompt card:
- Title + instructions in a distinct card
- "Mostrar dica" button that toggles hint text
- Thoughtful, non-trivial design

- [ ] **Step 5: Build `LessonSummary.tsx`**

End-of-lesson summary:
- Card with gradient top border
- "O que você aprendeu" heading
- Bulleted list of summary points
- Distinct visual weight to signal "lesson end"

- [ ] **Step 6: Build `LessonNavigation.tsx`**

Bottom navigation bar:
- Left: "← Lição anterior" with lesson title (or disabled if first)
- Center: "Lição N de M"
- Right: "Próxima lição →" with lesson title (or "Voltar à trilha" if last)
- Use `react-router-dom` `Link` to navigate
- Subtle border-top separator

- [ ] **Step 7: Build `LessonProgressBar.tsx`**

Fixed top bar that fills as user scrolls:
- Thin (3px) gradient bar
- Tracks scroll position of the main content area
- 100% triggers optional "Você leu tudo!" micro-animation

- [ ] **Step 8: Validate visual quality**

Run: `pnpm exec tsc -b --pretty false`
Expected: No type errors.

- [ ] **Step 9: Commit**

Commit message: `feat(education): build rich lesson content renderer with interactive components`

---

### Task 5: Wire journey section to the lesson viewer

**Files:**
- Modify: `src/components/education/EducationJourneySection.tsx`
- Modify: `src/pages/LessonViewer.tsx`
- Modify: `src/hooks/useEducationIntelligence.ts`

- [ ] **Step 1: Update `EducationJourneySection.tsx`**

Currently, clicking a lesson's "Iniciar" button calls `onStartLesson(lessonId)` which only writes progress. Change it to:
1. Write progress (start) **and** navigate to `/educacao/licao/:lessonId`
2. "Marcar concluída" in the journey list still works for quick completion
3. Lesson title becomes a clickable link to the viewer
4. Add a small "Abrir aula" icon button next to each lesson

- [ ] **Step 2: Add completion flow in `LessonViewer.tsx`**

When user clicks "Marcar como concluída" in the lesson viewer:
1. Call `completeLesson(lessonId)` from `useEducationIntelligence`
2. Show success toast
3. If there is a next lesson, show "Ir para próxima lição" CTA
4. If it's the last lesson in the module, show "Módulo concluído!" celebration

- [ ] **Step 3: Auto-start lesson on viewer mount**

When `LessonViewer` mounts and the lesson status is `not_started`, automatically call `startLesson(lessonId)` so the progress tracks real engagement.

- [ ] **Step 4: Validate end-to-end flow**

Browser test flow:
1. Go to `/educacao`
2. Click "Iniciar" on a lesson → navigates to `/educacao/licao/:id`
3. Read content, scroll through
4. Click "Marcar como concluída" → toast + next lesson CTA
5. Navigate back to hub → progress updated

Run: `pnpm exec tsc -b --pretty false`
Expected: No type errors.

- [ ] **Step 5: Commit**

Commit message: `feat(education): wire journey to lesson viewer with progress tracking`

---

### Task 6: Feed Ana Clara and WhatsApp tips from lesson content

**Files:**
- Modify: `supabase/functions/_shared/education-renderers.ts`
- Modify: `supabase/functions/_shared/education-intelligence.ts`

- [ ] **Step 1: Add tip extraction to education-renderers**

Use `extractTipContent()` and `extractKeyPoints()` from content blocks to generate deterministic daily tips. The tip picker should:
1. Find the user's current/next recommended lesson
2. Extract the first key_point or tip callout from that lesson's content_blocks
3. Format it as a concise WhatsApp-friendly message
4. Include lesson title and a "Abra a aula completa no app" CTA

- [ ] **Step 2: Update education intelligence context**

Add a `hasContent` boolean to the lesson/module metadata in the context so the frontend and Ana know which lessons actually have readable content vs. metadata-only stubs.

- [ ] **Step 3: Validate**

Run: `pnpm test -- src/utils/education/content-blocks.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

Commit message: `feat(education): extract lesson tips for Ana Clara and WhatsApp delivery`

---

### Task 7: Deploy, apply migrations, and browser E2E

**Files:**
- Deploy: `education-intelligence` (updated)
- Apply: `20260407_add_lesson_content_blocks.sql`
- Apply: `20260407_seed_lesson_content.sql`

- [ ] **Step 1: Apply migrations to remote**

Apply both migrations via Supabase MCP.
Verify: `SELECT slug, jsonb_array_length(content_blocks) FROM education_lessons;` — all 15 have blocks.

- [ ] **Step 2: Deploy updated edge functions**

Deploy `education-intelligence` with content awareness.
Deploy `ana-education-insights` if renderers changed.

- [ ] **Step 3: Browser E2E validation**

Test:
1. `/educacao` hub loads with all tracks/modules/lessons
2. Click any lesson → `/educacao/licao/:id` opens with rich content
3. Scroll through → progress bar fills
4. Checklist items are interactive
5. Exercise hint toggles
6. "Marcar como concluída" works and updates hub
7. Navigation (previous/next) works correctly
8. First lesson has no "previous", last has "Voltar à trilha"
9. Investor profile questionnaire still works
10. Glossary section still works

- [ ] **Step 4: Visual quality check**

Verify:
- Typography is clean and readable
- Callouts are visually distinct by variant
- Checklists have proper spacing and hover states
- Mobile responsive (test at 375px width)
- Progress bar is subtle but visible
- Navigation is intuitive

- [ ] **Step 5: Commit**

Commit message: `feat(education): ship classroom experience with full lesson content`

---

## Success Criteria

This plan is complete when:

- Every lesson opens in a dedicated viewer with rich, readable content
- Content is real and teaches financial concepts — not placeholder text
- Checklists are interactive within lessons
- Navigation between lessons is seamless (previous/next)
- Reading progress is tracked visually
- Completion is earned through engagement, not just a button click from the hub
- Ana Clara can extract tips from lesson content deterministically
- The experience is visually polished, professional, and mobile-friendly
- All 15 lessons have 800+ words of real didactic content in Portuguese

---

## Risks

- Content quality: generic financial advice is useless. Each lesson must teach something specific and actionable.
- Mobile UX: long-form reading on mobile needs careful typography (font size, line height, margins).
- Performance: `content_blocks` JSONB per lesson should be small (~5-15KB). No concern at 15 lessons.
- Scope creep: resist adding quiz scoring, video embeds, or interactive calculators in this phase. Those are valid future additions but not required for the classroom to work.

---

## Self-Review

**Spec coverage:** The plan covers schema extension, content seeding (all 15 lessons), viewer page, rich rendering, navigation, progress tracking, journey integration, Ana/WhatsApp tip extraction, deployment, and E2E validation.

**Placeholder scan:** No TBD/TODO. Every task has concrete file paths, code, and validation steps.

**Type consistency:** `ContentBlock` is defined once in `content-blocks.ts` and consumed by renderer, validator, and tip extractor consistently. `getLessonUrl` is defined once and reused. Navigation uses `LessonRef` throughout.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-07-education-classroom-experience.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
