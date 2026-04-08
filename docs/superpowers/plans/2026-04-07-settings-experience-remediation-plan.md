# Settings Experience Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Settings experience fully trustworthy so every control in `Configurações` has a single source of truth, persists correctly in Supabase, applies correctly in the UI, and stays consistent across the profile menu, dashboard, and the remaining settings tabs.

**Architecture:** Treat `public.user_settings` and related settings tables as the canonical backend state for authenticated users, then introduce a thin client-side application layer that hydrates theme, formatting, and locale behavior into the app shell without duplicating ownership in unrelated contexts. Split the work into foundation, General/Profile remediation, app-wide propagation, then audit-and-fix passes for `IA`, `Integrações`, `Webhooks`, and `Notificações`, finishing with a regression matrix and end-to-end verification.

**Tech Stack:** React, TypeScript, React Router, TanStack Query, Supabase Auth, Supabase PostgREST, Supabase Storage, Vitest, existing `ThemeContext`, existing settings hooks and shadcn/ui components.

---

## Current State Audit

**Already confirmed in audit:**
- `src/pages/Settings.tsx` correctly renders the `Geral`, `IA`, `Integrações`, `Webhooks`, and `Notificações` tabs.
- `src/hooks/useSettings.ts` loads and updates `user_settings` and `notification_preferences`.
- `GeneralSettings` persists `language`, `timezone`, `currency`, `date_format`, `number_format`, and `theme` to `public.user_settings`.
- Dashboard stat cards already consume `useUserPreferences().formatCurrency`, proving partial propagation exists.

**Confirmed inconsistencies:**
- `Perfil` in the avatar menu navigates to `/perfil`, but `src/App.tsx` has no matching route.
- Theme persistence is split: `GeneralSettings` writes `user_settings.theme`, while `ThemeContext` reads/writes `localStorage` key `pf-theme`.
- `src/components/ui/sonner.tsx` uses `next-themes`, but the app uses a custom `ThemeContext`; toast theming is disconnected.
- `language`, `currency`, `date_format`, `number_format`, and `timezone` are only partially respected across the app.
- `timezone` is stored but not meaningfully applied in formatters.
- Profile data ownership is split between `public.users` and `public.user_settings`.
- Avatar upload flow works in practice for the current user, but its path strategy and storage policy need to be aligned deliberately and tested.

**Scope decision:**
- Phase 1-4 fix the General tab and profile/account surface completely.
- Phase 5-8 continue with the remaining settings tabs so the entire Settings area becomes internally consistent instead of “General” being fixed in isolation.

---

## Remediation Principles

- `public.user_settings` is the canonical source of user preferences after login.
- Client-side persistence such as `localStorage` may cache or bootstrap, but must never compete with backend truth.
- Theme, locale, number/date formatting, and timezone application must be wired once and reused everywhere.
- Profile identity fields must have explicit ownership:
  - `users.full_name` / `users.avatar_url` for account profile identity
  - `user_settings` for user preferences and settings-only display behavior if truly needed
- Every settings control must pass this contract:
  - loads current persisted value
  - updates intent locally
  - persists successfully
  - reflects immediately in the UI where applicable
  - survives reload/navigation/logout/login

---

## File Structure

**Likely create:**
- `src/utils/settings/applyUserPreferences.ts` - central application of theme/locale/format/timezone to the client shell
- `src/utils/settings/applyUserPreferences.test.ts` - tests for theme/locale application rules
- `src/hooks/useAppliedUserPreferences.ts` - hydrates canonical settings into runtime behavior
- `src/pages/Profile.tsx` or redirect strategy in router if `Perfil` should land inside `Configurações`
- `src/pages/settings/__tests__/general-settings.integration.test.tsx` - focused integration tests for General/Profile behavior
- `src/pages/settings/__tests__/profile-menu.integration.test.tsx` - focused route/action tests for avatar menu
- `docs/superpowers/specs/2026-04-07-settings-experience-remediation-design.md` - optional follow-up design doc if this remediation expands beyond current scope

