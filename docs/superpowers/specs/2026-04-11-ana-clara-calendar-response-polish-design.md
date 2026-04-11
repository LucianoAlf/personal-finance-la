# Ana Clara Calendar Response Polish Design

**Date:** 2026-04-11
**Status:** Draft for user review
**Scope:** Improve Ana Clara's WhatsApp agenda responses so they match Mike's semantic hierarchy and visual polish while preserving Ana Clara's current calendar backend behavior.

---

## 1. Goal

Make Ana Clara's agenda responses feel as polished and semantically correct as Mike's for:

- event creation confirmation
- created-event success
- reschedule confirmation
- rescheduled-event success
- cancel confirmation
- cancelled-event success
- agenda list / agenda lookup

This includes fixing participant rendering so first-person references such as `eu`, `meu`, `minha` and equivalent variants resolve to the current authenticated user's real display name instead of appearing literally in the response.

The result should preserve Ana Clara's identity and current agenda capabilities while adopting Mike's stronger message structure, hierarchy, and WhatsApp readability.

---

## 2. Current Reality From Audit

### 2.1 Current Ana Clara response layer

- `supabase/functions/process-whatsapp-message/calendar-response-templates.ts` is already the canonical presentation layer for Ana Clara's agenda responses.
- The file already carries a Mike-inspired structure, but only partially:
  - create confirmation uses a short header and stacked lines
  - created-event success uses a compact block
  - reschedule and cancel responses are still comparatively thinner than Mike's
  - agenda list items are compact, but their secondary-line strategy is still shallow
- Current title cleanup only normalizes a few explicit patterns such as `compromisso com os meus coordenadores`.

### 2.2 Current participant problem

- Ana Clara currently treats first-person phrases too literally in event titles and participant-like text.
- This leads to semantically broken summaries such as showing `eu` or `você/seu` instead of the user's real name.
- The desired behavior is user-relative:
  - if Alf is the authenticated user, `eu` must resolve to `Alf`
  - if Ani is the authenticated user, `eu` must resolve to `Ani`
  - the rule must follow whoever owns the active login / WhatsApp connection

### 2.3 Mike patterns worth importing

From the Mike code and screenshots, the strongest UX traits are:

- stable response hierarchy
- short action-oriented headers
- one primary event block
- optional secondary detail lines in predictable order
- low-emoji but meaningful emoji usage
- explicit `Achei o evento:` framing for reschedule/cancel confirmation
- explicit `Alterações:` framing before showing the delta
- participant rendering as concrete readable names, not raw pronouns

### 2.4 Constraints

- Ana Clara must keep her existing agenda handlers, RPC contracts, confirmation flow, and production-safe logic.
- The polish should be additive and presentation-focused, not a backend rewrite.
- We should avoid importing Mike-specific assumptions that depend on its separate temporary backend/worktree.

---

## 3. Product Decisions Confirmed

### 3.1 Identity resolution for first-person participant references

Confirmed behavior:

- first-person references in agenda presentation must resolve to the current user's preferred name
- this behavior is dynamic per authenticated user, not hardcoded for Alf
- supported concepts include at minimum:
  - `eu`
  - `me`
  - `meu`
  - `minha`
  - `comigo`
- the rendered output must never show `eu`, `você`, `seu`, or similar placeholders when the assistant already knows the acting user

### 3.2 Visual scope

The Mike-style polish should cover all agenda response classes that Ana Clara currently owns:

- create confirmation
- create success
- reschedule confirmation
- reschedule success
- cancel confirmation
- cancel success
- agenda list

### 3.3 Voice and presentation balance

Ana Clara should keep her own persona, but the agenda presentation should be closer to Mike's in:

- hierarchy
- compactness
- readability in WhatsApp
- semantic clarity

She should not become visually noisy or emoji-heavy. The target is "Mike's structure with Ana Clara's identity".

---

## 4. Recommended Approach

### 4.1 Chosen option

Use a dedicated presentation-normalization layer inside Ana Clara's existing calendar response templates.

This means:

- keep `calendar-handler.ts` as the orchestration layer
- keep current parser and RPC responsibilities in place
- expand the data passed to the response templates where necessary
- centralize semantic cleanup and Mike-style layout rules in `calendar-response-templates.ts`

