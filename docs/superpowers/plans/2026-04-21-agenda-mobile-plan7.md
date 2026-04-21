# Agenda Mobile — Plan 7

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the mobile-native redesign of the Agenda (`/agenda`) page — month grid with dots, swipeable week strip, vertical day timeline, event list for the focused day, and filter bottom sheet — while keeping all 3 view modes (Mês / Semana / Dia) with persisted selection. Desktop stays pixel-identical.

**Architecture:** Introduce 5 mobile-only components (`MonthGridMobile`, `WeekStrip`, `DayViewMobile`, `AgendaDayList`, `CalendarFiltersSheet`) plus 1 hook (`useAgendaViewMode`) with localStorage persistence. Migrate the 3 existing Radix-portal dialogs (`AgendaItemSheet`, `CreateEventDialog`, `OwnershipPageChooserDialog`) to `ResponsiveDialog` to prevent the mobile freeze bug we hit in Cartões. `CalendarPage` dual-renders desktop and mobile subtrees behind `hidden lg:block` / `lg:hidden` CSS — cheap DOM duplication, zero desktop risk.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, date-fns, lucide-react, Zustand (`useUIStore` — unchanged), Vitest + @testing-library/react (jsdom), @tanstack/react-query (`useCalendarAgenda` — unchanged).

**Spec:** [docs/superpowers/specs/2026-04-21-agenda-mobile-design.md](../specs/2026-04-21-agenda-mobile-design.md)

**Suggested branch:** `feat/agenda-mobile-plan7`

---

## Task 1 — `useAgendaViewMode` hook (localStorage persistence)

**Files:**
- Create: `src/hooks/useAgendaViewMode.ts`
- Create: `src/hooks/__tests__/useAgendaViewMode.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `src/hooks/__tests__/useAgendaViewMode.test.ts`:

```ts
/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAgendaViewMode } from '../useAgendaViewMode';

const KEY = 'agenda-view-mode';