**Likely modify:**
- `src/App.tsx`
- `src/main.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/layout/Header.tsx`
- `src/components/settings/GeneralSettings.tsx`
- `src/hooks/useSettings.ts`
- `src/hooks/useUserPreferences.ts`
- `src/hooks/useAuth.ts`
- `src/lib/formatters.ts`
- `src/pages/Dashboard.tsx`
- any page/component still hardcoding `pt-BR`, `BRL`, or fixed date formats
- `supabase/migrations/20251111000002_create_storage_buckets.sql` or follow-up migration if avatar ownership policy needs normalization

**Likely inspect during later phases:**
- `src/components/settings/AIProviderSettings.tsx`
- `src/components/settings/IntegrationsSettings.tsx`
- `src/components/settings/WebhooksSettings.tsx`
- `src/components/settings/NotificationsSettings.tsx`
- corresponding hooks, migrations, tables, edge functions, and scheduler/orchestration code

---

## Phased Plan

### Phase 1: Canonical Settings Ownership

**Outcome:** One clear ownership model for profile identity, theme, and user preferences before fixing UI symptoms.

**Files:**
- Modify: `src/hooks/useSettings.ts`
- Modify: `src/hooks/useAuth.ts`
- Modify: `src/types/settings.types.ts`
- Create: `src/utils/settings/applyUserPreferences.ts`
- Test: `src/pages/settings/__tests__/general-settings.integration.test.tsx`

- [ ] **Step 1: Document the ownership contract inline in code**

Add explicit comments and exported helper types so future code cannot mix identity and preferences casually.

```ts
// users => account identity owned by auth/profile domain
// user_settings => preferences owned by settings domain
export interface AppliedUserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
}
```

- [ ] **Step 2: Add failing tests for General tab contract**

Write tests that prove:
- General tab loads persisted values
- theme application uses canonical settings state
- menu action `Perfil` resolves to a real destination
- dashboard currency/date rendering updates after preferences change

Run: `npm test -- general-settings`
Expected: failing assertions around theme propagation, profile route, and inconsistent formatting.

- [ ] **Step 3: Introduce a single runtime application helper**

Create a helper that translates `user_settings` into client runtime side effects.

```ts
export function applyUserPreferences(settings: AppliedUserPreferences) {
  return {
    resolvedTheme: settings.theme,
    locale: settings.language,
    timezone: settings.timezone,
    currency: settings.currency,
    dateFormat: settings.dateFormat,
    numberFormat: settings.numberFormat,
  };
}
```

- [ ] **Step 4: Verify the ownership layer passes tests**

Run: `npm test -- general-settings`
Expected: the contract test file still fails only on missing feature wiring, not on undefined ownership assumptions.

---

### Phase 2: Fix Profile Menu and Account Navigation

**Outcome:** `Perfil`, `Configurações`, and `Sair` all do real, correct work.

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/App.tsx`
- Create or Modify: `src/pages/Profile.tsx` or route redirect implementation
- Test: `src/pages/settings/__tests__/profile-menu.integration.test.tsx`

- [ ] **Step 1: Write failing route/action tests**

```ts
it('navigates avatar menu Perfil to a valid page', async () => {
  // open menu, click Perfil, assert route renders page content
});

it('navigates avatar menu Configurações to settings page', async () => {
  // open menu, click Configurações, assert General tab visible
});

it('executes logout and redirects to /login', async () => {
  // mock signOut success, assert redirect
});
```

Run: `npm test -- profile-menu`
Expected: `Perfil` test fails on invalid route.

- [ ] **Step 2: Decide and implement the `Perfil` destination**

Recommended path:
- either create `src/pages/Profile.tsx`
- or intentionally route `Perfil` to `configuracoes#perfil` / `configuracoes?section=perfil`

Preferred minimal implementation:

```tsx
<Route path="perfil" element={<Profile />} />
```

or

```tsx
<DropdownMenuItem onClick={() => navigate('/configuracoes?section=perfil')}>
```

- [ ] **Step 3: Harden logout UX**