### 4.2 Why this option

This is the safest path because it:

- minimizes risk to working agenda flows
- avoids scattering formatting logic across handlers
- lets us reuse one normalized rendering contract across all calendar actions
- imports Mike's strengths without copying Mike's backend assumptions
- creates a clear place to add future polish without touching domain logic

### 4.3 Explicit non-goals

This design does not include:

- rewriting the agenda parser from scratch
- importing Mike's calendar backend or RPC layer
- changing Ana Clara's non-agenda financial responses
- changing agenda data ownership
- introducing a full participant-contact system in this step

---

## 5. Design Principles

### 5.1 Presentation is centralized

All user-facing agenda phrasing and formatting should be generated from one template layer, not assembled ad hoc in handlers.

### 5.2 Semantic cleanup before rendering

Raw user utterances are not good final UI. We should normalize:

- titles
- first-person references
- participant lists
- secondary detail lines

before composing the WhatsApp message.

### 5.3 Stable visual hierarchy

Each agenda message type should follow a predictable visual contract:

- action header
- primary event identity
- primary date/time line
- optional secondary details in fixed order
- confirmation or terminal outcome line

### 5.4 User-relative naming

Language such as `eu` only makes sense at interpretation time, not presentation time. Rendering must always anchor to the currently resolved user identity.

### 5.5 Additive evolution

We should improve the current Ana Clara templates in place rather than replacing the entire agenda stack.

---

## 6. Proposed Architecture

### 6.1 New presentation contract

`calendar-response-templates.ts` should evolve from "string helper file" into a small normalized rendering layer.

It should own:

- event-title cleanup
- participant normalization for display
- preferred-user-name resolution fallback
- line ordering for confirmation and success states
- Mike-style framing for reschedule/cancel confirmation
- agenda-list item formatting

### 6.2 Data the template layer should accept

For each relevant render path, the template layer should be able to receive:

- raw event title
- user preferred display name
- formatted date/time or source datetime fields
- optional participants string or participant-like subtitle
- optional location
- optional reminder summary
- optional recurrence summary
- optional change summary for reschedule/cancel flows

Not every path needs every field, but the contract should support them consistently.

### 6.3 Handler responsibility split

`calendar-handler.ts` remains responsible for:

- interpreting parsed intent
- loading any required event data
- saving pending confirmation context
- creating / updating / cancelling via RPC
- passing normalized-enough structured inputs to the presentation layer

`calendar-response-templates.ts` becomes responsible for:

- final wording
- final layout
- participant display semantics
- line ordering

### 6.4 User-name resolution strategy

The rendering layer must support a deterministic name fallback chain:

1. preferred display name from user context / identity
2. first name
3. full name
4. safe generic fallback only if no user identity field exists

The goal is that first-person participant references render as a real name whenever the system knows one.

---

## 7. Rendering Rules By Response Type

### 7.1 Create confirmation

Target format:

- `Criar compromisso?`
- primary title line
- primary date/time line
- optional location line
- optional participants line
- optional reminders line
- optional recurrence line
- `Confirma? (sim/não)`

Rules:

- use one event emoji family consistently
- do not overload the message with redundant labels
- if participants exist, show concrete names, not raw pronouns

### 7.2 Create success

Target format:

- `Pronto, agendei!`
- primary title line
- primary date/time line
- optional location line
- optional participants line when helpful
- optional reminders line

Rules:

- keep compact like Mike
- success state should feel final and clean, not verbose

### 7.3 Reschedule confirmation

Target format:

- `Achei o evento:`
- summary block of the current event
- `Alterações:`
- lines for changed date, time, location, or title
- `Confirma? (sim/não)`

Rules:

- explicitly separate "current event" from "requested changes"
- match Mike's semantic framing as closely as practical

### 7.4 Reschedule success

Target format:

- `Pronto, remarquei!`
- title
- updated date/time line
- optional changed location line

### 7.5 Cancel confirmation

Target format:

- `Achei o evento:`
- summary block of the current event
- `Cancelo? (sim/não)`

### 7.6 Cancel success

Target format:

- `Pronto, cancelei o evento.`
- title of the cancelled event

