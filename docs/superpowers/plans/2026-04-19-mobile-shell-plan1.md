# Mobile Shell Infrastructure — Plan 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the mobile navigation shell (bottom nav, FAB, "Mais" sheet, Ana Clara stub screen) on top of the existing Finance LA codebase, with zero visual change on desktop (≥ 1024px) and a working mobile experience on phones and tablets.

**Architecture:** Extract a single `src/config/navigation.ts` as source of truth for menu items. Refactor `Sidebar.tsx` to consume it (visual identical on desktop; hidden on mobile). Build `BottomNav`, `MoreSheet`, `QuickCreateFab`, and `AnaClaraStubScreen` components, each gated behind `lg:hidden`. Add `useKeyboardInset` hook (unit-tested, prepared for Plan 2). Orchestrate everything in `MainLayout.tsx`. Optimize the Ana Clara avatar into size-appropriate WebP/PNG variants.

**Tech Stack:** React 18, TypeScript, React Router v6, Tailwind CSS (shadcn/ui components), Zustand (`useUIStore`), Vitest + @testing-library/react (jsdom), Lucide icons, sharp (dev-only, for image optimization).

**Spec:** [docs/superpowers/specs/2026-04-19-mobile-first-responsive-redesign.md](../specs/2026-04-19-mobile-first-responsive-redesign.md)

**Deviation from spec §8.2:** No feature flag. Each task is an atomic commit; rollback is `git revert <sha>`. Feature flag would require a dual-mode Sidebar, adding complexity with no benefit.

### Out of scope for Plan 1 (deferred to per-page plans)

- **Mobile top header** (the `≡ Finance LA  👤` strip shown in spec §4.1 wireframe). Each page currently renders its own heading; the mobile header is added/unified when each page is adapted. The `ReactNode` slot is stable now (Outlet inside `<main>`), so future page plans can introduce a shared `<MobileHeader>` without touching the shell.
- **Profile access via avatar tap** (spec §10.4). Needs a `<MobileHeader>` to hang the avatar on. Ships with the first page plan that needs it (likely Dashboard, Plan 3).
- Every page-specific layout adaptation (tables → cards, etc.) — Plans 3..N.

---

## Task 1 — Image optimization: generate Ana Clara avatar variants

**Goal:** Reduce the 4396×3808 10 MB `ana-clara-avatar.png` to 512×512 and 128×128 variants (WebP + PNG fallback), all under 30 KB.

**Files:**
- Create: `scripts/optimize-ana-clara-avatar.mjs`
- Modify: `package.json` (add `sharp` dev dependency + `images:optimize` script)
- Create (via script): `public/ana-clara-avatar-512.webp`, `public/ana-clara-avatar-512.png`, `public/ana-clara-avatar-128.webp`, `public/ana-clara-avatar-128.png`

- [ ] **Step 1.1: Add sharp as a dev dependency**

Run: `pnpm add -D sharp`
Expected: `sharp` appears under `devDependencies` in `package.json`.

- [ ] **Step 1.2: Create the optimization script**

Write `scripts/optimize-ana-clara-avatar.mjs`:

```javascript
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = resolve('public/ana-clara-avatar.png');
const PUBLIC_DIR = resolve('public');

if (!existsSync(SOURCE)) {
  console.error(`Source not found: ${SOURCE}`);
  process.exit(1);
}

const SIZES = [512, 128];

async function optimize() {
  for (const size of SIZES) {
    const webpOut = resolve(PUBLIC_DIR, `ana-clara-avatar-${size}.webp`);
    const pngOut = resolve(PUBLIC_DIR, `ana-clara-avatar-${size}.png`);

    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', position: 'top' })
      .webp({ quality: 82 })
      .toFile(webpOut);

    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', position: 'top' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(pngOut);

    console.log(`✓ ${size}×${size} → webp + png`);
  }
}

optimize().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 1.3: Add the npm script to package.json**

In `package.json` scripts, add:

```json
"images:optimize": "node scripts/optimize-ana-clara-avatar.mjs"
```

- [ ] **Step 1.4: Run the script**

Run: `pnpm run images:optimize`
Expected stdout:
```
✓ 512×512 → webp + png
✓ 128×128 → webp + png
```

- [ ] **Step 1.5: Verify the variants exist and are small**

Run: `ls -la public/ana-clara-avatar-*`
Expected: four new files, each under 30 KB.

- [ ] **Step 1.6: Commit**

```bash
git add scripts/optimize-ana-clara-avatar.mjs package.json pnpm-lock.yaml public/ana-clara-avatar-128.webp public/ana-clara-avatar-128.png public/ana-clara-avatar-512.webp public/ana-clara-avatar-512.png
git commit -m "chore(images): generate Ana Clara avatar variants (128/512, webp+png)"
```

---

## Task 2 — Extract navigation config

**Goal:** Single source of truth for menu items consumed by Sidebar, BottomNav, and MoreSheet. No behavior change yet.

**Files:**
- Create: `src/config/navigation.ts`
- Create: `src/config/__tests__/navigation.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `src/config/__tests__/navigation.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  primaryMenuItems,
  moreMenuItems,
  quickCreateItems,
  bottomNavItems,
} from '../navigation';

describe('navigation config', () => {
  it('exposes exactly 11 primary menu items', () => {
    expect(primaryMenuItems).toHaveLength(11);
  });

  it('every primary item has path, label, and icon', () => {
    for (const item of primaryMenuItems) {
      expect(item.path).toMatch(/^\//);
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon).toBeTypeOf('object');
    }
  });

  it('exposes the 3 "more" menu items', () => {
    expect(moreMenuItems.map((i) => i.path)).toEqual(['/tags', '/categorias', '/configuracoes']);
  });

  it('exposes the 5 quick-create actions', () => {
    expect(quickCreateItems.map((i) => i.action)).toEqual([
      'expense',
      'income',
      'card-expense',
      'transfer',
      'payable-bill',
    ]);
  });

  it('bottomNavItems is exactly 5 entries with the 🤖 ana-clara in position 3', () => {
    expect(bottomNavItems).toHaveLength(5);
    expect(bottomNavItems[2].kind).toBe('ana-clara');
    expect(bottomNavItems[4].kind).toBe('more');
  });

  it('bottomNavItems route entries point to existing primaryMenuItems', () => {
    const paths = new Set(primaryMenuItems.map((i) => i.path));
    for (const entry of bottomNavItems) {
      if (entry.kind === 'route') {
        expect(paths.has(entry.path)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2.2: Run the test to verify it fails**

Run: `pnpm test src/config/__tests__/navigation.test.ts`
Expected: FAIL with module resolution error ("Cannot find module '../navigation'").

- [ ] **Step 2.3: Create the config file**

Write `src/config/navigation.ts`:

```typescript
import {
  Home,
  Wallet,
  List,
  CreditCard,
  Receipt,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  GraduationCap,
  CalendarDays,
  Settings,
  Bot,
  MoreHorizontal,
  Tag,
  FolderTree,
  ArrowRightLeft,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export type QuickCreateAction =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'card-expense'
  | 'payable-bill';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export interface QuickCreateItem {
  icon: LucideIcon;
  label: string;
  action: QuickCreateAction;
}

export type BottomNavEntry =
  | { kind: 'route'; icon: LucideIcon; label: string; path: string }
  | { kind: 'ana-clara'; icon: LucideIcon; label: string }
  | { kind: 'more'; icon: LucideIcon; label: string };

export const primaryMenuItems: MenuItem[] = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Contas', path: '/contas' },
  { icon: List, label: 'Transações', path: '/transacoes' },
  { icon: ShieldCheck, label: 'Conciliação', path: '/conciliacao' },
  { icon: CreditCard, label: 'Cartões', path: '/cartoes' },
  { icon: Receipt, label: 'Contas a Pagar', path: '/contas-pagar' },
  { icon: CalendarDays, label: 'Agenda', path: '/agenda' },
  { icon: Target, label: 'Metas', path: '/metas' },
  { icon: TrendingUp, label: 'Investimentos', path: '/investimentos' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: GraduationCap, label: 'Educação', path: '/educacao' },
];