Add success/error handling and verify caches/settings state do not linger after sign-out.

Run: `npm test -- profile-menu`
Expected: all menu action tests pass.

---

### Phase 3: Unify Theme Behavior

**Outcome:** choosing `Claro`, `Escuro`, or `Automático` updates the app shell immediately, persists to Supabase, survives reload, and themes toasts consistently.

**Files:**
- Modify: `src/contexts/ThemeContext.tsx`
- Modify: `src/components/settings/GeneralSettings.tsx`
- Modify: `src/hooks/useSettings.ts`
- Modify: `src/components/ui/sonner.tsx`
- Modify: `src/main.tsx`
- Test: `src/utils/settings/applyUserPreferences.test.ts`

- [ ] **Step 1: Write failing theme propagation tests**

```ts
it('applies persisted dark theme to document root on load', () => {
  // assert documentElement gets dark class from canonical settings
});

it('updates toaster theme when app theme changes', () => {
  // assert toast component receives aligned theme prop
});
```

Run: `npm test -- applyUserPreferences`
Expected: failures around `ThemeContext` and `sonner`.

- [ ] **Step 2: Make ThemeContext accept hydrated backend preference**

```ts
interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  hydrateTheme: (theme: Theme) => void;
}
```

`hydrateTheme()` should apply a server-backed theme without inventing a second source of truth.

- [ ] **Step 3: Remove `next-themes` dependency from toaster wiring**

Refactor `src/components/ui/sonner.tsx` to consume the existing custom theme context instead of `next-themes`.

```ts
const { resolvedTheme } = useTheme();
<Sonner theme={resolvedTheme} />
```

- [ ] **Step 4: Apply canonical theme during app boot**

Use settings hydration once authenticated settings are available, then keep local changes synced with backend updates.

- [ ] **Step 5: Verify browser-level behavior**

Manual checks:
- toggle each theme in `Configurações`
- reload page
- navigate to dashboard and back
- trigger a toast

Expected:
- shell colors update immediately
- persisted value reloads correctly
- toast colors match shell theme

---

### Phase 4: Make General Preferences Apply App-Wide

**Outcome:** `Idioma`, `Moeda`, `Formato de Data`, `Formato de Número`, and `Fuso Horário` are not decorative; they affect real rendering consistently across the app.

**Files:**
- Modify: `src/hooks/useUserPreferences.ts`
- Modify: `src/lib/formatters.ts`
- Modify: `src/pages/Dashboard.tsx`
- Modify: formatting-heavy pages such as `src/pages/Transacoes.tsx`, `src/pages/Investments.tsx`, `src/pages/CreditCards.tsx`, `src/pages/Reports.tsx`, `src/pages/Contas.tsx`, `src/pages/Goals.tsx`, `src/pages/PayableBills.tsx`
- Search and replace hardcoded `pt-BR`, `BRL`, and direct `toLocale*` usage where appropriate
- Test: `src/pages/settings/__tests__/general-settings.integration.test.tsx`

- [ ] **Step 1: Add failing regression tests for formatting**

```ts
it('renders dashboard totals in USD when currency is USD', () => {
  // assert $5,619.00 instead of R$ 5.619,00
});

it('renders recent transaction dates in MM/DD/YYYY when selected', () => {
  // assert 04/07/2026 => 04/07/2026 format semantics based on preference
});

it('respects en-US number formatting in summary widgets', () => {
  // assert 1,234.56 instead of 1.234,56
});
```

- [ ] **Step 2: Extend formatter APIs to accept timezone explicitly**

```ts
export function formatDateTime(
  date: Date | string | number,
  dateFormat = 'DD/MM/YYYY',
  locale = 'pt-BR',
  timezone = 'America/Sao_Paulo'
) {}
```

Apply `timeZone` in `Intl.DateTimeFormat` options where time-of-day matters.

- [ ] **Step 3: Update `useUserPreferences` to expose one canonical formatter surface**

