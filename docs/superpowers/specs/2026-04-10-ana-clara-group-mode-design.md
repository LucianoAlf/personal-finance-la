# Ana Clara Group Mode Design

**Date:** 2026-04-10
**Status:** Draft for user review
**Scope:** First subproject for Ana Clara group-mode on WhatsApp, designed to mirror Mike's group behavior while staying additive to the current Personal Finance LA architecture.

---

## 1. Goal

Enable Ana Clara to participate in a specific WhatsApp group as a passive financial copilot that:

- stays silent by default
- wakes on explicit triggers
- hibernates again after inactivity
- passively absorbs group context
- auto-analyzes payment receipts sent in the group
- can automatically mark bills as paid when confidence is high
- responds with a clear summary of what she identified and what she executed

This must preserve the current one-to-one WhatsApp behavior and prepare the system for future agent configuration UI and in-app conversational surfaces.

---

## 2. Approved Product Decisions

### 2.1 First subproject

The first subproject is **group mode on WhatsApp**.

The configuration UI and the internal in-app chat are recognized as important next layers, but they are not the first implementation target. The backend design must still anticipate both.

### 2.2 Group target

Initial bootstrap target:

- Group name: `CONTAS E COMPROVANTES`
- Group JID: `5521981278047-1555326211@g.us`

### 2.3 Authorized participants

Ana Clara may wake and respond to:

- `5521981278047`
- `5521966950296`
- Alfredo

The implementation should store participants in a flexible config structure so exact phone/name matching can be improved without schema redesign.

### 2.4 Trigger behavior

Approved activation rules:

- **Text message:** wakes Ana Clara when an authorized participant explicitly calls her by trigger name.
- **Audio message:** only wakes Ana Clara if transcription contains one of her trigger names.
- **Receipt / proof of payment:** is itself a wake trigger when sent by an authorized participant.

Approved trigger family:

- direct names: `Ana Clara`, `Aninha`, `Clara`, `Clarinha`
- conversational variations: `coé Ana Clara`, `fala Aninha`, `oi Clarinha`, `Ana Clara, tá aí?`, `fala comigo, Aninha`, and equivalent variants

The backend should normalize these into a canonical trigger list plus pattern-based phrase detection rather than store every phrasing literally.

### 2.5 Session lifecycle

Approved group-state model:

- `hibernating`: passive listening only, no response
- `active_session`: responds without new wake word while session is alive

Session rules:

- session opens on a valid trigger event
- session remains active for `5 minutes` since the last relevant interaction
- session expires automatically after inactivity
- session may end early with explicit dismiss phrases like `valeu Ana Clara`, `obrigado Clarinha`, `fechou Aninha`

This mirrors Mike's behavior: wake, stay contextually available for a short window, then return to the background.

### 2.6 Receipt automation

When Ana Clara receives a receipt in the allowed group:

- she should analyze it automatically
- if she identifies all required bill-payment data with high confidence, she may execute the payment marking automatically
- even when auto-executing, she must send a structured summary explaining:
  - what she identified
  - what she matched
  - what she recorded
  - whether anything still needs confirmation

If any critical field is missing or ambiguous, she must not execute blindly and should ask only for the missing confirmation.

---

## 3. Recommended Approach

### 3.1 Chosen option

Use **Option 1: Mike-like dedicated backend group mode**.

This means:

- keep the current `process-whatsapp-message` as the entrypoint
- branch group traffic into a dedicated Ana Clara group-mode backend flow
- keep one-to-one flow unchanged
- avoid scattering group-specific `if/else` logic across the entire existing pipeline

### 3.2 Why this option

This option is the safest and most extensible because it:

- produces predictable group behavior
- matches the proven Mike model
- keeps group logic isolated
- makes future configuration UI straightforward
- creates a clean contract for the future internal chat UI

### 3.3 Explicit non-goals for this subproject

This spec does **not** include:

- full internal chat UI implementation
- full Ana Clara admin screen implementation
- multi-group tenant management UI
- redesign of the existing one-to-one WhatsApp pipeline
- replacing existing conversation, onboarding, memory, or soul systems

Those remain future phases. This design only ensures they are not blocked.

---

## 4. Current Project Context

### 4.1 Current Ana Clara architecture

Relevant current structures in this repository:

- `supabase/functions/process-whatsapp-message/index.ts`
  - main backend entrypoint for WhatsApp handling
- `supabase/functions/webhook-uazapi/index.ts`
  - receives UAZAPI webhook payloads and forwards normalized message handling