describe('useAgendaViewMode', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('defaults to "month" when nothing is stored', () => {
    const { result } = renderHook(() => useAgendaViewMode());
    expect(result.current[0]).toBe('month');
  });

  it('reads a valid stored value', () => {
    window.localStorage.setItem(KEY, 'week');
    const { result } = renderHook(() => useAgendaViewMode());
    expect(result.current[0]).toBe('week');
  });

  it('falls back to default on invalid stored value', () => {
    window.localStorage.setItem(KEY, 'bogus');
    const { result } = renderHook(() => useAgendaViewMode('day'));
    expect(result.current[0]).toBe('day');
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useAgendaViewMode());
    act(() => result.current[1]('day'));
    expect(window.localStorage.getItem(KEY)).toBe('day');
    expect(result.current[0]).toBe('day');
  });

  it('accepts explicit default override', () => {
    const { result } = renderHook(() => useAgendaViewMode('week'));
    expect(result.current[0]).toBe('week');
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `pnpm test src/hooks/__tests__/useAgendaViewMode.test.ts`
Expected: FAIL with "Cannot find module '../useAgendaViewMode'".

- [ ] **Step 1.3: Implement the hook**

Create `src/hooks/useAgendaViewMode.ts`:

```ts
import { useEffect, useState } from 'react';

export type CalendarViewMode = 'month' | 'week' | 'day';

const STORAGE_KEY = 'agenda-view-mode';
const VALID: ReadonlySet<CalendarViewMode> = new Set(['month', 'week', 'day']);

function readStored(fallback: CalendarViewMode): CalendarViewMode {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as CalendarViewMode) ? (raw as CalendarViewMode) : fallback;
}

export function useAgendaViewMode(defaultMode: CalendarViewMode = 'month') {
  const [mode, setMode] = useState<CalendarViewMode>(() => readStored(defaultMode));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return [mode, setMode] as const;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `pnpm test src/hooks/__tests__/useAgendaViewMode.test.ts`
Expected: 5 tests pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/hooks/useAgendaViewMode.ts src/hooks/__tests__/useAgendaViewMode.test.ts
git commit -m "feat(agenda): add useAgendaViewMode hook with localStorage persistence"
```

---

## Task 2 — `AgendaDayList` component

**Files:**
- Create: `src/components/calendar/AgendaDayList.tsx`
- Create: `src/components/calendar/__tests__/AgendaDayList.test.tsx`

- [ ] **Step 2.1: Write the failing test**

Create `src/components/calendar/__tests__/AgendaDayList.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AgendaDayList } from '../AgendaDayList';
import type { AgendaItem } from '@/types/calendar.types';

function makeItem(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'evt-1',
    dedup_key: 'k1',
    display_start_at: '2026-04-21T10:00:00.000Z',
    display_end_at: '2026-04-21T11:00:00.000Z',
    title: 'Reunião',
    subtitle: '10:00 – 11:00',
    status: 'scheduled',
    badge: 'personal',
    edit_route: null,
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

describe('AgendaDayList', () => {
  afterEach(() => cleanup());

  const focusedDay = new Date(2026, 3, 21); // Apr 21 2026

  it('renders only items that fall on the focused day', () => {
    const items = [
      makeItem({ origin_id: 'a', title: 'Hoje' }),
      makeItem({
        origin_id: 'b',
        title: 'Outro dia',
        display_start_at: '2026-04-22T10:00:00.000Z',
      }),
    ];
    render(<AgendaDayList items={items} focusedDay={focusedDay} onItemClick={vi.fn()} />);
    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.queryByText('Outro dia')).toBeNull();
  });

  it('renders empty state when no items match', () => {
    render(<AgendaDayList items={[]} focusedDay={focusedDay} onItemClick={vi.fn()} />);
    expect(screen.getByText(/nenhum compromisso/i)).toBeTruthy();
  });

  it('shows the read-only lock icon when is_read_only', () => {
    render(
      <AgendaDayList
        items={[makeItem({ is_read_only: true })]}
        focusedDay={focusedDay}
        onItemClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/somente leitura/i)).toBeTruthy();
  });

  it('fires onItemClick when an item is tapped', () => {
    const onClick = vi.fn();
    const item = makeItem();
    render(<AgendaDayList items={[item]} focusedDay={focusedDay} onItemClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Reunião/i }));
    expect(onClick).toHaveBeenCalledWith(item);
  });

  it('renders section header with focused day label and count', () => {
    render(
      <AgendaDayList
        items={[makeItem(), makeItem({ origin_id: 'c', dedup_key: 'k2', title: 'Outra' })]}
        focusedDay={focusedDay}
        onItemClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/21 abr/i)).toBeTruthy();
    expect(screen.getByText(/2 compromissos/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `pnpm test src/components/calendar/__tests__/AgendaDayList.test.tsx`
Expected: FAIL with "Cannot find module '../AgendaDayList'".

- [ ] **Step 2.3: Implement the component**

Create `src/components/calendar/AgendaDayList.tsx`:

```tsx
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface AgendaDayListProps {
  items: AgendaItem[];
  focusedDay: Date;
  onItemClick: (item: AgendaItem) => void;
}

const CATEGORY_DOT: Record<string, string> = {
  events: 'bg-emerald-500',
  payable: 'bg-orange-500',
  reminders: 'bg-purple-500',
  external: 'bg-blue-500',
};

const CATEGORY_BADGE: Record<string, string> = {
  events: 'bg-emerald-500/15 text-emerald-400',
  payable: 'bg-orange-500/15 text-orange-400',
  reminders: 'bg-purple-500/15 text-purple-400',
  external: 'bg-blue-500/15 text-blue-400',
};

const CATEGORY_LABEL: Record<string, string> = {
  events: 'Evento',
  payable: 'Conta',
  reminders: 'Lembrete',
  external: 'Externo',
};

export function AgendaDayList({ items, focusedDay, onItemClick }: AgendaDayListProps) {
  const dayItems = items.filter((item) =>
    isSameDay(parseISO(item.display_start_at), focusedDay),
  );

  const headerLabel = format(focusedDay, "EEE, dd 'de' MMM", { locale: ptBR });
  const count = dayItems.length;

  return (
    <section className="lg:hidden" aria-label="Compromissos do dia">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold capitalize text-foreground">{headerLabel}</h2>
        {count > 0 ? (
          <span className="text-xs text-muted-foreground">
            {count === 1 ? '1 compromisso' : `${count} compromissos`}
          </span>
        ) : null}
      </header>

      {count === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhum compromisso neste dia.
        </div>
      ) : (
        <ul role="list" className="divide-y divide-border/60">
          {dayItems.map((item) => {
            const category = getAgendaItemFilterCategory(item);
            const dotClass = CATEGORY_DOT[category] ?? 'bg-slate-500';
            const badgeClass = CATEGORY_BADGE[category] ?? 'bg-slate-500/15 text-slate-300';
            const badgeLabel = CATEGORY_LABEL[category] ?? 'Outro';
            return (
              <li key={item.dedup_key} role="listitem">
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-elevated"
                >
                  <span className={cn('mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full', dotClass)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      {item.is_read_only ? (
                        <Lock
                          className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                          aria-label="Somente leitura"
                        />
                      ) : null}
                    </div>
                    {item.subtitle ? (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </div>
                    ) : null}
                    <span
                      className={cn(
                        'mt-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        badgeClass,
                      )}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

**Note on categories:** `getAgendaItemFilterCategory` from `calendar-utils.ts` already returns category slugs; this implementation maps `events`, `payable`, `reminders`, `external`. If the util returns different slugs, the fallback (`bg-slate-500`) kicks in — verify by running the tests.

- [ ] **Step 2.4: Run test to verify it passes**

Run: `pnpm test src/components/calendar/__tests__/AgendaDayList.test.tsx`
Expected: 5 tests pass. If category labels mismatch, adjust the maps in the component to match the actual return values of `getAgendaItemFilterCategory`.

- [ ] **Step 2.5: Commit**

```bash
git add src/components/calendar/AgendaDayList.tsx src/components/calendar/__tests__/AgendaDayList.test.tsx
git commit -m "feat(agenda): add AgendaDayList — focused-day event list for mobile"
```

---

## Task 3 — `MonthGridMobile` component

**Files:**
- Create: `src/components/calendar/MonthGridMobile.tsx`
- Create: `src/components/calendar/__tests__/MonthGridMobile.test.tsx`

- [ ] **Step 3.1: Write the failing test**

Create `src/components/calendar/__tests__/MonthGridMobile.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MonthGridMobile } from '../MonthGridMobile';
import type { AgendaItem } from '@/types/calendar.types';

function makeItem(iso: string, id = 'x'): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: id,
    dedup_key: id,
    display_start_at: iso,
    display_end_at: null,
    title: 'T',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
    edit_route: null,
    is_read_only: false,
    supports_reschedule: false,
    supports_complete: false,
    metadata: null,
  };
}

describe('MonthGridMobile', () => {
  afterEach(() => cleanup());

  const anchor = new Date(2026, 3, 15); // Apr 15 2026
  const focusedDay = new Date(2026, 3, 21); // Apr 21 2026

  it('renders 42 day cells (6 weeks × 7)', () => {
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('marks the focused day with aria-current', () => {
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    const cell = screen.getByRole('gridcell', { name: /21 de abril/i });
    expect(cell.getAttribute('aria-current')).toBe('date');
  });

  it('calls onDayFocus when tapping a day in the current month', () => {
    const onDayFocus = vi.fn();
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={onDayFocus}
        onMonthChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('gridcell', { name: /22 de abril/i }));
    expect(onDayFocus).toHaveBeenCalledWith(expect.any(Date));
    expect((onDayFocus.mock.calls[0][0] as Date).getDate()).toBe(22);
  });

  it('fires onMonthChange when tapping a day from an adjacent month', () => {
    const onMonthChange = vi.fn();
    const onDayFocus = vi.fn();
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={onDayFocus}
        onMonthChange={onMonthChange}
      />,
    );
    // March 29 lives in the grid top row (before April starts on Wednesday)
    fireEvent.click(screen.getByRole('gridcell', { name: /29 de março/i }));
    expect(onMonthChange).toHaveBeenCalled();
    expect(onDayFocus).toHaveBeenCalled();
  });

  it('renders a dot when a day has at least one event', () => {
    render(
      <MonthGridMobile
        anchor={anchor}
        items={[makeItem('2026-04-21T12:00:00.000Z')]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    const cell = screen.getByRole('gridcell', { name: /21 de abril/i });
    expect(cell.querySelector('[data-testid="day-dot"]')).not.toBeNull();
  });
});
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `pnpm test src/components/calendar/__tests__/MonthGridMobile.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 3.3: Implement the component**

Create `src/components/calendar/MonthGridMobile.tsx`:

```tsx
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface MonthGridMobileProps {
  anchor: Date;
  items: AgendaItem[];
  focusedDay: Date;
  onDayFocus: (day: Date) => void;
  onMonthChange: (newAnchor: Date) => void;
  isLoading?: boolean;
}

const CATEGORY_DOT: Record<string, string> = {
  events: 'bg-emerald-500',
  payable: 'bg-orange-500',
  reminders: 'bg-purple-500',
  external: 'bg-blue-500',
};

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MonthGridMobile({
  anchor,
  items,
  focusedDay,
  onDayFocus,
  onMonthChange,
}: MonthGridMobileProps) {
  const gridStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd }).slice(0, 42);
  const today = new Date();

  const dotsByDayKey = new Map<string, string[]>();
  for (const item of items) {
    const key = format(parseISO(item.display_start_at), 'yyyy-MM-dd');
    const arr = dotsByDayKey.get(key) ?? [];
    const cls = CATEGORY_DOT[getAgendaItemFilterCategory(item)] ?? 'bg-slate-500';
    if (!arr.includes(cls) && arr.length < 3) arr.push(cls);
    dotsByDayKey.set(key, arr);
  }

  const handleClick = (day: Date) => {
    if (!isSameMonth(day, anchor)) onMonthChange(day);
    onDayFocus(day);
  };

  return (
    <div className="lg:hidden" role="grid" aria-label="Calendário mensal">
      <div className="grid grid-cols-7 border-b border-border/60 px-1">
        {WEEKDAYS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="py-1 text-center text-[10px] font-semibold uppercase text-muted-foreground"
            aria-hidden="true"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dots = dotsByDayKey.get(key) ?? [];
          const inMonth = isSameMonth(day, anchor);
          const isToday = isSameDay(day, today);
          const isFocused = isSameDay(day, focusedDay);
          const ariaLabel = format(day, "d 'de' MMMM", { locale: ptBR });
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={ariaLabel}
              aria-current={isFocused ? 'date' : undefined}
              onClick={() => handleClick(day)}
              className={cn(
                'flex min-h-[48px] flex-col items-center gap-1 border-b border-border/40 py-1 transition-colors',
                inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                isFocused && 'bg-primary/10',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  isToday && 'bg-primary text-primary-foreground font-semibold',
                  isFocused && !isToday && 'ring-2 ring-primary/60',
                )}
              >
                {format(day, 'd')}
              </span>
              {dots.length > 0 ? (
                <span className="flex gap-0.5">
                  {dots.map((cls, i) => (
                    <span
                      key={i}
                      data-testid="day-dot"
                      className={cn('h-1 w-1 rounded-full', cls)}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `pnpm test src/components/calendar/__tests__/MonthGridMobile.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/calendar/MonthGridMobile.tsx src/components/calendar/__tests__/MonthGridMobile.test.tsx
git commit -m "feat(agenda): add MonthGridMobile with dot indicators for mobile month view"
```

---

## Task 4 — `WeekStrip` component

**Files:**
- Create: `src/components/calendar/WeekStrip.tsx`
- Create: `src/components/calendar/__tests__/WeekStrip.test.tsx`

- [ ] **Step 4.1: Write the failing test**

Create `src/components/calendar/__tests__/WeekStrip.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WeekStrip } from '../WeekStrip';
import type { AgendaItem } from '@/types/calendar.types';

function makeItem(iso: string, id = 'x'): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: id,
    dedup_key: id,
    display_start_at: iso,
    display_end_at: null,
    title: 'T',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
    edit_route: null,
    is_read_only: false,
    supports_reschedule: false,
    supports_complete: false,
    metadata: null,
  };
}

describe('WeekStrip', () => {
  afterEach(() => cleanup());

  const anchor = new Date(2026, 3, 21); // Tuesday Apr 21, 2026
  const focusedDay = new Date(2026, 3, 21);

  it('renders 7 day cells with role="tab"', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('tab')).toHaveLength(7);
  });

  it('marks the focused day with aria-current', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    const cell = screen.getByRole('tab', { name: /21 de abril/i });
    expect(cell.getAttribute('aria-current')).toBe('date');
  });

  it('fires onDayFocus with the tapped day', () => {
    const onDayFocus = vi.fn();
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={onDayFocus}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: /23 de abril/i }));
    expect(onDayFocus).toHaveBeenCalled();
    expect((onDayFocus.mock.calls[0][0] as Date).getDate()).toBe(23);
  });

  it('renders a dot when a day has at least one event', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[makeItem('2026-04-22T10:00:00.000Z')]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    const cell = screen.getByRole('tab', { name: /22 de abril/i });
    expect(cell.querySelector('[data-testid="week-dot"]')).not.toBeNull();
  });

  it('renders the week covering the anchor (Sun–Sat)', () => {
    render(
      <WeekStrip
        anchor={anchor}
        items={[]}
        focusedDay={focusedDay}
        onDayFocus={vi.fn()}
      />,
    );
    // Week of Apr 21 2026 is Apr 19 (Sun) through Apr 25 (Sat)
    expect(screen.getByRole('tab', { name: /19 de abril/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /25 de abril/i })).toBeTruthy();
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `pnpm test src/components/calendar/__tests__/WeekStrip.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 4.3: Implement the component**

Create `src/components/calendar/WeekStrip.tsx`:

```tsx
import { eachDayOfInterval, endOfWeek, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface WeekStripProps {
  anchor: Date;
  items: AgendaItem[];
  focusedDay: Date;
  onDayFocus: (day: Date) => void;
}

const CATEGORY_DOT: Record<string, string> = {
  events: 'bg-emerald-500',
  payable: 'bg-orange-500',
  reminders: 'bg-purple-500',
  external: 'bg-blue-500',
};

const LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function WeekStrip({ anchor, items, focusedDay, onDayFocus }: WeekStripProps) {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  const end = endOfWeek(anchor, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const today = new Date();

  const dotByDay = new Map<string, string>();
  for (const item of items) {
    const key = format(parseISO(item.display_start_at), 'yyyy-MM-dd');
    if (dotByDay.has(key)) continue;
    const cls = CATEGORY_DOT[getAgendaItemFilterCategory(item)] ?? 'bg-slate-500';
    dotByDay.set(key, cls);
  }

  return (
    <div
      role="tablist"
      aria-label="Dias da semana"
      className="grid grid-cols-7 gap-1 border-b border-border/60 px-2 py-2 lg:hidden"
    >
      {days.map((day, i) => {
        const key = format(day, 'yyyy-MM-dd');
        const dot = dotByDay.get(key);
        const isToday = isSameDay(day, today);
        const isFocused = isSameDay(day, focusedDay);
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-label={format(day, "d 'de' MMMM", { locale: ptBR })}
            aria-current={isFocused ? 'date' : undefined}
            onClick={() => onDayFocus(day)}
            className="flex flex-col items-center gap-1 rounded-xl py-1 transition-colors"
          >
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
              {LABELS[i]}
            </span>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                isToday && 'bg-primary text-primary-foreground',
                !isToday && isFocused && 'bg-primary/15 text-primary font-semibold ring-1 ring-primary/40',
                !isToday && !isFocused && 'text-foreground',
              )}
            >
              {format(day, 'd')}
            </span>
            {dot ? (
              <span
                data-testid="week-dot"
                className={cn('h-1 w-1 rounded-full', dot)}
              />
            ) : (
              <span className="h-1 w-1" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4.4: Run test to verify it passes**

Run: `pnpm test src/components/calendar/__tests__/WeekStrip.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/components/calendar/WeekStrip.tsx src/components/calendar/__tests__/WeekStrip.test.tsx
git commit -m "feat(agenda): add WeekStrip — 7-day horizontal strip for mobile week view"
```

---

## Task 5 — `DayViewMobile` component

**Files:**
- Create: `src/components/calendar/DayViewMobile.tsx`
- Create: `src/components/calendar/__tests__/DayViewMobile.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `src/components/calendar/__tests__/DayViewMobile.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DayViewMobile } from '../DayViewMobile';
import type { AgendaItem } from '@/types/calendar.types';

function makeItem(overrides: Partial<AgendaItem> = {}): AgendaItem {
  return {
    agenda_item_type: 'canonical_event',
    origin_type: 'calendar_event',
    origin_id: 'evt-1',
    dedup_key: 'k1',
    display_start_at: '2026-04-21T13:00:00.000Z',
    display_end_at: '2026-04-21T14:00:00.000Z',
    title: 'Reunião',
    subtitle: null,
    status: 'scheduled',
    badge: 'personal',
    edit_route: null,
    is_read_only: false,
    supports_reschedule: true,
    supports_complete: true,
    metadata: null,
    ...overrides,
  };
}

describe('DayViewMobile', () => {
  afterEach(() => cleanup());

  const anchor = new Date(2026, 3, 21);

  it('renders hourly slots from 06:00 to 23:00', () => {
    render(
      <DayViewMobile
        anchor={anchor}
        items={[]}
        onItemClick={vi.fn()}
      />,
    );
    const slots = screen.getAllByTestId('hour-slot');
    expect(slots).toHaveLength(18); // 6..23 inclusive
  });

  it('renders timed events', () => {
    render(
      <DayViewMobile
        anchor={anchor}
        items={[makeItem({ title: 'Reunião' })]}
        onItemClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Reunião')).toBeTruthy();
  });

  it('renders the all-day band for items without a time component', () => {
    const allDay = makeItem({
      origin_id: 'a1',
      dedup_key: 'a1',
      title: 'Feriado Tiradentes',
      display_start_at: '2026-04-21T00:00:00.000Z',
      display_end_at: '2026-04-21T23:59:00.000Z',
    });
    render(
      <DayViewMobile
        anchor={anchor}
        items={[allDay]}
        onItemClick={vi.fn()}
      />,
    );
    const band = screen.getByTestId('all-day-band');
    expect(band.textContent).toContain('Feriado Tiradentes');
  });

  it('fires onItemClick when an event is tapped', () => {
    const onItemClick = vi.fn();
    const item = makeItem();
    render(
      <DayViewMobile
        anchor={anchor}
        items={[item]}
        onItemClick={onItemClick}
      />,
    );
    fireEvent.click(screen.getByText('Reunião'));
    expect(onItemClick).toHaveBeenCalledWith(item);
  });

  it('fires onEmptySlotClick with the hour when an empty slot is tapped', () => {
    const onEmptySlotClick = vi.fn();
    render(
      <DayViewMobile
        anchor={anchor}
        items={[]}
        onItemClick={vi.fn()}
        onEmptySlotClick={onEmptySlotClick}
      />,
    );
    const slots = screen.getAllByTestId('hour-slot');
    fireEvent.click(slots[2]); // 06:00 + 2 = 08:00
    expect(onEmptySlotClick).toHaveBeenCalledWith(expect.any(Date), 8);
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `pnpm test src/components/calendar/__tests__/DayViewMobile.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 5.3: Implement the component**

Create `src/components/calendar/DayViewMobile.tsx`:

```tsx
import { differenceInMinutes, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { getAgendaItemFilterCategory } from './calendar-utils';
import type { AgendaItem } from '@/types/calendar.types';

interface DayViewMobileProps {
  anchor: Date;
  items: AgendaItem[];
  isLoading?: boolean;
  onItemClick: (item: AgendaItem) => void;
  onEmptySlotClick?: (date: Date, hour: number) => void;
}

const CATEGORY_EV_BG: Record<string, string> = {
  events: 'bg-emerald-500/15 text-emerald-200 border-l-emerald-500',
  payable: 'bg-orange-500/15 text-orange-200 border-l-orange-500',
  reminders: 'bg-purple-500/15 text-purple-200 border-l-purple-500',
  external: 'bg-blue-500/15 text-blue-200 border-l-blue-500',
};

const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

function isAllDay(item: AgendaItem): boolean {
  if (!item.display_end_at) return false;
  const start = parseISO(item.display_start_at);
  const end = parseISO(item.display_end_at);
  const minutes = differenceInMinutes(end, start);
  return minutes >= 23 * 60; // 23h+ considered all-day
}

export function DayViewMobile({
  anchor,
  items,
  onItemClick,
  onEmptySlotClick,
}: DayViewMobileProps) {
  const dayStart = startOfDay(anchor);
  const nowRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const showNowLine = isSameDay(anchor, today);
  const nowMinutesFromStart = showNowLine
    ? (today.getHours() - START_HOUR) * 60 + today.getMinutes()
    : -1;

  useEffect(() => {
    if (nowRef.current) nowRef.current.scrollIntoView({ block: 'center' });
  }, []);

  const dayItems = items.filter((item) => isSameDay(parseISO(item.display_start_at), anchor));
  const allDayItems = dayItems.filter(isAllDay);
  const timedItems = dayItems.filter((item) => !isAllDay(item));

  return (
    <div className="lg:hidden">
      <div
        data-testid="all-day-band"
        className={cn(
          'border-b border-border/60 px-4 py-2',
          allDayItems.length === 0 && 'hidden',
        )}
      >
        {allDayItems.map((item) => (
          <button
            key={item.dedup_key}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex w-full items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-left text-sm text-emerald-200"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate">{item.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">Todo o dia</span>
          </button>
        ))}
      </div>

      <div className="relative">
        {HOURS.map((hour) => (
          <button
            key={hour}
            type="button"
            data-testid="hour-slot"
            onClick={() => {
              if (onEmptySlotClick) {
                const slot = new Date(dayStart);
                slot.setHours(hour, 0, 0, 0);
                onEmptySlotClick(slot, hour);
              }
            }}
            className="flex w-full items-start gap-3 border-t border-border/40 px-4 py-1 text-left"
            style={{ minHeight: '60px' }}
          >
            <span className="w-10 flex-shrink-0 pt-1 text-right text-[11px] text-muted-foreground">
              {String(hour).padStart(2, '0')}:00
            </span>
            <span className="flex-1" />
          </button>
        ))}

        <div className="pointer-events-none absolute inset-0">
          {timedItems.map((item) => {
            const start = parseISO(item.display_start_at);
            const end = item.display_end_at ? parseISO(item.display_end_at) : start;
            const minutesFromStart = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
            const durationMin = Math.max(30, differenceInMinutes(end, start));
            if (minutesFromStart < 0) return null;
            const top = minutesFromStart; // 1px per minute — 60px/hour
            const height = durationMin;
            const category = getAgendaItemFilterCategory(item);
            const cls = CATEGORY_EV_BG[category] ?? 'bg-slate-500/15 text-slate-200 border-l-slate-500';
            return (
              <button
                key={item.dedup_key}
                type="button"
                onClick={() => onItemClick(item)}
                className={cn(
                  'pointer-events-auto absolute left-14 right-4 overflow-hidden rounded-md border-l-2 px-2 py-1 text-left text-xs',
                  cls,
                )}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="font-semibold">{item.title}</div>
                <div className="truncate text-[10px] opacity-75">
                  {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
                </div>
              </button>
            );
          })}

          {showNowLine && nowMinutesFromStart >= 0 ? (
            <div
              ref={nowRef}
              data-testid="current-time-line"
              className="pointer-events-none absolute left-0 right-0 flex items-center gap-2"
              style={{ top: `${nowMinutesFromStart}px` }}
            >
              <span className="ml-12 h-2 w-2 rounded-full bg-red-500" />
              <span className="h-px flex-1 bg-red-500" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.4: Run test to verify it passes**

Run: `pnpm test src/components/calendar/__tests__/DayViewMobile.test.tsx`
Expected: 5 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/components/calendar/DayViewMobile.tsx src/components/calendar/__tests__/DayViewMobile.test.tsx
git commit -m "feat(agenda): add DayViewMobile — vertical hourly timeline with all-day band"
```

---

## Task 6 — `CalendarFiltersSheet` component

**Files:**
- Create: `src/components/calendar/CalendarFiltersSheet.tsx`
- Create: `src/components/calendar/__tests__/CalendarFiltersSheet.test.tsx`

- [ ] **Step 6.1: Write the failing test**

Create `src/components/calendar/__tests__/CalendarFiltersSheet.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CalendarFiltersSheet } from '../CalendarFiltersSheet';

vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (o: boolean) => void; children: React.ReactNode }) =>
    open ? (
      <div data-testid="rd-root">
        <button type="button" aria-label="close-rd" onClick={() => onOpenChange(false)}>x</button>
        {children}
      </div>
    ) : null,
  ResponsiveDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../CalendarFilters', () => ({
  CalendarFilters: () => <div data-testid="calendar-filters-inline">filters</div>,
}));

describe('CalendarFiltersSheet', () => {
  afterEach(() => cleanup());

  it('renders nothing when closed', () => {
    const { container } = render(
      <CalendarFiltersSheet
        open={false}
        onOpenChange={vi.fn()}
        enabledCategories={new Set()}
        onToggleCategory={vi.fn()}
        advancedFilters={{ source: 'all', interactivity: 'all', actionableOnly: false }}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    expect(container.textContent).toBe('');
  });

  it('renders CalendarFilters when open', () => {
    render(
      <CalendarFiltersSheet
        open={true}
        onOpenChange={vi.fn()}
        enabledCategories={new Set()}
        onToggleCategory={vi.fn()}
        advancedFilters={{ source: 'all', interactivity: 'all', actionableOnly: false }}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('calendar-filters-inline')).toBeTruthy();
  });

  it('forwards close to onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(
      <CalendarFiltersSheet
        open={true}
        onOpenChange={onOpenChange}
        enabledCategories={new Set()}
        onToggleCategory={vi.fn()}
        advancedFilters={{ source: 'all', interactivity: 'all', actionableOnly: false }}
        onAdvancedFiltersChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('close-rd'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

Run: `pnpm test src/components/calendar/__tests__/CalendarFiltersSheet.test.tsx`
Expected: FAIL with module resolution error.

- [ ] **Step 6.3: Implement the component**

Create `src/components/calendar/CalendarFiltersSheet.tsx`:

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
import { CalendarFilters, type AdvancedAgendaFilters } from './CalendarFilters';

interface CalendarFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  advancedFilters: AdvancedAgendaFilters;
  onAdvancedFiltersChange: (filters: AdvancedAgendaFilters) => void;
}

export function CalendarFiltersSheet({
  open,
  onOpenChange,
  enabledCategories,
  onToggleCategory,
  advancedFilters,
  onAdvancedFiltersChange,
}: CalendarFiltersSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogHeader title="Filtros" onClose={() => onOpenChange(false)} />
      <ResponsiveDialogBody>
        <CalendarFilters
          enabledCategories={enabledCategories}
          onToggleCategory={onToggleCategory}
          advancedFilters={advancedFilters}
          onAdvancedFiltersChange={onAdvancedFiltersChange}
        />
      </ResponsiveDialogBody>
    </ResponsiveDialog>
  );
}
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `pnpm test src/components/calendar/__tests__/CalendarFiltersSheet.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/components/calendar/CalendarFiltersSheet.tsx src/components/calendar/__tests__/CalendarFiltersSheet.test.tsx
git commit -m "feat(agenda): add CalendarFiltersSheet wrapper for mobile filter access"
```

---

## Task 7 — Migrate `AgendaItemSheet` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/calendar/AgendaItemSheet.tsx`
- Modify: `src/components/calendar/__tests__/AgendaItemSheet.test.tsx`

- [ ] **Step 7.1: Read the existing component and test**

Read: `src/components/calendar/AgendaItemSheet.tsx` and `src/components/calendar/__tests__/AgendaItemSheet.test.tsx`
Note which shadcn components are currently used (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`).

- [ ] **Step 7.2: Update the component to use `ResponsiveDialog`**

In `src/components/calendar/AgendaItemSheet.tsx`:

1. Replace the top-level imports from `@/components/ui/sheet` with:

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
```

2. Change the outer render wrapper:

**Before:**
```tsx
<Sheet open={open} onOpenChange={(v) => !v && onClose()}>
  <SheetContent side="right" className="...">
    <SheetHeader>...</SheetHeader>
    {/* body content */}
  </SheetContent>
</Sheet>
```

**After:**
```tsx
<ResponsiveDialog open={open} onOpenChange={(v) => !v && onClose()}>
  <ResponsiveDialogHeader
    title={item.title}
    description={item.subtitle ?? undefined}
    onClose={onClose}
  />
  <ResponsiveDialogBody>
    {/* existing body content — badges, icons, CTAs — all unchanged */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

3. Remove any now-unused `SheetHeader`/`SheetTitle`/`SheetDescription` references inside the body. The title is already rendered by `ResponsiveDialogHeader` — delete the duplicate.

- [ ] **Step 7.3: Update the existing test to mock `ResponsiveDialog`**

In `src/components/calendar/__tests__/AgendaItemSheet.test.tsx`, add at the top of the file (before the first `vi.mock` that already exists):

```tsx
vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="rd-root">{children}</div> : null,
  ResponsiveDialogHeader: ({
    title,
    description,
    onClose,
  }: {
    title: string;
    description?: string;
    onClose?: () => void;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      <button type="button" onClick={onClose}>Fechar</button>
    </div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

Remove the old `vi.mock('@/components/ui/sheet', ...)` if present — the test now goes through ResponsiveDialog.

- [ ] **Step 7.4: Run the test suite**

Run: `pnpm test src/components/calendar/__tests__/AgendaItemSheet.test.tsx`
Expected: all existing assertions pass. If any assertion inspects the Sheet DOM (e.g. `data-testid="sheet-content"`), update it to look for text/roles inside `ResponsiveDialog` (e.g. `screen.getByRole('heading', { name: item.title })`).

- [ ] **Step 7.5: Commit**

```bash
git add src/components/calendar/AgendaItemSheet.tsx src/components/calendar/__tests__/AgendaItemSheet.test.tsx
git commit -m "refactor(agenda): migrate AgendaItemSheet to ResponsiveDialog (fixes mobile portal freeze)"
```

---

## Task 8 — Migrate `CreateEventDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/calendar/CreateEventDialog.tsx`
- Modify: `src/components/calendar/__tests__/CreateEventDialog.test.tsx`

- [ ] **Step 8.1: Read the existing component and test**

Read: `src/components/calendar/CreateEventDialog.tsx` and `src/components/calendar/__tests__/CreateEventDialog.test.tsx`.

- [ ] **Step 8.2: Update component imports**

Replace any `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` imports from `@/components/ui/dialog` with:

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
```

- [ ] **Step 8.3: Swap the dialog wrapper**

**Before:**
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Novo Evento</DialogTitle>
    </DialogHeader>
    {/* form body */}
  </DialogContent>
</Dialog>
```

**After:**
```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
  <ResponsiveDialogHeader
    title="Novo Evento"
    onClose={() => onOpenChange(false)}
  />
  <ResponsiveDialogBody>
    {/* existing form body */}
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

- [ ] **Step 8.4: Update the test to mock `ResponsiveDialog`**

Replace the existing `vi.mock('@/components/ui/dialog', ...)` with:

```tsx
vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="rd-root">{children}</div> : null,
  ResponsiveDialogHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div><h2>{title}</h2><button type="button" onClick={onClose}>Fechar</button></div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

- [ ] **Step 8.5: Run the test**

Run: `pnpm test src/components/calendar/__tests__/CreateEventDialog.test.tsx`
Expected: all existing assertions pass. Update any DOM-specific selectors (e.g. `screen.getByTestId('dialog-content')`) to match the new structure.

- [ ] **Step 8.6: Commit**

```bash
git add src/components/calendar/CreateEventDialog.tsx src/components/calendar/__tests__/CreateEventDialog.test.tsx
git commit -m "refactor(agenda): migrate CreateEventDialog to ResponsiveDialog"
```

---

## Task 9 — Migrate `OwnershipPageChooserDialog` to `ResponsiveDialog`

**Files:**
- Modify: `src/components/calendar/OwnershipChooser.tsx`
- Modify: any test file that renders `OwnershipPageChooserDialog` (find via `pnpm test OwnershipChooser` or grep for the symbol)

- [ ] **Step 9.1: Read the existing file**

Read: `src/components/calendar/OwnershipChooser.tsx` (look for the `OwnershipPageChooserDialog` export). Identify the underlying dialog primitive.

- [ ] **Step 9.2: Swap to `ResponsiveDialog`**

In `src/components/calendar/OwnershipChooser.tsx`:

1. Remove the existing `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` imports from `@/components/ui/dialog` (keep everything else).

2. Add:

```tsx
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
} from '@/components/ui/responsive-dialog';
```

3. Replace the outer render of `OwnershipPageChooserDialog`:

**Before (typical shape):**
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Tipo de evento</DialogTitle>
    </DialogHeader>
    <div className="grid gap-3 sm:grid-cols-2">
      <button onClick={() => onChoose('financial')}>Financeiro</button>
      <button onClick={() => onChoose('personal')}>Pessoal</button>
    </div>
  </DialogContent>
</Dialog>
```

**After:**
```tsx
<ResponsiveDialog open={open} onOpenChange={onOpenChange} className="max-w-md">
  <ResponsiveDialogHeader
    title="Tipo de evento"
    description="O que você quer criar?"
    onClose={() => onOpenChange(false)}
  />
  <ResponsiveDialogBody>
    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
      <button type="button" onClick={() => onChoose('financial')}>Financeiro</button>
      <button type="button" onClick={() => onChoose('personal')}>Pessoal</button>
    </div>
  </ResponsiveDialogBody>
</ResponsiveDialog>
```

Preserve the existing button styling classes verbatim — only the outer wrapper and the header slot change.

- [ ] **Step 9.3: Find and update tests**

Run: `pnpm test OwnershipChooser`

If a test file exists (e.g. `src/components/calendar/__tests__/OwnershipChooser.test.tsx`), replace any `vi.mock('@/components/ui/dialog', ...)` with:

```tsx
vi.mock('@/components/ui/responsive-dialog', () => ({
  ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="rd-root">{children}</div> : null,
  ResponsiveDialogHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div><h2>{title}</h2><button type="button" onClick={onClose}>Fechar</button></div>
  ),
  ResponsiveDialogBody: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

If no test exists, skip to Step 9.4.

- [ ] **Step 9.4: Run the calendar test folder**

Run: `pnpm test src/components/calendar/`
Expected: all tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add src/components/calendar/OwnershipChooser.tsx
git commit -m "refactor(agenda): migrate OwnershipPageChooserDialog to ResponsiveDialog"
```

---

## Task 10 — Wire everything into `CalendarPage`

**Files:**
- Modify: `src/pages/CalendarPage.tsx`
- Modify: `src/pages/CalendarPage.layout.test.tsx`

- [ ] **Step 10.1: Update `CalendarPage.tsx` state and imports**

Add near the top, next to existing imports:

```tsx
import { Filter } from 'lucide-react';
import { useAgendaViewMode, type CalendarViewMode } from '@/hooks/useAgendaViewMode';
import { MonthGridMobile } from '@/components/calendar/MonthGridMobile';
import { WeekStrip } from '@/components/calendar/WeekStrip';
import { DayViewMobile } from '@/components/calendar/DayViewMobile';
import { AgendaDayList } from '@/components/calendar/AgendaDayList';
import { CalendarFiltersSheet } from '@/components/calendar/CalendarFiltersSheet';
```

Replace the existing local `CalendarViewMode` declaration:

```tsx
export type CalendarViewMode = 'month' | 'week' | 'day';
```

with a re-export from the hook (preserves any external imports of the type from `CalendarPage`):

```tsx
export type { CalendarViewMode } from '@/hooks/useAgendaViewMode';
```

Then replace:

```tsx
const [view, setView] = useState<CalendarViewMode>('month');
```

with:

```tsx
const [view, setView] = useAgendaViewMode('month');
```

Remove the now-unused `useState` import only if no other state call uses it.

Add new state:

```tsx
const [focusedDay, setFocusedDay] = useState<Date>(() => new Date());
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
```

- [ ] **Step 10.2: Keep `focusedDay` inside the anchor's window**

Inside `CalendarPage`, add an effect that snaps `focusedDay` whenever `anchor` or `view` changes such that the focus still lives in the visible range:

```tsx
useEffect(() => {
  const { from, to } = getAgendaWindow(anchor, view);
  const start = new Date(from);
  const end = new Date(to);
  if (focusedDay < start || focusedDay > end) {
    setFocusedDay(anchor);
  }
}, [anchor, view, focusedDay]);
```

- [ ] **Step 10.3: Add the filter button to the header actions**

Update the `actions` prop of `<Header>`:

```tsx
actions={
  <div className="flex items-center gap-2">
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setFilterSheetOpen(true)}
      aria-label="Filtros"
      className="lg:hidden h-10 w-10 rounded-xl"
    >
      <Filter className="h-5 w-5" />
    </Button>
    <Button
      onClick={handleHeaderNew}
      className="gap-2 rounded-xl bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(var(--primary),0.35)] hover:shadow-[0_6px_20px_rgba(var(--primary),0.45)]"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Novo Evento</span>
    </Button>
  </div>
}
```

- [ ] **Step 10.4: Hide the inline `CalendarFilters` on mobile and mount the sheet**

Replace the existing `<CalendarFilters …/>` usage with:

```tsx
<div className="hidden lg:block">
  <CalendarFilters
    className="mb-6"
    enabledCategories={enabledCategories}
    onToggleCategory={toggleCategory}
    advancedFilters={advancedFilters}
    onAdvancedFiltersChange={setAdvancedFilters}
  />
</div>

<CalendarFiltersSheet
  open={filterSheetOpen}
  onOpenChange={setFilterSheetOpen}
  enabledCategories={enabledCategories}
  onToggleCategory={toggleCategory}
  advancedFilters={advancedFilters}
  onAdvancedFiltersChange={setAdvancedFilters}
/>
```

- [ ] **Step 10.5: Dual-render the view bodies**

Replace the existing `AnimatePresence`/view-switch block with:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={`${view}-${anchor.toISOString()}`}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.18 }}
  >
    {/* Desktop: lg:block */}
    <div className="hidden lg:block">
      {view === 'month' && (
        <MonthView
          anchor={anchor}
          items={items}
          isLoading={isLoading}
          onDayClick={handleMonthDayClick}
          onItemClick={handleItemClick}
        />
      )}
      {view === 'week' && (
        <WeekView
          anchor={anchor}
          items={items}
          isLoading={isLoading}
          onItemClick={handleItemClick}
          onEmptySlotClick={handleWeekEmptySlot}
        />
      )}
      {view === 'day' && (
        <DayView
          anchor={anchor}
          items={items}
          isLoading={isLoading}
          onItemClick={handleItemClick}
          onEmptySlotClick={handleWeekEmptySlot}
        />
      )}
    </div>

    {/* Mobile: lg:hidden */}
    <div className="lg:hidden">
      {view === 'month' && (
        <>
          <MonthGridMobile
            anchor={anchor}
            items={items}
            focusedDay={focusedDay}
            onDayFocus={setFocusedDay}
            onMonthChange={setAnchor}
            isLoading={isLoading}
          />
          <AgendaDayList
            items={items}
            focusedDay={focusedDay}
            onItemClick={handleItemClick}
          />
        </>
      )}
      {view === 'week' && (
        <>
          <WeekStrip
            anchor={anchor}
            items={items}
            focusedDay={focusedDay}
            onDayFocus={setFocusedDay}
          />
          <AgendaDayList
            items={items}
            focusedDay={focusedDay}
            onItemClick={handleItemClick}
          />
        </>
      )}
      {view === 'day' && (
        <DayViewMobile
          anchor={anchor}
          items={items}
          isLoading={isLoading}
          onItemClick={handleItemClick}
          onEmptySlotClick={handleWeekEmptySlot}
        />
      )}
    </div>
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 10.6: Update the layout test to cover both paths**

Replace `src/pages/CalendarPage.layout.test.tsx` with:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/useCalendarAgenda', () => ({
  useCalendarAgenda: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
}));

vi.mock('@/lib/ticktick-sync', () => ({
  requestTickTickSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/calendar/MonthView', () => ({
  MonthView: () => <div data-testid="month-view-desktop" />,
}));

vi.mock('@/components/calendar/WeekView', () => ({
  WeekView: () => <div data-testid="week-view-desktop" />,
}));

vi.mock('@/components/calendar/DayView', () => ({
  DayView: () => <div data-testid="day-view-desktop" />,
}));

vi.mock('@/components/calendar/MonthGridMobile', () => ({
  MonthGridMobile: () => <div data-testid="month-grid-mobile" />,
}));

vi.mock('@/components/calendar/WeekStrip', () => ({
  WeekStrip: () => <div data-testid="week-strip-mobile" />,
}));

vi.mock('@/components/calendar/DayViewMobile', () => ({
  DayViewMobile: () => <div data-testid="day-view-mobile" />,
}));

vi.mock('@/components/calendar/AgendaDayList', () => ({
  AgendaDayList: () => <div data-testid="agenda-day-list" />,
}));

vi.mock('@/components/calendar/AgendaItemSheet', () => ({
  AgendaItemSheet: () => null,
}));

vi.mock('@/components/calendar/CreateEventDialog', () => ({
  CreateEventDialog: () => null,
}));

vi.mock('@/components/calendar/OwnershipChooser', () => ({
  OwnershipPageChooserDialog: () => null,
}));

vi.mock('@/components/calendar/CalendarFiltersSheet', () => ({
  CalendarFiltersSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="filter-sheet-open" /> : null,
}));

vi.mock('@/components/calendar/CalendarFilters', () => ({
  CalendarFilters: () => <div data-testid="calendar-filters-inline" />,
  AdvancedAgendaFilters: {},
}));

import { CalendarPage } from './CalendarPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>,
  );
}

describe('CalendarPage layout', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('dual-renders month view for desktop and mobile in the DOM', () => {
    renderPage();
    expect(screen.getByTestId('month-view-desktop')).toBeTruthy();
    expect(screen.getByTestId('month-grid-mobile')).toBeTruthy();
    expect(screen.getByTestId('agenda-day-list')).toBeTruthy();
  });

  it('opens the filter sheet when the filter button is tapped', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('Filtros'));
    expect(screen.getByTestId('filter-sheet-open')).toBeTruthy();
  });

  it('persists the selected view mode via localStorage', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^dia$/i }));
    expect(window.localStorage.getItem('agenda-view-mode')).toBe('day');
    expect(screen.getByTestId('day-view-desktop')).toBeTruthy();
    expect(screen.getByTestId('day-view-mobile')).toBeTruthy();
  });

  it('reads the persisted view mode on mount', () => {
    window.localStorage.setItem('agenda-view-mode', 'week');
    renderPage();
    expect(screen.getByTestId('week-view-desktop')).toBeTruthy();
    expect(screen.getByTestId('week-strip-mobile')).toBeTruthy();
  });
});
```

- [ ] **Step 10.7: Run the full calendar + page test suite**

Run: `pnpm test src/pages/CalendarPage src/components/calendar src/hooks/__tests__/useAgendaViewMode`
Expected: all tests pass. Fix any cascading failures by tightening mocks in individual test files.

- [ ] **Step 10.8: Commit**

```bash
git add src/pages/CalendarPage.tsx src/pages/CalendarPage.layout.test.tsx
git commit -m "feat(agenda): dual-render desktop + mobile layouts in CalendarPage"
```

---

## Task 11 — Manual verification

**Goal:** Eyeball the page in 3 viewports and confirm acceptance criteria.

- [ ] **Step 11.1: Start the dev server**

Run: `pnpm dev`
Expected: Vite serves on `http://localhost:5173` (or similar).

- [ ] **Step 11.2: Verify at desktop (1440×900)**

- Navigate to `/agenda`.
- Toggle Mês/Semana/Dia — each renders the existing desktop view (MonthView/WeekView/DayView). Pixel-identical to pre-plan state.
- Reload the page — the last selected mode persists.
- No mobile components visible.

- [ ] **Step 11.3: Verify at iPhone SE (375×667)**

Use DevTools → Responsive → iPhone SE.

- **Modo Mês**: compact grid with weekday headers, today highlighted blue, dots on days with events. Tap a day → list below updates. Tap an event → `ResponsiveDialog` opens as mobile overlay (not a frozen screen).
- **Modo Semana**: 7-day strip at top, tap a day → list updates. Prev/next in header changes the week.
- **Modo Dia**: vertical hourly timeline, red now-line if today, auto-scrolled to now. Tap a slot → chooser dialog → create event. Tap an event → detail sheet.
- Tap the filter icon → `CalendarFiltersSheet` opens as full-screen overlay. Toggle a category → list updates. Tap X → closes cleanly.
- Tap the "+" (Plus) icon in the header (no "Novo Evento" label visible) → chooser → form.
- No horizontal scroll at any point.
- No frozen screens: after closing any dialog you can still scroll and tap.

- [ ] **Step 11.4: Verify at tablet portrait (768×1024)**

Same mobile behavior as Step 11.3 (since `lg:` = 1024px and tablet-portrait is below that).

- [ ] **Step 11.5: Record findings**

Append an "Execution Log" section to the bottom of this plan (new H2 heading) with: date, commits created (sha + title), viewports checked, deviations from plan, any manual fixes.

- [ ] **Step 11.6: Commit the log + close out**

```bash
git add docs/superpowers/plans/2026-04-21-agenda-mobile-plan7.md
git commit -m "docs(plan7): record manual verification of agenda mobile"
```

---

## Definition of done

- All 11 tasks executed and committed.
- `pnpm test` green on all new and modified test files.
- Desktop layout pixel-identical at 1440×900 (visual comparison vs `main`).
- Mobile works at 375×667 and 768×1024: 3 view modes, persistence, filter sheet, event detail sheet, create-event flow — all without freezing.
- View mode persists across reload via `localStorage["agenda-view-mode"]`.
- Zero new dependencies.
- Existing `useCalendarAgenda` RPC and `AgendaItem` types unchanged.

---

## Execution Log

**Date**: 2026-04-21
**Branch**: `feat/agenda-mobile-plan7` (17 commits ahead of `main`)
**Execution mode**: subagent-driven-development (Claude Sonnet 4.6 for implementation/review, Claude Haiku 4.5 for mechanical tasks)

### Commits

| # | SHA | Description |
|---|---|---|
| 1 | `615531b` | feat(agenda): add useAgendaViewMode hook with localStorage persistence |
| 2 | `2bc2219` | feat(agenda): add AgendaDayList — focused-day event list for mobile |
| 2b | `cdb2bd6` | fix(agenda): restore plan-specified header format with weekday |
| 3 | `0a78aa3` | feat(agenda): add MonthGridMobile with dot indicators for mobile month view |
| 4 | `f6a248f` | feat(agenda): add WeekStrip — 7-day horizontal strip for mobile week view |
| 5 | `71c4456` | feat(agenda): add DayViewMobile — vertical hourly timeline with all-day band |
| 6 | `541d948` | feat(agenda): add CalendarFiltersSheet wrapper for mobile filter access |
| 7 | `7dec6e4` | refactor(agenda): migrate AgendaItemSheet to ResponsiveDialog |
| 8 | `b4a162f` | refactor(agenda): migrate CreateEventDialog to ResponsiveDialog |
| 9 | `91b9a60` | refactor(agenda): migrate OwnershipPageChooserDialog to ResponsiveDialog |
| 10 | `fc5659d` | feat(agenda): dual-render desktop + mobile layouts in CalendarPage |

### Polish commits (post user review)

| # | SHA | Trigger |
|---|---|---|
| P1 | `b69f27e` | feat(ui): add reusable SlidingPillTabs component |
| P2 | `b6d61e2` | refactor(agenda): use SlidingPillTabs for view mode selector |
| P3 | `5c4a8f3` | refactor(cards): use SlidingPillTabs for mobile tab bar (DRY) |
| P4 | `a135eec` | style(agenda): event cards in day list with tinted bg + left-border accent |
| P5 | `c810d9c` | refactor(agenda): CalendarFiltersSheet as bottom sheet with slide-up animation |
| P6 | `ef7c04b` | style(agenda): breathing room between hour labels and event cards in DayViewMobile |

### User-driven adjustments captured

1. **`SlidingPillTabs` extraction** — the original plan used shadcn `ToggleGroup` for Mês/Semana/Dia. User noted the pills felt cramped and asked for the sliding-pill pattern from CreditCards. We extracted a reusable `src/components/ui/sliding-pill-tabs.tsx` and applied it to both Agenda and CreditCards (DRY win).
2. **Event card style in AgendaDayList** — user wanted the list items on Mês/Semana to match the colored-card look of DayViewMobile. Updated to tinted background + left-border accent.
3. **Filter UX as bottom sheet** — user rejected the full-screen `ResponsiveDialog` for filters ("looks like a new page"). Rebuilt `CalendarFiltersSheet` as a proper bottom sheet with slide-up animation and dimmed backdrop.
4. **DayViewMobile spacing** — user noted cards were too close to the hour labels. Bumped `left-14 → left-20`, increased card padding to `px-3 py-1.5`, aligned now-line offset.

### Automated verification

- New unit tests: 34 new tests across `useAgendaViewMode`, `AgendaDayList`, `MonthGridMobile`, `WeekStrip`, `DayViewMobile`, `CalendarFiltersSheet`, `SlidingPillTabs`, `CalendarPage.layout.test`.
- Calendar folder full suite: 142/142 passing.
- Full suite: same 8 pre-existing `CalendarPage` /`ticktick-sync-closure` failures as on `main` (unrelated to this plan).

### Category slug discovery (implementation-time)

The spec assumed slugs `events | payable | reminders | external`. In reality `getAgendaItemFilterCategory` returns `personal | work | mentoring | financial | external`. All new components (`AgendaDayList`, `MonthGridMobile`, `WeekStrip`, `DayViewMobile`) use the real slugs. Color mapping settled on:

- personal → blue-500
- work → purple-500
- mentoring → amber-500
- financial → red-500
- external → slate-500

### Deviations from the original plan

- **`SlidingPillTabs` component** was not in the plan — added post-review.
- **Bottom-sheet filter** replaced the ResponsiveDialog approach — the spec said "ícone no header → bottom sheet" but the plan reused ResponsiveDialog; user correctly pointed out that ResponsiveDialog mobile path is full-screen and doesn't match the spec's intent.
- **Visual polish on AgendaDayList and DayViewMobile** was added after user review (cards, spacing).
- **No swipe gestures** — confirmed Q12 (out-of-MVP) decision held; navigation stays on `‹ ›` buttons.

### Manual verification pending (USER ACTION)

Required checks before merging:
- [ ] Desktop (1440×900): MonthView/WeekView/DayView pixel-identical to `main`. Sidebar filters inline. No mobile chrome.
- [ ] Tablet portrait (768×1024): 3 modes work, bottom-sheet filters, event detail opens cleanly.
- [ ] Phone (375×667): all 3 modes, localStorage persists mode across reload, filter sheet slides from bottom, event detail cleanly opens/closes, create-event (`+` in header) opens chooser → form.
- [ ] No horizontal scroll at 320/375/768/1024/1440.
- [ ] Back button works across modes.