```ts
formatDate: (date) => formatDateUtil(date, dateFormat, locale, timezone)
formatDateTime: (date) => formatDateTimeUtil(date, dateFormat, locale, timezone)
formatTime: (date, includeSeconds) => formatTimeUtil(date, locale, timezone, includeSeconds)
```

- [ ] **Step 4: Replace hardcoded formatting call sites page by page**

For each page:
- identify hardcoded formatting
- replace with `useUserPreferences`
- run focused test or manual verification

- [ ] **Step 5: Decide scope of `Idioma`**

Recommended rule:
- short term: locale + formatter language only
- medium term: full UI i18n is separate work

Update labels/help text in Settings so `Idioma` is not overpromising if full translation is not yet shipped.

- [ ] **Step 6: Verify with manual matrix**

Test combinations:
- `pt-BR` + `BRL`
- `en-US` + `USD`
- `pt-BR` + `USD`
- `en-US` + `BRL`

Expected:
- cards, transactions, summaries, charts, and timestamps render consistently with the chosen preference model.

---

### Phase 5: Correct Profile Data and Avatar Ownership

**Outcome:** profile name, email, and avatar behave consistently across settings page, header, dashboard greeting, and storage policy.

**Files:**
- Modify: `src/components/settings/GeneralSettings.tsx`
- Modify: `src/hooks/useAuth.ts`
- Modify: `src/hooks/useSettings.ts`
- Modify: `src/components/layout/Header.tsx`
- Modify or add migration: `supabase/migrations/*avatar*.sql`
- Test: `src/pages/settings/__tests__/general-settings.integration.test.tsx`

- [ ] **Step 1: Add failing tests for profile consistency**

```ts
it('keeps header name and settings display name in sync after save', async () => {
  // save new display name, assert header updates
});

it('loads avatar after successful upload and keeps header/settings aligned', async () => {
  // simulate upload success, assert avatar url updates in both places
});
```

- [ ] **Step 2: Choose the canonical owner for display name and avatar**

Recommended choice:
- `public.users.full_name` and `public.users.avatar_url` become identity truth
- `user_settings` keeps only preferences

If keeping `display_name` in settings for product reasons, explicitly mirror it and document precedence.

- [ ] **Step 3: Align save flow with chosen ownership**

Either:
- update `public.users` directly when editing profile identity
- or create a backend function/trigger that synchronizes safely

- [ ] **Step 4: Normalize avatar storage path and policy**

Preferred storage path:

```txt
avatars/<user-id>/profile.<ext>
```

This matches a clear policy pattern and avoids ambiguous ownership parsing.

- [ ] **Step 5: Verify upload and cache-busting**

Manual checks:
- upload valid image
- reload page
- open avatar menu
- confirm header/settings/dashboard avatar all match

---

### Phase 6: Audit and Fix `IA`

**Outcome:** the `IA` tab only exposes real, connected provider/model/settings behavior, with persistence, validation, and user-facing feedback that matches backend truth.

**Files:**
- Inspect/Modify: `src/components/settings/AIProviderSettings.tsx`
- Inspect/Modify: hooks and types related to AI provider configs
- Inspect/Modify: relevant migrations and edge function validation paths

- [ ] **Step 1: Audit the `IA` tab end-to-end**

Check for:
- placeholder inputs
- fake save success
- decrypted vs masked key handling
- default provider switching
- dead model selectors
- mismatch between saved config and runtime usage

- [ ] **Step 2: Add failing tests for any disconnected controls found**

- [ ] **Step 3: Fix persistence, validation, and active/default provider semantics**

- [ ] **Step 4: Verify against real network requests and real saved records**

Expected:
- every `IA` control either works end-to-end or is removed/disabled with honest copy.

---

### Phase 7: Audit and Fix `Integrações` and `Webhooks`

**Outcome:** integrations and webhooks represent real connection state, real credentials/configuration status, and actionable logs/errors.

**Files:**
- Inspect/Modify: `src/components/settings/IntegrationsSettings.tsx`
- Inspect/Modify: `src/components/settings/WebhooksSettings.tsx`
- Inspect/Modify: related hooks, DB tables, edge functions, and log views