- `supabase/functions/process-whatsapp-message/utils.ts`
  - message normalization, send helpers, Supabase service-role client
- `conversation_context`
  - existing short-lived session table with a natural 5-minute expiration pattern
- `agent_identity`
  - deep personality, autonomy, user context
- `agent_memory_entries`
  - long-term facts with reinforcement
- `agent_memory_episodes`
  - explicit episodic memory introduced in Phase B
- `whatsapp_connections`
  - current WhatsApp connection source of truth for the frontend

### 4.2 Relevant frontend anchors

Two likely homes for future configuration:

- `src/components/settings/IntegrationsSettings.tsx`
  - already owns WhatsApp connection and command-related settings
- `src/components/settings/AIProviderSettings.tsx`
  - already owns Ana Clara AI/provider model settings

The group-mode configuration should be designed to fit either:

- an Ana Clara subsection inside the existing AI/integrations settings
- or a dedicated future Ana Clara settings area

The data model must support both without migration redesign.

### 4.3 Mike architecture patterns being intentionally copied

From the inspected `tmp/la-studio-manager` backend:

- silent-by-default group mode
- allowlist of enabled groups
- explicit trigger names
- explicit dismiss phrases
- active session with timeout
- passive group memory persisted independently of response behavior
- config-driven behavior instead of hardcoding runtime rules

These patterns are the direct reference for Ana Clara group mode.

---

## 5. Operational Behavior

### 5.1 High-level flow

For every inbound message from the configured group:

1. Normalize the WhatsApp payload.
2. Identify whether the message belongs to an enabled Ana Clara group.
3. Save passive context when appropriate.
4. Evaluate whether the event is a wake trigger, active-session continuation, dismiss event, or silent background message.
5. If not allowed to respond, do nothing outwardly.
6. If allowed to respond, build compact group context and route through Ana Clara's NLP/action flow.
7. If the message is a receipt, route through receipt-analysis rules before or alongside general NLP classification.
8. Send response and update group session state.

### 5.2 Group states

#### Hibernating

In hibernation, Ana Clara:

- listens passively
- stores contextual group memory
- does not speak unless a valid trigger event happens

#### Active session

In active session, Ana Clara:

- can continue responding without a repeated wake word
- uses recent group context as prompt enrichment
- extends the session expiry on each relevant interaction
- returns to hibernation after 5 minutes of inactivity

### 5.3 Trigger matrix

| Event | Allowed participant required | Trigger required | Result |
|---|---|---|---|
| Text mention | Yes | Yes | Wake and respond |
| Audio | Yes | Yes, in transcription | Wake and respond |
| Receipt / comprovante | Yes | No | Wake and analyze automatically |
| Plain text while session active | Yes | No | Continue session |
| Plain text while hibernating | Yes | No | Observe only |
| Non-authorized participant | N/A | Any | No response |

### 5.4 Dismiss behavior

If an authorized participant sends a dismiss phrase while session is active:

- Ana Clara closes the group session immediately
- optionally replies with a short acknowledgment
- returns to passive background listening

### 5.5 Authorized-participant policy

For this first rollout, group interaction is restricted to the known allowlist.

If a non-authorized participant triggers Ana Clara:

- she should remain silent

Reason:

- lower social noise in the group
- lower privacy risk
- lower chance of accidental wake-ups

This rule can become configurable later, but silence is the correct default for the first rollout.

---

## 6. Backend Architecture

### 6.1 Entry-point strategy

`supabase/functions/process-whatsapp-message/index.ts` remains the single public processing entrypoint.

It gains a dedicated group branch:

- direct/group detection stays close to ingress
- group traffic is routed into dedicated Ana Clara group modules
- direct messages continue using the current individual flow

This avoids introducing a second competing WhatsApp processing function.

### 6.2 New backend modules

#### `ana-clara-group-config`

Responsibility:

- load persisted group-mode configuration
- expose normalized runtime helpers

Key behavior:

- enabled group lookup
- authorized participant lookup
- trigger names lookup
- timeout lookup
- receipt automation policy lookup
- AI/model/tone fallback lookup for group mode

#### `ana-clara-group-handler`

Responsibility:

- decide whether Ana Clara should remain silent, wake, continue, dismiss, or reply

Key decisions:

- is enabled group?
- is authorized participant?
- is explicit dismiss phrase?
- is group session active?
- does text contain trigger?
- does transcribed audio contain trigger?
- is receipt a wake trigger?

#### `ana-clara-group-memory`

Responsibility:

- save passive group context
- build short prompt-safe context summaries for active group sessions

Key behavior:

- store compact recent messages
- store media summaries
- flag trigger events
- limit by time window and message count
- produce compact context blocks for NLP

#### `ana-clara-group-receipt-router`

Responsibility:

- handle receipt-first automation flow

Key behavior:

- detect receipt payloads
- extract bill/payment candidate data
- infer vendor, amount, payment date, possible bill match
- determine confidence
- decide:
  - auto-execute payment marking
  - ask targeted confirmation
  - or escalate to general conversational flow

### 6.3 Integration with current NLP pipeline

When the group handler decides that Ana Clara should respond:

- build group-context summary from `ana_clara_group_message_memory`
- inject it into Ana Clara prompt enrichment
- preserve existing soul, user context, agenda, and memory enrichment
- do not replace the current direct-message enrichment flow

This must remain additive:

- direct mode stays intact
- group mode adds a dedicated branch
- shared memory and soul systems remain reused

### 6.4 Receipt-specific routing

Receipts are special because they are both:

- a trigger event
- a likely executable financial event

The receipt router should run before the general "silence vs NLP" decision is finalized, so the system can:

- wake Ana Clara from hibernation on receipt alone
- analyze the media
- decide whether to auto-mark or request confirmation

### 6.5 Audio-specific routing

Audio never becomes a trigger by itself.

Audio flow:

1. transcribe audio
2. check whether transcription contains an allowed trigger pattern
3. if yes, group handler wakes Ana Clara
4. if not, message stays passive-only

This avoids accidental session activation from unrelated voice notes.

---

## 7. Data Model

### 7.1 `ana_clara_config`

Create a dedicated config table inspired by `mike_config`, but future-proofed for both WhatsApp group mode and internal chat.

Suggested responsibility:

- one row per user
- canonical Ana Clara runtime config

Suggested fields:

- `user_id`
- `is_enabled`
- `whatsapp_bot_phone_number`
- `enabled_group_jids`
- `allowed_group_participants`
- `agent_trigger_names`
- `group_session_timeout_minutes`
- `group_memory_hours_back`
- `group_memory_max_messages`
- `group_memory_retention_days`
- `auto_process_receipts`
- `auto_execute_high_confidence_bill_payments`
- `default_ai_model`
- `fallback_ai_model`
- `max_output_tokens`
- `personality_tone`
- `channels`
  - future-safe config describing WhatsApp vs internal chat enablement

### 7.2 Bootstrap values for this rollout

Initial config should bootstrap with:

- enabled group: `5521981278047-1555326211@g.us`
- group label: `CONTAS E COMPROVANTES`
- allowed participants including:
  - `5521981278047`
  - `5521966950296`
  - Alfredo
- group timeout: `5`
- auto process receipts: `true`
- auto execute high-confidence bill payments: `true`

### 7.3 `ana_clara_group_message_memory`

Create a dedicated passive-memory table for group context.

Suggested fields:

- `id`
- `user_id`
- `group_jid`
- `participant_phone`
- `participant_name`
- `message_type`
- `content`
- `media_summary`
- `trigger_detected`
- `metadata`
- `created_at`
- `expires_at`

Rationale:

- group passive memory is structurally different from `agent_memory_entries`
- it should be cheap, expirable, and optimized for recent conversational context
- it should not compete with long-term fact memory

### 7.4 Session storage

Reuse `conversation_context` for the short active-group session.

Add a new `context_type` value:

- `ana_clara_group_session`

Session payload should include:

- `group_jid`
- `group_name`
- `activated_by_phone`
- `activated_by_name`
- `activation_reason`
  - `text_trigger`
  - `audio_trigger`
  - `receipt_trigger`
- `activated_at`
- `last_interaction_at`

Rationale:

- current session semantics already fit the 5-minute lifecycle
- avoids inventing a second session table
- keeps expiration and cleanup behavior aligned with current architecture

### 7.5 Relationship to existing memory systems

The new group-mode data must not replace:

- `agent_memory_entries`
- `agent_memory_episodes`
- `conversation_context` in direct mode

Instead:

- `ana_clara_group_message_memory` stores short passive conversational context
- `conversation_context` stores ephemeral session activation state
- `agent_memory_entries` stores reinforced long-term facts
- `agent_memory_episodes` stores meaningful episodic conclusions from important group interactions

This separation keeps each store focused and avoids overloading one table with unrelated concerns.

---

## 8. Receipt Processing Design

### 8.1 Inputs

Receipt/proof-of-payment processing may receive:

- image
- PDF/document
- caption text
- surrounding recent group context

### 8.2 Desired extraction output