### 7.7 Agenda list

Target format:

- section title
- compact item cards
- each item should include:
  - one leading emoji
  - title
  - primary date/time line
  - optional compact secondary line when relevant

Rules:

- keep list scan-friendly in WhatsApp
- secondary lines should be used only when they add meaning
- preserve current ability to differentiate financial derived items vs canonical events

---

## 8. Participant Normalization Rules

### 8.1 First-person replacement

Before displaying participant-like text, normalize first-person references to the current user's display name.

Examples:

- `eu e Yuri` -> `Alf, Yuri`
- `eu, Ani, Jeremias e Ana Paula` when Ani is the active user -> `Ani, Jeremias, Ana Paula`
- `comigo e John` -> `Alf, John`

### 8.2 Deduplication

If the resolved user name is already present after normalization, deduplicate it.

Examples:

- `eu, Alf e Yuri` -> `Alf, Yuri`
- `Ani, eu e Jeremias` for Ani -> `Ani, Jeremias`

### 8.3 Qualifier preservation

If the user includes descriptive qualifiers, preserve them when possible.

Examples:

- `incluindo o estagiário Matheus` should remain recognizably richer than just `Matheus`
- `John (design)` should not be flattened unless the cleanup is clearly noise

### 8.4 Safety boundary

Do not invent participant names not present in:

- the user identity for self-references
- the user utterance
- already available event data

This step is presentation normalization, not entity enrichment.

---

## 9. Files Expected To Change

- `supabase/functions/process-whatsapp-message/calendar-response-templates.ts`
- `supabase/functions/process-whatsapp-message/calendar-handler.ts`
- `supabase/functions/process-whatsapp-message/__tests__/calendar-response-templates.test.ts`
- `supabase/functions/process-whatsapp-message/__tests__/calendar-intent-parser.test.ts` when needed for participant-facing regressions

Potentially:

- a small helper extraction inside the calendar response layer if `calendar-response-templates.ts` grows too much

---

## 10. Testing Strategy

### 10.1 Template regression coverage

Add or update tests to prove:

- create confirmation uses Mike-style hierarchy
- create success uses compact Mike-style hierarchy
- first-person participant references resolve to the current user's display name
- duplicate self-name entries are removed
- reschedule confirmation uses `Achei o evento:` plus `Alterações:`
- cancel confirmation uses `Achei o evento:` plus `Cancelo?`
- agenda list stays compact and readable

### 10.2 Behavioral guardrails

Keep existing agenda parser and confirmation-routing tests green to ensure:

- no regression in create detection
- no regression in pending-confirmation handling
- no regression in agenda listing ownership/routing

---

## 11. Risks And Mitigations

### 11.1 Risk: overfitting to Mike text

If we copy Mike too literally, Ana Clara may inherit assumptions from a different backend shape.

Mitigation:

- copy the visual contract, not the backend contract
- keep Ana Clara's render inputs explicit and local

### 11.2 Risk: participant cleanup breaks valid titles

Aggressive pronoun replacement could distort legitimate event titles.

Mitigation:

- apply first-person normalization only in display cleanup paths intended for participant-like phrases
- add regression tests for representative natural-language titles

### 11.3 Risk: template layer grows too large

More formatting rules can turn the file into a monolith.

Mitigation:

- start in one place
- extract small helpers only if duplication appears during implementation

---

## 12. Implementation Outline

1. Expand the template contract to accept user-display context and richer optional fields.
2. Introduce centralized participant/display normalization helpers.
3. Rework create confirmation and create success to follow the final contract.
4. Rework reschedule and cancel flows to match Mike-style framing.
5. Refine agenda list formatting without changing list ownership logic.
6. Add focused regression tests for participant normalization and response hierarchy.
7. Verify no regression in current agenda flow and pending confirmation behavior.

---

## 13. Expected Outcome

After this work:

- Ana Clara will stop rendering broken participant phrasing such as `eu` or `seu`
- agenda confirmations and success messages will look materially closer to Mike's polish level
- reschedule and cancel flows will gain better semantic hierarchy
- agenda lists will remain compact but more consistently organized
- the presentation logic will be easier to evolve without touching calendar domain behavior