- [ ] **Step 1: Audit `Integrações`**

Verify for each integration:
- connect/disconnect behavior
- status badge truthfulness
- last sync / last error accuracy
- missing secret handling

- [ ] **Step 2: Audit `Webhooks`**

Verify:
- create/update/delete
- auth config persistence
- retry config persistence
- test/send action correctness
- log list reflects backend truth

- [ ] **Step 3: Add failing tests or focused manual scripts for broken paths**

- [ ] **Step 4: Fix disconnected UI and backend mismatches**

- [ ] **Step 5: Re-run with network + DB verification**

---

### Phase 8: Audit and Fix `Notificações`

**Outcome:** notification preferences are persisted, schedulable, and honest about what downstream jobs actually use.

**Files:**
- Inspect/Modify: `src/components/settings/NotificationsSettings.tsx`
- Inspect/Modify: `src/hooks/useSettings.ts`
- Inspect/Modify: relevant cron/orchestration functions such as proactive notifications and Ana tips flows
- Inspect/Modify: `src/types/settings.types.ts`

- [ ] **Step 1: Audit field-to-backend mapping for every notification control**

Check:
- save/load parity
- arrays vs legacy scalar fields
- conflicting schedules
- features shown in UI but not consumed by jobs

- [ ] **Step 2: Add failing tests for scheduler contract**

- [ ] **Step 3: Fix preference normalization and downstream consumers**

Recommended direction:
- normalize legacy + new fields into one runtime contract
- stop exposing settings that no job reads

- [ ] **Step 4: Verify with DB state and job inputs**

Expected:
- what the user configures is exactly what the system will schedule/send.

---

### Phase 9: Final Regression, QA, and Cleanup

**Outcome:** the whole Settings area is reliable, understandable, and regression-protected.

**Files:**
- Modify: affected tests
- Modify: affected docs/help text
- Optional: `README` or settings-specific internal docs if behavior changed materially

- [ ] **Step 1: Create a Settings regression checklist**

Cover:
- avatar menu actions
- General tab persistence
- reload persistence
- dashboard propagation
- theme propagation + toast theming
- cross-tab save behavior
- logout/login round trip

- [ ] **Step 2: Run focused test suite**

Run:
- `npm test -- general-settings`
- `npm test -- profile-menu`
- any new settings tab tests added in Phases 6-8

Expected: all pass.

- [ ] **Step 3: Run app-level manual verification**

Manual matrix:
- desktop light mode
- desktop dark mode
- page reload
- browser reopen
- sign out/sign in
- edit profile
- change General settings
- navigate through dashboard, transactions, cards, reports
- test each remaining settings tab

- [ ] **Step 4: Remove misleading copy and decorative dead controls**

Examples to address if still unfixed:
- header notification bell with no action
- `Ajuda` button with no behavior
- any “saved” success path that is not backed by real persistence

---

## Acceptance Criteria

The remediation is complete only when all of the following are true:

- `Perfil`, `Configurações`, and `Sair` all work from the avatar menu.
- `GeneralSettings` loads persisted values from backend truth.
- Theme changes affect the actual app shell and toast system immediately.
- Theme survives reload and login/logout cycle.
- Currency, date format, number format, and timezone are applied consistently in key user-facing screens.
- `Idioma` behavior is either fully implemented or explicitly scoped honestly in the UI.
- Profile name and avatar have one explicit ownership model and do not drift between header, settings, and dashboard.
- Remaining tabs have been audited and every visible control is either functional or intentionally removed/disabled with accurate copy.
- Focused automated tests exist for the broken paths found in this audit.

---

## Recommended Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8
9. Phase 9

---

## Notes for Execution

- Do not start with cosmetic cleanup; start with ownership and routing.
- Do not fix only the Settings screen; verify propagation in live consumer screens.
- Do not leave split theme ownership in place.
- Do not claim a control “works” until network, DB persistence, reload behavior, and consumer rendering have all been observed.