Ana Clara should attempt to extract:

- merchant or bill name
- amount
- payment date and time if present
- payment method if inferable
- institution/account if present
- candidate payable bill match

### 8.3 Execution policy

#### Auto-execute

Auto-mark as paid only when all critical information is confidently identified:

- the bill match is clear
- amount is coherent
- payment signal is explicit enough
- no ambiguity between multiple pending bills

#### Ask confirmation

Ask a focused confirmation when:

- more than one bill is plausible
- amount conflicts materially
- receipt is incomplete
- date is missing and matters
- OCR/transcription confidence is weak

The confirmation must be minimal and direct, for example:

- "Achei duas contas possíveis: energia e água. Qual foi?"
- "Vi o comprovante, mas o valor não ficou claro. Foi R$ 132,40?"

### 8.4 Response format after receipt analysis

When Ana Clara auto-executes after a receipt, the response must explicitly summarize:

- what she detected
- what bill she matched
- whether she marked it as paid
- what date/value/account she used
- whether anything else remains pending

This keeps the automation transparent and auditable in the group.

---

## 9. Security and Access Rules

### 9.1 Allowed responders

Only configured participants may activate Ana Clara in this first rollout.

### 9.2 Silent handling of non-authorized users

Non-authorized participants do not get feedback from Ana Clara in the group.

### 9.3 Limited auto-execution scope

Auto-execution applies only to the approved receipt-payment flow in the configured group.

No new destructive operations should be silently enabled as part of this subproject.

### 9.4 Config ownership

`ana_clara_config` must remain scoped to the current authenticated user and service-role backend logic, consistent with the rest of the project's agent configuration architecture.

---

## 10. Error Handling

### 10.1 Group config missing

If no config exists:

- do not break current direct-message flow
- group mode stays disabled

### 10.2 Group memory failure

If passive-memory storage fails:

- continue processing
- do not block responses

### 10.3 Audio transcription failure

If transcription fails:

- do not wake on audio
- do not guess trigger presence
- optionally log for diagnostics

### 10.4 Receipt extraction failure

If OCR or receipt understanding fails:

- do not auto-execute
- ask for manual clarification if a response was triggered

### 10.5 Session-state corruption

If session payload is invalid or expired:

- clear it
- fall back to hibernating state

---

## 11. Testing Strategy

### 11.1 Unit tests

Add focused tests for:

- trigger detection
- dismiss detection
- authorized participant gating
- session timeout behavior
- receipt-trigger detection
- audio-trigger detection using transcription text
- receipt execution decision logic

### 11.2 Integration tests

Add integration coverage for:

- group message enters passive memory without response
- authorized text trigger opens session
- authorized receipt wakes Ana Clara automatically
- session continuation works without repeated trigger
- session expires after 5 minutes
- dismiss phrase closes session early
- high-confidence receipt triggers auto-mark flow
- ambiguous receipt produces confirmation request

### 11.3 Manual validation

Manual WhatsApp checks for the real group:

- confirm silent background mode
- confirm wake by text trigger
- confirm wake by audio containing name
- confirm no wake by audio without name
- confirm receipt-trigger analysis
- confirm auto-hibernation after 5 minutes
- confirm dismiss phrase closes session

---

## 12. Future Compatibility

This design intentionally prepares the next layers:

### 12.1 Settings UI

The config model can power:

- a dedicated Ana Clara settings section
- or a subsection inside existing AI/Integrations settings

It supports:

- group onboarding
- participant allowlist editing
- trigger editing
- timeout tuning
- receipt automation toggles

### 12.2 Internal chat

The config model is also future-safe for Ana Clara inside the web app because:

- channel-specific enablement can live in the same config row
- personality/model settings remain shared
- richer HTML output can be added at the UI layer without redesigning the backend identity/config contract

---

## 13. Implementation Boundaries

This project should be implemented additively with the following rules:

- do not refactor away the current direct-message pipeline
- do not remove Phase A or Phase B memory work
- migration first for all new schema requirements
- deploy backend changes as part of the same rollout
- keep the new group-mode branch isolated and testable
- avoid worktrees for this project, per user instruction

---

## 14. Summary

The approved design is a Mike-like dedicated group-mode backend for Ana Clara:

- silent by default
- wakes on text trigger, audio trigger, or receipt
- hibernates after 5 minutes
- supports explicit dismiss
- stores passive group memory
- auto-processes receipts
- auto-executes bill payment marking only when confidence is high
- summarizes what it did
- remains additive to the current architecture
- is designed to later feed both a settings UI and the internal Ana Clara chat