export const moreMenuItems: MenuItem[] = [
  { icon: Tag, label: 'Tags', path: '/tags' },
  { icon: FolderTree, label: 'Categorias', path: '/categorias' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export const quickCreateItems: QuickCreateItem[] = [
  { icon: TrendingDown, label: 'Despesa', action: 'expense' },
  { icon: TrendingUp, label: 'Receita', action: 'income' },
  { icon: CreditCard, label: 'Despesa cartão', action: 'card-expense' },
  { icon: ArrowRightLeft, label: 'Transferência', action: 'transfer' },
  { icon: Receipt, label: 'Conta a pagar', action: 'payable-bill' },
];

export const bottomNavItems: BottomNavEntry[] = [
  { kind: 'route', icon: Home, label: 'Início', path: '/' },
  { kind: 'route', icon: List, label: 'Lanç.', path: '/transacoes' },
  { kind: 'ana-clara', icon: Bot, label: 'Ana' },
  { kind: 'route', icon: Receipt, label: 'A Pagar', path: '/contas-pagar' },
  { kind: 'more', icon: MoreHorizontal, label: 'Mais' },
];

export const moreSheetItems: MenuItem[] = [
  ...primaryMenuItems.filter(
    (item) => !['/', '/transacoes', '/contas-pagar'].includes(item.path),
  ),
  ...moreMenuItems,
];
```

- [ ] **Step 2.4: Run the test to verify it passes**

Run: `pnpm test src/config/__tests__/navigation.test.ts`
Expected: 6 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/config/navigation.ts src/config/__tests__/navigation.test.ts
git commit -m "feat(nav): extract navigation config as single source of truth"
```

---

## Task 3 — Refactor Sidebar to consume the config + hide on mobile

**Goal:** Sidebar reads menu items from `navigation.ts`. Desktop visual stays pixel-identical. Mobile drawer behavior is removed (now BottomNav's job).

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 3.1: Verify the existing Sidebar test passes before refactor**

Run: `pnpm test src/components/layout/Sidebar.test.tsx`
Expected: existing `Sidebar footer` test passes.

- [ ] **Step 3.2: Edit Sidebar.tsx to import from config and hide on mobile**

In `src/components/layout/Sidebar.tsx`:

Replace the local `quickCreateItems`, `menuItems`, `moreOptionsItems` arrays (and their related icon imports) with:

```typescript
import {
  primaryMenuItems,
  moreMenuItems,
  quickCreateItems,
  type QuickCreateAction,
} from '@/config/navigation';
import {
  Wallet,
  Menu,
  X,
  Bot,
  MoreHorizontal,
  ChevronDown,
  Plus,
} from 'lucide-react';
```

(Keep only the icons actually used inside Sidebar: the brand `Wallet`, the toggle `Menu`/`X`, the Ana Clara `Bot`, the collapse `MoreHorizontal`/`ChevronDown`, and the "Novo" `Plus`. All menu item icons now come through the config objects.)

Rename in-component usages:
- `menuItems.map(...)` → `primaryMenuItems.map(...)`
- `moreOptionsItems.map(...)` → `moreMenuItems.map(...)`
- `quickCreateItems` usage stays as-is (now imported).

Change the root Fragment to hide on mobile. Wrap the whole return in:

```tsx
return (
  <div className="contents lg:contents max-lg:hidden">
    {/* … existing overlay, aside, hamburger, Ana Clara FAB … */}
  </div>
);
```

Within that wrapper, REMOVE the mobile-only overlay (`<div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden">`) and the hamburger button (`<button className="fixed left-4 top-4 z-30 … lg:hidden">`) — both are no longer needed on mobile since BottomNav replaces the drawer.

The `<aside>` stays (already visible on desktop via `lg:translate-x-0`).
The Ana Clara FAB (`<button>Bot</button>`) stays (desktop-only behavior unchanged).

Final structure:
```tsx
return (
  <div className="contents lg:contents max-lg:hidden">
    <aside>…</aside>
    <button onClick={() => setAnaCoachOpen(true)} className="fixed bottom-6 right-6 …">
      <Bot size={28} />
    </button>
  </div>
);
```

- [ ] **Step 3.3: Run the existing Sidebar test to confirm nothing broke**

Run: `pnpm test src/components/layout/Sidebar.test.tsx`
Expected: existing test still passes (visual props unchanged on desktop).

- [ ] **Step 3.4: Run the full test suite to catch any side effects**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "refactor(sidebar): consume navigation config, remove mobile drawer"
```

---

## Task 4 — Extend uiStore with `moreSheetOpen`

**Goal:** Add the store flag that `MoreSheet` will read.

**Files:**
- Modify: `src/store/uiStore.ts`
- Create: `src/store/__tests__/uiStore.test.ts` (if not existing)

- [ ] **Step 4.1: Write the failing test**

Create `src/store/__tests__/uiStore.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore.moreSheetOpen', () => {
  beforeEach(() => {
    useUIStore.setState({ moreSheetOpen: false });
  });

  it('defaults to false', () => {
    expect(useUIStore.getState().moreSheetOpen).toBe(false);
  });

  it('setMoreSheetOpen(true) flips it', () => {
    useUIStore.getState().setMoreSheetOpen(true);
    expect(useUIStore.getState().moreSheetOpen).toBe(true);
  });

  it('setMoreSheetOpen(false) resets', () => {
    useUIStore.getState().setMoreSheetOpen(true);
    useUIStore.getState().setMoreSheetOpen(false);
    expect(useUIStore.getState().moreSheetOpen).toBe(false);
  });
});
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `pnpm test src/store/__tests__/uiStore.test.ts`
Expected: FAIL — `setMoreSheetOpen is not a function`.

- [ ] **Step 4.3: Extend uiStore.ts**

In `src/store/uiStore.ts`, add to the `UIState` interface (between existing `activeQuickCreate` and the closing brace):

```typescript
  moreSheetOpen: boolean;
  setMoreSheetOpen: (open: boolean) => void;
```

In the `create` body, add:

```typescript
  moreSheetOpen: false,
  setMoreSheetOpen: (open) => set({ moreSheetOpen: open }),
```

- [ ] **Step 4.4: Run test to verify it passes**

Run: `pnpm test src/store/__tests__/uiStore.test.ts`
Expected: 3 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/store/uiStore.ts src/store/__tests__/uiStore.test.ts
git commit -m "feat(store): add moreSheetOpen flag to uiStore"
```

---

## Task 5 — Build `BottomNav` component (TDD)

**Goal:** Fixed bottom bar with 5 tabs from `bottomNavItems`. Tab click either navigates, opens Ana Clara, or opens MoreSheet.

**Files:**
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/components/layout/BottomNav.test.tsx`

- [ ] **Step 5.1: Write the failing test**

Create `src/components/layout/BottomNav.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockedSetAnaCoachOpen = vi.fn();
const mockedSetMoreSheetOpen = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    anaCoachOpen: false,
    moreSheetOpen: false,
    setAnaCoachOpen: mockedSetAnaCoachOpen,
    setMoreSheetOpen: mockedSetMoreSheetOpen,
  }),
}));

vi.mock('@/hooks/usePayableBills', () => ({
  usePayableBills: () => ({ summary: { overdue_count: 0 } }),
}));

import { BottomNav } from './BottomNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('renders exactly 5 tabs with role="tab"', () => {
    renderAt('/');
    expect(screen.getAllByRole('tab')).toHaveLength(5);
  });

  it('marks the Dashboard tab as aria-current when on /', () => {
    renderAt('/');
    const active = screen.getByRole('tab', { name: /início/i });
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('marks Transações tab as aria-current when on /transacoes', () => {
    renderAt('/transacoes');
    const active = screen.getByRole('tab', { name: /lanç/i });
    expect(active.getAttribute('aria-current')).toBe('page');
  });

  it('clicking the Ana Clara tab opens anaCoachOpen', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('tab', { name: /ana/i }));
    expect(mockedSetAnaCoachOpen).toHaveBeenCalledWith(true);
  });

  it('clicking the Mais tab opens moreSheetOpen', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('tab', { name: /mais/i }));
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(true);
  });

  it('is hidden at lg breakpoint (verified via class)', () => {
    renderAt('/');
    const nav = screen.getByRole('tablist');
    expect(nav.className).toContain('lg:hidden');
  });

  it('renders the PayableBills badge when there are overdue bills and we are not on /contas-pagar', () => {
    // Re-mock with overdue = 2
    vi.resetModules();
    vi.doMock('@/hooks/usePayableBills', () => ({
      usePayableBills: () => ({ summary: { overdue_count: 2 } }),
    }));
    // Re-import after remock
    return import('./BottomNav').then(({ BottomNav: Fresh }) => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <Fresh />
        </MemoryRouter>,
      );
      expect(screen.getByLabelText(/2 contas vencidas/i)).toBeTruthy();
    });
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

Run: `pnpm test src/components/layout/BottomNav.test.tsx`
Expected: FAIL with "Cannot find module './BottomNav'".

- [ ] **Step 5.3: Create the BottomNav component**

Write `src/components/layout/BottomNav.tsx`:

```tsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { bottomNavItems } from '@/config/navigation';
import { useUIStore } from '@/store/uiStore';
import { usePayableBills } from '@/hooks/usePayableBills';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { anaCoachOpen, moreSheetOpen, setAnaCoachOpen, setMoreSheetOpen } =
    useUIStore();
  const { summary } = usePayableBills({ status: ['pending', 'overdue'] });
  const overdueCount = summary?.overdue_count ?? 0;

  return (
    <nav
      role="tablist"
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden"
    >
      {bottomNavItems.map((item, index) => {
        const Icon = item.icon;
        let isActive = false;
        let onClick: (() => void) | undefined;
        let label = item.label;
        let ariaLabel = item.label;
        let badge: React.ReactNode = null;

        if (item.kind === 'route') {
          isActive = location.pathname === item.path && !anaCoachOpen && !moreSheetOpen;
          onClick = () => {
            setAnaCoachOpen(false);
            setMoreSheetOpen(false);
            navigate(item.path);
          };
          if (item.path === '/contas-pagar' && overdueCount > 0 && location.pathname !== '/contas-pagar') {
            badge = (
              <span
                aria-label={`${overdueCount} contas vencidas`}
                className="absolute -top-0.5 right-3 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
              >
                {overdueCount}
              </span>
            );
          }
        } else if (item.kind === 'ana-clara') {
          isActive = anaCoachOpen;
          onClick = () => {
            setMoreSheetOpen(false);
            setAnaCoachOpen(true);
          };
          ariaLabel = 'Ana Clara';
        } else {
          // 'more'
          isActive = moreSheetOpen;
          onClick = () => {
            setAnaCoachOpen(false);
            setMoreSheetOpen(true);
          };
          ariaLabel = 'Mais opções';
        }

        return (
          <button
            key={`${item.kind}-${index}`}
            role="tab"
            type="button"
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
            aria-label={ariaLabel}
            className={cn(
              'relative flex min-h-12 flex-col items-center justify-center gap-1 px-2 text-[11px] transition-colors',
              isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
            )}
          >
            <span className="relative">
              <Icon size={22} aria-hidden="true" />
              {badge}
            </span>
            <span className="leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5.4: Run test to verify it passes**

Run: `pnpm test src/components/layout/BottomNav.test.tsx`
Expected: all tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/components/layout/BottomNav.test.tsx
git commit -m "feat(layout): add BottomNav with 5 tabs (mobile only)"
```

---

## Task 6 — Build `MoreSheet` component (TDD)

**Goal:** Bottom sheet that lists the remaining 10 navigation targets in a 4-column grid. Opens when `moreSheetOpen === true`.

**Files:**
- Create: `src/components/layout/MoreSheet.tsx`
- Create: `src/components/layout/MoreSheet.test.tsx`

- [ ] **Step 6.1: Write the failing test**

Create `src/components/layout/MoreSheet.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockedSetMoreSheetOpen = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    moreSheetOpen: true,
    setMoreSheetOpen: mockedSetMoreSheetOpen,
  }),
}));

import { MoreSheet } from './MoreSheet';

describe('MoreSheet', () => {
  beforeEach(() => {
    mockedSetMoreSheetOpen.mockClear();
  });

  it('renders all 11 overflow items (8 primary not in bottom nav + 3 more)', () => {
    render(
      <MemoryRouter>
        <MoreSheet />
      </MemoryRouter>,
    );
    expect(screen.getByText('Contas')).toBeTruthy();
    expect(screen.getByText('Conciliação')).toBeTruthy();
    expect(screen.getByText('Cartões')).toBeTruthy();
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByText('Metas')).toBeTruthy();
    expect(screen.getByText('Investimentos')).toBeTruthy();
    expect(screen.getByText('Relatórios')).toBeTruthy();
    expect(screen.getByText('Educação')).toBeTruthy();
    expect(screen.getByText('Tags')).toBeTruthy();
    expect(screen.getByText('Categorias')).toBeTruthy();
    expect(screen.getByText('Configurações')).toBeTruthy();
  });

  it('closes when backdrop is clicked', () => {
    render(
      <MemoryRouter>
        <MoreSheet />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('more-sheet-backdrop'));
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(false);
  });

  it('closes when the close button is clicked', () => {
    render(
      <MemoryRouter>
        <MoreSheet />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(false);
  });

  it('closes when Escape is pressed', () => {
    render(
      <MemoryRouter>
        <MoreSheet />
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockedSetMoreSheetOpen).toHaveBeenCalledWith(false);
  });

  it('links each grid item to its path', () => {
    render(
      <MemoryRouter>
        <MoreSheet />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /conciliação/i }).getAttribute('href')).toBe('/conciliacao');
    expect(screen.getByRole('link', { name: /configurações/i }).getAttribute('href')).toBe('/configuracoes');
  });

  it('is hidden at lg breakpoint', () => {
    render(
      <MemoryRouter>
        <MoreSheet />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('more-sheet-root').className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 6.2: Run test to verify it fails**

Run: `pnpm test src/components/layout/MoreSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Create the MoreSheet component**

Write `src/components/layout/MoreSheet.tsx`:

```tsx
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { moreSheetItems } from '@/config/navigation';
import { useUIStore } from '@/store/uiStore';

export function MoreSheet() {
  const { moreSheetOpen, setMoreSheetOpen } = useUIStore();

  useEffect(() => {
    if (!moreSheetOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreSheetOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [moreSheetOpen, setMoreSheetOpen]);

  if (!moreSheetOpen) return null;

  return (
    <div data-testid="more-sheet-root" className="lg:hidden">
      <div
        data-testid="more-sheet-backdrop"
        onClick={() => setMoreSheetOpen(false)}
        className="fixed inset-0 z-40 bg-background/55 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mais opções"
        className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-50 max-h-[56dvh] overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 pb-6 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center justify-between pb-3">
          <div className="text-sm font-semibold text-foreground">Mais</div>
          <button
            type="button"
            onClick={() => setMoreSheetOpen(false)}
            aria-label="Fechar"
            className="rounded-full p-2 text-muted-foreground hover:bg-surface-elevated"
          >
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {moreSheetItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMoreSheetOpen(false)}
                className={cn(
                  'flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface-elevated px-2 py-3 text-center text-[11px] leading-tight text-foreground transition-colors',
                  'hover:border-primary/40 hover:bg-primary/5',
                )}
              >
                <Icon size={22} className="text-primary" aria-hidden="true" />
                <span className="line-clamp-2">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.4: Run test to verify it passes**

Run: `pnpm test src/components/layout/MoreSheet.test.tsx`
Expected: all tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/components/layout/MoreSheet.tsx src/components/layout/MoreSheet.test.tsx
git commit -m "feat(layout): add MoreSheet bottom sheet (mobile only)"
```

---

## Task 7 — Build `QuickCreateFab` component (TDD)

**Goal:** Green FAB with 5 quick-create actions (Despesa/Receita/Cartão/Transferência/Conta a Pagar). Expands a menu on tap; each option calls `openQuickCreate` with its action.

**Files:**
- Create: `src/components/layout/QuickCreateFab.tsx`
- Create: `src/components/layout/QuickCreateFab.test.tsx`

- [ ] **Step 7.1: Write the failing test**

Create `src/components/layout/QuickCreateFab.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockedOpenQuickCreate = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    anaCoachOpen: false,
    moreSheetOpen: false,
    openQuickCreate: mockedOpenQuickCreate,
  }),
}));

import { QuickCreateFab } from './QuickCreateFab';

describe('QuickCreateFab', () => {
  beforeEach(() => mockedOpenQuickCreate.mockClear());

  it('renders a primary FAB button with aria-label', () => {
    render(<QuickCreateFab />);
    expect(screen.getByRole('button', { name: /criar/i })).toBeTruthy();
  });

  it('is hidden at lg breakpoint', () => {
    render(<QuickCreateFab />);
    expect(screen.getByTestId('fab-root').className).toContain('lg:hidden');
  });

  it('toggles the menu open when clicked', () => {
    render(<QuickCreateFab />);
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(5);
  });

  it('fires openQuickCreate with the right action when a menu item is clicked', () => {
    render(<QuickCreateFab />);
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /despesa$/i }));
    expect(mockedOpenQuickCreate).toHaveBeenCalledWith('expense');
  });

  it('closes the menu after selecting an item', () => {
    render(<QuickCreateFab />);
    fireEvent.click(screen.getByRole('button', { name: /criar/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /receita/i }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('QuickCreateFab visibility', () => {
  it('does not render when anaCoachOpen is true', async () => {
    vi.resetModules();
    vi.doMock('@/store/uiStore', () => ({
      useUIStore: () => ({
        anaCoachOpen: true,
        moreSheetOpen: false,
        openQuickCreate: vi.fn(),
      }),
    }));
    const { QuickCreateFab: Fresh } = await import('./QuickCreateFab');
    render(<Fresh />);
    expect(screen.queryByTestId('fab-root')).toBeNull();
  });

  it('does not render when moreSheetOpen is true', async () => {
    vi.resetModules();
    vi.doMock('@/store/uiStore', () => ({
      useUIStore: () => ({
        anaCoachOpen: false,
        moreSheetOpen: true,
        openQuickCreate: vi.fn(),
      }),
    }));
    const { QuickCreateFab: Fresh } = await import('./QuickCreateFab');
    render(<Fresh />);
    expect(screen.queryByTestId('fab-root')).toBeNull();
  });
});
```

- [ ] **Step 7.2: Run test to verify it fails**

Run: `pnpm test src/components/layout/QuickCreateFab.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7.3: Create the component**

Write `src/components/layout/QuickCreateFab.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { quickCreateItems, type QuickCreateAction } from '@/config/navigation';
import { useUIStore } from '@/store/uiStore';

export function QuickCreateFab() {
  const { anaCoachOpen, moreSheetOpen, openQuickCreate } = useUIStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (anaCoachOpen || moreSheetOpen) return null;

  const select = (action: QuickCreateAction) => {
    openQuickCreate(action);
    setMenuOpen(false);
  };

  return (
    <div
      ref={rootRef}
      data-testid="fab-root"
      className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-4 z-30 lg:hidden"
    >
      {menuOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="mb-3 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2 shadow-xl"
        >
          {quickCreateItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.action}
                role="menuitem"
                type="button"
                onClick={() => select(item.action)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated"
              >
                <Icon size={18} className="text-emerald-500" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Fechar menu de criar' : 'Criar'}
        aria-expanded={menuOpen}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform',
          menuOpen ? 'rotate-45 bg-emerald-600' : 'bg-emerald-500 hover:bg-emerald-600',
        )}
      >
        {menuOpen ? <X size={24} aria-hidden="true" /> : <Plus size={26} aria-hidden="true" />}
      </button>
    </div>
  );
}
```

- [ ] **Step 7.4: Run test to verify it passes**

Run: `pnpm test src/components/layout/QuickCreateFab.test.tsx`
Expected: all tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add src/components/layout/QuickCreateFab.tsx src/components/layout/QuickCreateFab.test.tsx
git commit -m "feat(layout): add QuickCreateFab with 5-action menu (mobile only)"
```

---

## Task 8 — Build `useKeyboardInset` hook (TDD)

**Goal:** Returns the distance between the visual viewport and the layout viewport (non-zero when the virtual keyboard is open). Prepared for Plan 2 (real Ana Clara chat).

**Files:**
- Create: `src/hooks/useKeyboardInset.ts`
- Create: `src/hooks/__tests__/useKeyboardInset.test.ts`

- [ ] **Step 8.1: Write the failing test**

Create `src/hooks/__tests__/useKeyboardInset.test.ts`:

```typescript
/* @vitest-environment jsdom */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardInset } from '../useKeyboardInset';

interface FakeVV {
  height: number;
  offsetTop: number;
  dispatchEvent: (event: Event) => void;
  addEventListener: (type: string, fn: EventListener) => void;
  removeEventListener: (type: string, fn: EventListener) => void;
}

function makeFakeVisualViewport(height: number, offsetTop = 0): FakeVV {
  const target = new EventTarget();
  const listeners: Record<string, EventListener[]> = {};
  return {
    height,
    offsetTop,
    dispatchEvent: (e) => target.dispatchEvent(e),
    addEventListener: (type, fn) => {
      listeners[type] ??= [];
      listeners[type].push(fn);
      target.addEventListener(type, fn);
    },
    removeEventListener: (type, fn) => target.removeEventListener(type, fn),
  };
}

describe('useKeyboardInset', () => {
  let originalVV: unknown;

  beforeEach(() => {
    originalVV = (window as unknown as { visualViewport?: VisualViewport }).visualViewport;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVV });
  });

  it('returns 0 when visualViewport is not available', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('returns 0 when viewport heights match', () => {
    const fake = makeFakeVisualViewport(800, 0);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('returns the gap when keyboard opens', () => {
    const fake = makeFakeVisualViewport(800, 0);
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      fake.height = 500;
      fake.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(300);
  });

  it('clamps negative gaps to 0', () => {
    const fake = makeFakeVisualViewport(900, 50); // larger than innerHeight(800) — simulated
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { result } = renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);
  });

  it('cleans up listeners on unmount', () => {
    const fake = makeFakeVisualViewport(800, 0);
    const removeSpy = vi.spyOn(fake, 'removeEventListener');
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: fake });
    const { unmount } = renderHook(() => useKeyboardInset());
    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 8.2: Run test to verify it fails**

Run: `pnpm test src/hooks/__tests__/useKeyboardInset.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8.3: Create the hook**

Write `src/hooks/useKeyboardInset.ts`:

```typescript
import { useEffect, useState } from 'react';

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined;
    if (!vv) return;

    const update = () => {
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setInset(Math.max(0, gap));
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
}
```

- [ ] **Step 8.4: Run test to verify it passes**

Run: `pnpm test src/hooks/__tests__/useKeyboardInset.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add src/hooks/useKeyboardInset.ts src/hooks/__tests__/useKeyboardInset.test.ts
git commit -m "feat(hooks): add useKeyboardInset (visualViewport-based, for Plan 2)"
```

---

## Task 9 — Build `AnaClaraStubScreen` (TDD)

**Goal:** Full-screen placeholder shown on mobile when `anaCoachOpen === true`. Displays avatar + "Em breve" message + button linking to the WhatsApp integrations tab.

**Files:**
- Create: `src/components/ana-clara/AnaClaraStubScreen.tsx`
- Create: `src/components/ana-clara/AnaClaraStubScreen.test.tsx`

- [ ] **Step 9.1: Write the failing test**

Create `src/components/ana-clara/AnaClaraStubScreen.test.tsx`:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockedSetAnaCoachOpen = vi.fn();
const mockedNavigate = vi.fn();

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    anaCoachOpen: true,
    setAnaCoachOpen: mockedSetAnaCoachOpen,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

import { AnaClaraStubScreen } from './AnaClaraStubScreen';

describe('AnaClaraStubScreen', () => {
  beforeEach(() => {
    mockedSetAnaCoachOpen.mockClear();
    mockedNavigate.mockClear();
  });

  it('renders the avatar with the 128 variant as default', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    const img = screen.getByAltText(/ana clara/i) as HTMLImageElement;
    expect(img.src).toContain('/ana-clara-avatar-512');
  });

  it('renders the "em breve" heading', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    expect(screen.getByText(/em breve/i)).toBeTruthy();
  });

  it('renders the WhatsApp button', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeTruthy();
  });

  it('clicking the back arrow closes the screen', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockedSetAnaCoachOpen).toHaveBeenCalledWith(false);
  });

  it('clicking the WhatsApp button closes + navigates to settings anchor', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
    expect(mockedSetAnaCoachOpen).toHaveBeenCalledWith(false);
    expect(mockedNavigate).toHaveBeenCalledWith('/configuracoes#integrations-whatsapp');
  });

  it('renders nothing when anaCoachOpen is false', async () => {
    vi.resetModules();
    vi.doMock('@/store/uiStore', () => ({
      useUIStore: () => ({
        anaCoachOpen: false,
        setAnaCoachOpen: vi.fn(),
      }),
    }));
    const { AnaClaraStubScreen: Fresh } = await import('./AnaClaraStubScreen');
    const { container } = render(<MemoryRouter><Fresh /></MemoryRouter>);
    expect(container.querySelector('[data-testid="ana-clara-stub-root"]')).toBeNull();
  });

  it('is hidden at lg breakpoint', () => {
    render(<MemoryRouter><AnaClaraStubScreen /></MemoryRouter>);
    expect(screen.getByTestId('ana-clara-stub-root').className).toContain('lg:hidden');
  });
});
```

- [ ] **Step 9.2: Run test to verify it fails**

Run: `pnpm test src/components/ana-clara/AnaClaraStubScreen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 9.3: Create the component**

Write `src/components/ana-clara/AnaClaraStubScreen.tsx`:

```tsx
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';

export function AnaClaraStubScreen() {
  const { anaCoachOpen, setAnaCoachOpen } = useUIStore();
  const navigate = useNavigate();

  if (!anaCoachOpen) return null;

  const close = () => setAnaCoachOpen(false);

  const goToWhatsApp = () => {
    close();
    navigate('/configuracoes#integrations-whatsapp');
  };

  return (
    <div
      data-testid="ana-clara-stub-root"
      role="dialog"
      aria-modal="true"
      aria-label="Ana Clara"
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground lg:hidden"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={close}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-elevated"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-base font-semibold">Ana Clara</h1>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-[calc(64px+env(safe-area-inset-bottom)+32px)] text-center">
        <picture>
          <source srcSet="/ana-clara-avatar-512.webp" type="image/webp" />
          <img
            src="/ana-clara-avatar-512.png"
            alt="Ana Clara"
            width={192}
            height={192}
            className="h-48 w-48 rounded-full border-2 border-primary/20 object-cover object-top shadow-lg"
          />
        </picture>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Ana Clara chega em breve aqui.</h2>
          <p className="text-sm text-muted-foreground">
            Por enquanto, fale comigo no WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={goToWhatsApp}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-600"
        >
          <MessageCircle size={18} aria-hidden="true" />
          Abrir no WhatsApp
        </button>
      </main>
    </div>
  );
}
```

- [ ] **Step 9.4: Run test to verify it passes**

Run: `pnpm test src/components/ana-clara/AnaClaraStubScreen.test.tsx`
Expected: all tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add src/components/ana-clara/AnaClaraStubScreen.tsx src/components/ana-clara/AnaClaraStubScreen.test.tsx
git commit -m "feat(ana-clara): add mobile stub screen (placeholder for Plan 2)"
```

---

## Task 10 — Wire everything into `MainLayout`

**Goal:** `MainLayout` renders Sidebar (desktop), and the full mobile shell (BottomNav + QuickCreateFab + MoreSheet + AnaClaraStubScreen) on mobile. Adds bottom padding to `<main>` so content isn't hidden behind the bottom nav.

**Files:**
- Modify: `src/components/layout/MainLayout.tsx`
- Modify: `src/components/layout/MainLayout.test.tsx`
- Modify: `index.html` (viewport-fit=cover)

- [ ] **Step 10.1: Update `index.html` viewport meta**

In `index.html`, replace the `<meta name="viewport" …>` tag with:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

If no viewport meta exists, add it inside `<head>`.

- [ ] **Step 10.2: Write the updated MainLayout test**

Replace the contents of `src/components/layout/MainLayout.test.tsx` with:

```tsx
/* @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">sidebar</aside>,
}));

vi.mock('./BottomNav', () => ({
  BottomNav: () => <nav data-testid="bottom-nav" />,
}));

vi.mock('./MoreSheet', () => ({
  MoreSheet: () => <div data-testid="more-sheet" />,
}));

vi.mock('./QuickCreateFab', () => ({
  QuickCreateFab: () => <div data-testid="fab" />,
}));

vi.mock('@/components/ana-clara/AnaClaraStubScreen', () => ({
  AnaClaraStubScreen: () => <div data-testid="ana-stub" />,
}));

vi.mock('@/store/uiStore', () => ({
  useUIStore: () => ({
    activeQuickCreate: null,
    closeQuickCreate: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">page</div>,
  };
});

import { MainLayout } from './MainLayout';

describe('MainLayout shell', () => {
  function renderShell() {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    );
  }

  it('uses background tokens instead of gray-50 shell surfaces', () => {
    renderShell();
    expect(screen.getByTestId('app-shell').className).toContain('bg-background');
    expect(screen.getByTestId('app-shell').className).not.toContain('bg-gray-50');
  });

  it('renders sidebar, bottom nav, fab, more sheet, and ana-clara stub', () => {
    renderShell();
    expect(screen.getByTestId('sidebar')).toBeTruthy();
    expect(screen.getByTestId('bottom-nav')).toBeTruthy();
    expect(screen.getByTestId('fab')).toBeTruthy();
    expect(screen.getByTestId('more-sheet')).toBeTruthy();
    expect(screen.getByTestId('ana-stub')).toBeTruthy();
  });

  it('adds mobile bottom padding to main (pb-…) so content clears the bottom nav', () => {
    renderShell();
    const main = screen.getByTestId('app-main');
    expect(main.className).toMatch(/pb-\[/);
    expect(main.className).toContain('lg:pb-0');
  });
});
```

- [ ] **Step 10.3: Run the test to verify it fails**

Run: `pnpm test src/components/layout/MainLayout.test.tsx`
Expected: FAIL (new tests don't have the elements yet).

- [ ] **Step 10.4: Edit MainLayout.tsx**

In `src/components/layout/MainLayout.tsx`, replace the current `MainLayout` function with:

```tsx
export function MainLayout() {
  return (
    <div data-testid="app-shell" className="flex min-h-dvh bg-background text-foreground">
      <Sidebar />
      <main
        data-testid="app-main"
        className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] lg:ml-64 lg:pb-0"
      >
        <Outlet />
      </main>
      <BottomNav />
      <QuickCreateFab />
      <MoreSheet />
      <AnaClaraStubScreen />
      <QuickCreateManager />
    </div>
  );
}
```

Add the imports at the top of the file:

```tsx
import { BottomNav } from './BottomNav';
import { MoreSheet } from './MoreSheet';
import { QuickCreateFab } from './QuickCreateFab';
import { AnaClaraStubScreen } from '@/components/ana-clara/AnaClaraStubScreen';
```

(Keep all existing imports and the `QuickCreateManager` function below — no change to its body.)

Also change `min-h-screen` → `min-h-dvh` for the root div (ui-ux-pro-max rule `viewport-units`).

- [ ] **Step 10.5: Run the test to verify it passes**

Run: `pnpm test src/components/layout/MainLayout.test.tsx`
Expected: 3 tests pass.

- [ ] **Step 10.6: Run the full test suite**

Run: `pnpm test`
Expected: all suites pass. If any unrelated test breaks (e.g., because of `min-h-dvh`), fix by mirroring the selector expectation.

- [ ] **Step 10.7: Commit**

```bash
git add src/components/layout/MainLayout.tsx src/components/layout/MainLayout.test.tsx index.html
git commit -m "feat(layout): integrate mobile shell into MainLayout + viewport-fit"
```

---

## Task 11 — Manual verification checklist

**Goal:** Eyeball the shell in 3 viewports and confirm the acceptance criteria hold.

- [ ] **Step 11.1: Start the dev server**

Run: `pnpm dev`
Expected: Vite dev server up, URL printed (usually `http://localhost:5173`).

- [ ] **Step 11.2: Verify at desktop (≥ 1024px)**

- Open http://localhost:5173 in Chrome at window width 1440×900.
- Sidebar must look byte-identical to before this plan.
- No `BottomNav` or `QuickCreateFab` visible.
- Ana Clara FAB (`Bot` icon) still at `bottom-6 right-6`.
- Navigate through every sidebar item — all routes load.

- [ ] **Step 11.3: Verify at tablet portrait (768×1024, iPad)**

- DevTools → Responsive → iPad (768×1024, portrait).
- Sidebar gone. BottomNav visible at bottom with 5 tabs.
- FAB "+" green, above the nav, right side.
- Tap "Mais" → sheet with 10 grid items rises; backdrop darkens; tap outside closes.
- Tap "🤖 Ana" → stub screen appears full-screen; tap ← closes back to previous page.
- Tap "Abrir no WhatsApp" → navigates to `/configuracoes#integrations-whatsapp`.

- [ ] **Step 11.4: Verify at phone (375×667, iPhone SE)**

- DevTools → Responsive → iPhone SE (375×667).
- Same behaviors as tablet. Focus additionally:
- Safe-area padding present at bottom of nav (no content hidden behind home indicator on real iOS — approximated by DevTools).
- Content (Outlet) bottom padding clears the bottom nav.
- Tap FAB → menu opens upward with 5 actions. Tap "Despesa" → TransactionDialog opens.
- Tap backdrop of MoreSheet → closes smoothly.

- [ ] **Step 11.5: Acceptance criteria review (§9 of spec)**

Manually go through:
- [ ] No horizontal scroll at 320px, 375px, 768px, 1024px, 1440px, 1920px.
- [ ] All tap targets visually ≥ 44×44px.
- [ ] Tab ativa do bottom nav clara (cor primary + `aria-current`).
- [ ] Back button do browser funciona.
- [ ] Desktop em 1440px: diff visual = 0 (olhar ao lado com a versão de antes — git stash e compara).

- [ ] **Step 11.6: Record findings + next-steps**

Write a quick note in `docs/superpowers/plans/2026-04-19-mobile-shell-plan1.md` at the bottom (new section "Execution Log") with: date, which tests passed, which viewports were checked, any deviation.

- [ ] **Step 11.7: Commit the log + close out**

```bash
git add docs/superpowers/plans/2026-04-19-mobile-shell-plan1.md
git commit -m "docs(plan1): record manual verification of mobile shell"
```

---

## What Plan 1 delivers (definition of done)

After this plan is fully executed:
- App is genuinely usable in mobile (bottom nav, FAB, sheet all work)
- Desktop is **pixel-identical** to before
- Ana Clara tab shows a useful placeholder that points users to WhatsApp
- `useKeyboardInset` is ready and tested for Plan 2 to consume
- Avatar image variants are optimized and committed
- All new components have unit tests
- Sidebar test is green with zero changes (proves refactor was safe)
- No new dependencies other than dev-only `sharp`

## Follow-on plans

- **Plan 2 — Ana Clara chat real** (dedicated spec required — placeholder in §11.2 of spec)
- **Plan 3 — Dashboard mobile**
- **Plan 4 — Transações mobile**
- **Plan 5 — Conciliação mobile** (tabs swipeable Banco/Sistema/Sugestões — sub-brainstorm required)
- **Plans 6..N** — remaining pages
