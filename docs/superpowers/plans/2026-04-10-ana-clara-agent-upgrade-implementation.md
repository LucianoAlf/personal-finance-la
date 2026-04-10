# Ana Clara Agent Upgrade - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Ana Clara from a conversational assistant into an autonomous financial copilot with persistent memory, proactive intelligence, and integrated agenda reading — inspired by the OpenClaw/Alfredo agent architecture.

**Architecture:** Supabase Edge Functions (Deno) + PostgreSQL with pgvector for semantic memory + pg_cron for proactive notifications + OpenAI embeddings for RAG. The agent identity, memory, and autonomy rules live in database tables with RLS, loaded dynamically per-request. The NLP classifier is enhanced with contextual memory injection.

**Tech Stack:** Supabase (PostgreSQL, pgvector, pg_cron, Edge Functions/Deno), OpenAI (GPT-4 + text-embedding-3-small), UAZAPI (WhatsApp), TickTick API, React/TypeScript (frontend settings).

**Spec:** `docs/superpowers/specs/2026-04-10-ana-clara-agent-upgrade-design.md`

---

## SAFETY RULES (read before implementing ANY task)

> **ADITIVO, NUNCA DESTRUTIVO.** A Ana Clara já funciona. O objetivo é adicionar inteligência sem tocar no que já existe.

1. **NUNCA remover código existente** do `nlp-classifier.ts`, `index.ts`, ou qualquer handler. Apenas adicionar.
2. **O system prompt existente (`gerarSystemPrompt`) é PRESERVADO integralmente** — incluindo `## SUA IDENTIDADE`, `## SOBRE O SISTEMA PERSONAL FINANCE`, `## REGRAS DE HUMANIZAÇÃO`. Os blocos novos (soul, memórias, agenda) são INSERIDOS como seções adicionais no prompt, não substituem as seções existentes.
3. **A assinatura de `classificarIntencaoNLP` NÃO muda** — os novos dados (soul, memórias, agenda) são passados via um objeto de contexto opcional que `gerarSystemPrompt` recebe como último parâmetro com default `{}`.
4. **Todos os módulos novos são isolados em arquivos separados** — `_shared/ana-clara-soul.ts`, `_shared/agent-memory.ts`, `_shared/autonomy-engine.ts`, `_shared/challenge-engine.ts`, `_shared/day-context-builder.ts`. Zero acoplamento com handlers existentes.
5. **Erros nos módulos novos NUNCA bloqueiam o fluxo** — todo ponto de integração usa try/catch com fallback para comportamento original (prompt sem memórias, sem soul extra, sem autonomia).
6. **Feature flags por usuário** — cada capacidade nova pode ser ligada/desligada via campos em `agent_identity`. Usuário sem row na tabela = comportamento atual 100% preservado.
7. **Autonomia é OBSERVACIONAL na primeira versão** — ela classifica a ação mas NÃO bloqueia handlers existentes. Apenas adiciona texto na resposta ("Registrei automaticamente" vs "Quer confirmar?"). O fluxo de handlers continua exatamente como hoje.

---

## Phase 0: TickTick Sync Fix (payable_bills)

> Bug: Contas marcadas como pagas no TickTick (pelo Alfredo) não atualizam `payable_bills`.

### Task 0: Fix Inbound Sync for Payable Bills

**Files:**
- Modify: `supabase/functions/calendar-sync-ticktick/index.ts` (add ~20 lines in the `origin_type === 'payable_bill'` + `inbound_update` branch)

- [ ] **Step 1: Locate the current stub**

In `index.ts`, find the block where `action === 'inbound_update'` and `linkRow.origin_type === 'payable_bill'`. Currently it only writes an observation to the link row and continues.

- [ ] **Step 2: Add payable_bills status update**

AFTER the existing link update (keep it), add:

```typescript
// If TickTick task is completed (status 2), mark the bill as paid
if (task.status === 2 && linkRow.origin_id) {
  const { error: billErr } = await supabase
    .from('payable_bills')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', linkRow.origin_id)
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue']);

  if (!billErr) {
    console.log(`[ticktick-sync] Marked payable_bill ${linkRow.origin_id} as paid (from TickTick completion)`);
  } else {
    console.error(`[ticktick-sync] Failed to mark bill as paid:`, billErr);
  }
}
```

- [ ] **Step 3: Test manually**

Mark a test bill as complete in TickTick. Wait up to 10 minutes (cron interval). Verify `payable_bills.status` changed to `'paid'` in the database.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/calendar-sync-ticktick/index.ts
git commit -m "fix(sync): update payable_bills when TickTick task is marked as completed"
```

---

## Phase 1: Agent Foundation — Identity & Soul

> Add the agent's soul and identity system as NEW modules. The existing system prompt is preserved — soul is injected as an ADDITIONAL section.

### Task 1: Create Agent Identity Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_agent_identity.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Agent identity and soul per user
CREATE TABLE IF NOT EXISTS agent_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soul_config JSONB NOT NULL DEFAULT '{
    "name": "Ana Clara",
    "emoji": "🙋🏻‍♀️",
    "role": "Personal Finance Copilot",
    "personality": {
      "traits": ["direta", "proativa", "desafiadora", "empática", "persistente"],
      "tone": "amiga próxima que entende de finanças e não tem medo de falar a verdade",
      "anti_patterns": [
        "nunca dizer ótima pergunta ou com certeza",
        "nunca concordar por educação quando discorda",
        "nunca dar resposta genérica que serve pra qualquer um",
        "nunca desistir de entender o que o usuário quis dizer",
        "nunca usar linguagem corporativa ou formal demais"
      ]
    }
  }',
  user_context JSONB NOT NULL DEFAULT '{}',
  autonomy_rules JSONB NOT NULL DEFAULT '{
    "auto_execute": [
      "register_transaction_high_confidence",
      "categorize_automatically",
      "assign_single_account",
      "generate_insights",
      "send_proactive_notifications",
      "update_memory",
      "read_agenda"
    ],
    "require_confirmation": [
      "delete_any_data",
      "mark_bill_as_paid",
      "edit_transaction_amount",
      "create_recurring_bill",
      "any_money_movement",
      "share_data_externally"
    ],
    "soft_confirmation": [
      "change_category",
      "assign_account_multiple_options"
    ]
  }',
  notification_preferences JSONB NOT NULL DEFAULT '{
    "morning_briefing": "08:00",
    "daily_summary": "20:00",
    "weekly_summary_day": "sunday",
    "weekly_summary_time": "09:00",
    "bill_alert_days_before": 3,
    "anomaly_alerts": true,
    "goal_reminders": true,
    "tips_per_week": 2
  }',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE agent_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own agent identity"
  ON agent_identity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own agent identity"
  ON agent_identity FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agent identity"
  ON agent_identity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to agent_identity"
  ON agent_identity FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-create identity on first user interaction
CREATE OR REPLACE FUNCTION ensure_agent_identity(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM agent_identity WHERE user_id = p_user_id;
  IF v_id IS NULL THEN
    INSERT INTO agent_identity (user_id)
    VALUES (p_user_id)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Apply migration locally**

Run: `npx supabase migration new create_agent_identity`
Then copy the SQL content into the generated file.
Run: `npx supabase db push` (or `npx supabase db reset` for local)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/*_create_agent_identity.sql
git commit -m "feat(agent): create agent_identity table with soul, context, autonomy rules"
```

---

### Task 2: Create Ana Clara Soul Module

**Files:**
- Create: `supabase/functions/_shared/ana-clara-soul.ts`

- [ ] **Step 1: Write the soul module**

```typescript
/**
 * Ana Clara Soul — the agent's core identity, loaded every request.
 * Equivalent to SOUL.md + IDENTITY.md in OpenClaw/Alfredo.
 *
 * This module provides the default soul and builds the identity block
 * for the system prompt. User-specific overrides come from agent_identity table.
 */

export interface SoulConfig {
  name: string;
  emoji: string;
  role: string;
  personality: {
    traits: string[];
    tone: string;
    anti_patterns: string[];
  };
}

export interface UserContext {
  display_name?: string;
  first_name?: string;
  timezone?: string;
  wake_time?: string;
  sleep_time?: string;
  communication_style?: string;
  family_notes?: string;
  financial_goals_summary?: string;
  occupation?: string;
  notes?: string;
}

export interface AutonomyRules {
  auto_execute: string[];
  require_confirmation: string[];
  soft_confirmation: string[];
}

export interface NotificationPreferences {
  morning_briefing: string;
  daily_summary: string;
  weekly_summary_day: string;
  weekly_summary_time: string;
  bill_alert_days_before: number;
  anomaly_alerts: boolean;
  goal_reminders: boolean;
  tips_per_week: number;
}

export const DEFAULT_SOUL: SoulConfig = {
  name: 'Ana Clara',
  emoji: '🙋🏻‍♀️',
  role: 'Personal Finance Copilot',
  personality: {
    traits: ['direta', 'proativa', 'desafiadora', 'empática', 'persistente'],
    tone: 'amiga próxima que entende de finanças e não tem medo de falar a verdade',
    anti_patterns: [
      'nunca dizer "ótima pergunta" ou "com certeza"',
      'nunca concordar por educação quando discorda',
      'nunca dar resposta genérica que serve pra qualquer um',
      'nunca desistir de entender o que o usuário quis dizer',
      'nunca usar linguagem corporativa ou formal demais',
      'nunca fingir entusiasmo que não sente',
      'nunca dizer "não sei" sem antes esgotar alternativas',
    ],
  },
};

export function buildSoulPromptBlock(
  soul: SoulConfig,
  userCtx: UserContext,
  autonomy: AutonomyRules,
): string {
  const firstName = userCtx.first_name || userCtx.display_name?.split(' ')[0] || 'amigo';

  return `## QUEM EU SOU
Nome: ${soul.name} ${soul.emoji}
Papel: ${soul.role}
Tom: ${soul.personality.tone}
Traços: ${soul.personality.traits.join(', ')}

## O QUE NUNCA FAÇO
${soul.personality.anti_patterns.map((p) => `- ${p}`).join('\n')}

## QUEM É O USUÁRIO
Nome: ${userCtx.display_name || firstName} (chamar de ${firstName})
${userCtx.timezone ? `Timezone: ${userCtx.timezone}` : ''}
${userCtx.occupation ? `Ocupação: ${userCtx.occupation}` : ''}
${userCtx.family_notes ? `Família: ${userCtx.family_notes}` : ''}
${userCtx.financial_goals_summary ? `Metas: ${userCtx.financial_goals_summary}` : ''}
${userCtx.communication_style ? `Estilo de comunicação: ${userCtx.communication_style}` : ''}
${userCtx.notes ? `Notas: ${userCtx.notes}` : ''}

## AUTONOMIA
Faço sozinha (sem perguntar): ${autonomy.auto_execute.join(', ')}
Sempre confirmo antes: ${autonomy.require_confirmation.join(', ')}
Confirmação suave (sugiro e aplico se não corrigir): ${autonomy.soft_confirmation.join(', ')}

## COMO PENSO JUNTO COM O USUÁRIO
- CAPTURO o que ele diz antes que esqueça
- ORGANIZO o caos de gastos em estrutura clara
- QUESTIONO quando vejo gasto fora do padrão
- EXECUTO quando é seguro e claro
- LEMBRO o que ele esqueceu — sou a memória financeira dele
- DESAFIO quando necessário — não sou eco, sou copiloto`.trim();
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit supabase/functions/_shared/ana-clara-soul.ts` (or rely on Deno check within edge function context)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/ana-clara-soul.ts
git commit -m "feat(agent): create ana-clara-soul module with identity, context, autonomy types"
```

---

### Task 3: Inject Soul as Additional Context in NLP Classifier

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/index.ts` (add ~15 lines: load identity, pass to classifier)
- Modify: `supabase/functions/process-whatsapp-message/nlp-classifier.ts` (add ~10 lines: accept optional enrichment, APPEND to existing prompt)

**SAFETY:** The existing `## SUA IDENTIDADE`, `## SOBRE O SISTEMA PERSONAL FINANCE`, and `## REGRAS DE HUMANIZAÇÃO` blocks are **NOT touched**. The soul block is APPENDED as an additional `## PERFIL PROFUNDO DO AGENTE` section after the existing identity.

- [ ] **Step 1: Add soul loading to index.ts (additive)**

In `process-whatsapp-message/index.ts`, BEFORE the call to `classificarIntencaoNLP`, add a try/catch block that loads agent identity. If it fails or doesn't exist, the variable is `null` and nothing changes.

```typescript
import { buildSoulPromptBlock, DEFAULT_SOUL, type SoulConfig, type UserContext, type AutonomyRules } from '../_shared/ana-clara-soul.ts';

// Additive: load enrichment context. Failure = no enrichment, existing flow unchanged.
let agentEnrichment: { soulBlock: string; autonomy: AutonomyRules } | null = null;
try {
  const { data: identity } = await supabase
    .from('agent_identity')
    .select('soul_config, user_context, autonomy_rules')
    .eq('user_id', userId)
    .maybeSingle();

  if (identity) {
    const soul: SoulConfig = identity.soul_config ?? DEFAULT_SOUL;
    const userCtx: UserContext = identity.user_context ?? { display_name: userName };
    const autonomy: AutonomyRules = identity.autonomy_rules ?? DEFAULT_SOUL.autonomy_defaults;
    agentEnrichment = {
      soulBlock: buildSoulPromptBlock(soul, userCtx, autonomy),
      autonomy,
    };
  }
} catch (err) {
  console.error('[agent-soul] Failed to load identity, continuing with default behavior:', err);
}
```

- [ ] **Step 2: Add optional enrichment parameter to gerarSystemPrompt (additive)**

In `nlp-classifier.ts`, add a LAST optional parameter to `gerarSystemPrompt`:

```typescript
function gerarSystemPrompt(
  memoriaUsuario: string,
  historicoConversa: string,
  dataHoraAtual: string,
  contasDisponiveis: string,
  categoriasDisponiveis: string,
  nomeUsuario?: string,
  contasAPagar?: string,
  // NEW: optional enrichment — all existing params unchanged
  agentEnrichment?: {
    soulBlock?: string;
    memoriasRelevantes?: string;
    agendaHoje?: string;
  },
): string {
```

At the END of the prompt string (before the closing backtick), APPEND:

```typescript
${agentEnrichment?.soulBlock ? `\n\n${agentEnrichment.soulBlock}` : ''}
${agentEnrichment?.memoriasRelevantes ? `\n\n${agentEnrichment.memoriasRelevantes}` : ''}
${agentEnrichment?.agendaHoje ? `\n\n${agentEnrichment.agendaHoje}` : ''}
```

This way: no enrichment = prompt identical to today. With enrichment = extra context appended.

- [ ] **Step 3: Pass enrichment when calling gerarSystemPrompt**

Find the call to `gerarSystemPrompt(...)` inside `classificarIntencaoNLP` and add the enrichment object as the last argument. The enrichment comes from the caller (index.ts) via a new optional parameter on `classificarIntencaoNLP`:

```typescript
export async function classificarIntencaoNLP(
  texto: string,
  userId: string,
  supabaseUrl: string,
  supabaseKey: string,
  agentEnrichment?: { soulBlock?: string; memoriasRelevantes?: string; agendaHoje?: string },
): Promise<IntencaoClassificada> {
```

Then pass `agentEnrichment` as the last arg to `gerarSystemPrompt(...)`.

- [ ] **Step 4: Update the call site in index.ts**

Where `classificarIntencaoNLP(texto, userId, ...)` is called, add the optional enrichment:

```typescript
const classificacao = await classificarIntencaoNLP(
  texto, userId, supabaseUrl, supabaseKey,
  agentEnrichment ? { soulBlock: agentEnrichment.soulBlock } : undefined,
);
```

- [ ] **Step 5: NLP regression test (baseline)**

BEFORE deploying with enrichment, test 20 real messages against the CURRENT classifier and save the results (intent, confidence, entities) as a baseline JSON file. Example messages:

```
"gastei 50 no mercado", "paguei a luz", "quanto gastei esse mês",
"fatura do nubank", "meus cartões", "saldo", "transferi 100 pro itaú",
"comprei uma tv de 2000 em 10x no nubank", "exclui essa", "era 95",
"minhas contas a pagar", "contas vencendo", "muda pra nubank",
"ajuda", "obrigado", "bom dia", "o que você faz",
"prefiro pagar pelo nubank", "paguei a academia", "resumo do mês",
"quanto recebi"
```

Save baseline to `supabase/functions/process-whatsapp-message/__tests__/nlp-baseline.json`.

- [ ] **Step 6: Test with enrichment**

Test the same 20 messages WITH an `agent_identity` row. Compare intents and confidence. If accuracy drops on any message, the enrichment text is interfering and needs adjustment (likely too long or conflicting with existing prompt sections).

- [ ] **Step 7: Test without agent_identity row**

Delete the `agent_identity` row and test again. Behavior should be 100% identical to baseline.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/process-whatsapp-message/nlp-classifier.ts
git add supabase/functions/process-whatsapp-message/index.ts
git commit -m "feat(agent): inject soul context as additive prompt section (preserves all existing behavior)"
```

---

## Phase 2: Persistent Memory System

> Build the memory layer: storage, embeddings, RAG search, and auto-extraction.

### Task 4: Create Memory Tables Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_create_agent_memory.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Enable pgvector if not already
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agent_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'decision', 'lesson', 'preference', 'pattern', 'note', 'feedback'
  )),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  embedding vector(1536),
  source TEXT DEFAULT 'system' CHECK (source IN ('conversation', 'system', 'user_explicit')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_memory_user ON agent_memory_entries(user_id);
CREATE INDEX idx_agent_memory_type ON agent_memory_entries(user_id, memory_type);
CREATE INDEX idx_agent_memory_tags ON agent_memory_entries USING GIN(tags);
CREATE INDEX idx_agent_memory_fts ON agent_memory_entries
  USING GIN(to_tsvector('portuguese', content));

-- Vector index (IVFFlat for cost-effective similarity search)
CREATE INDEX idx_agent_memory_embedding ON agent_memory_entries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE agent_memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own memories"
  ON agent_memory_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access memories"
  ON agent_memory_entries FOR ALL USING (auth.role() = 'service_role');

-- Semantic search RPC
CREATE OR REPLACE FUNCTION search_agent_memories(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.5,
  p_match_count INT DEFAULT 5,
  p_memory_types TEXT[] DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  content TEXT,
  metadata JSONB,
  tags TEXT[],
  similarity FLOAT
) AS $$
  SELECT
    m.id, m.memory_type, m.content, m.metadata, m.tags,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM agent_memory_entries m
  WHERE m.user_id = p_user_id
    AND m.embedding IS NOT NULL
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$ LANGUAGE sql STABLE;

-- Daily sessions table
CREATE TABLE IF NOT EXISTS agent_daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  summary TEXT,
  highlights JSONB DEFAULT '[]',
  decisions_made JSONB DEFAULT '[]',
  pending_items JSONB DEFAULT '[]',
  financial_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, session_date)
);

ALTER TABLE agent_daily_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own sessions"
  ON agent_daily_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access sessions"
  ON agent_daily_sessions FOR ALL USING (auth.role() = 'service_role');

-- Pending tasks / heartbeat
CREATE TABLE IF NOT EXISTS agent_pending_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE agent_pending_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tasks"
  ON agent_pending_tasks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access tasks"
  ON agent_pending_tasks FOR ALL USING (auth.role() = 'service_role');

-- Observability: log every agent decision (autonomy, memory save, challenge)
CREATE TABLE IF NOT EXISTS agent_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_action_log_user ON agent_action_log(user_id, created_at DESC);

ALTER TABLE agent_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access action_log"
  ON agent_action_log FOR ALL USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase migration new create_agent_memory`
Copy SQL, then: `npx supabase db push`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/*_create_agent_memory.sql
git commit -m "feat(agent): create agent_memory_entries, daily_sessions, pending_tasks tables with pgvector"
```

---

### Task 5: Create Memory Manager Module

**Files:**
- Create: `supabase/functions/_shared/agent-memory.ts`

- [ ] **Step 1: Write the memory manager**

```typescript
/**
 * Agent Memory Manager
 * Handles embedding generation, memory storage, and semantic search.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type MemoryType = 'decision' | 'lesson' | 'preference' | 'pattern' | 'note' | 'feedback';
export type MemorySource = 'conversation' | 'system' | 'user_explicit';

export interface MemoryEntry {
  id?: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  source?: MemorySource;
  expires_at?: string | null;
}

export interface MemorySearchResult {
  id: string;
  memory_type: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
  similarity: number;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const EMBEDDING_MODEL = 'text-embedding-3-small';

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: EMBEDDING_MODEL,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export async function saveMemory(
  supabase: SupabaseClient,
  entry: MemoryEntry,
): Promise<string> {
  const embedding = await generateEmbedding(entry.content);

  // Deduplication: check for similar existing memory before inserting
  const { data: existing } = await supabase.rpc('search_agent_memories', {
    p_user_id: entry.user_id,
    p_query_embedding: embedding,
    p_match_threshold: 0.85,
    p_match_count: 1,
    p_memory_types: [entry.memory_type],
  });

  if (existing?.length > 0) {
    // Update existing memory instead of creating duplicate
    await supabase
      .from('agent_memory_entries')
      .update({
        content: entry.content,
        metadata: entry.metadata ?? {},
        tags: entry.tags ?? [],
        embedding,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id);
    console.log(`[agent-memory] Updated existing memory ${existing[0].id} instead of creating duplicate`);
    return existing[0].id;
  }

  const { data, error } = await supabase
    .from('agent_memory_entries')
    .insert({
      user_id: entry.user_id,
      memory_type: entry.memory_type,
      content: entry.content,
      metadata: entry.metadata ?? {},
      tags: entry.tags ?? [],
      embedding,
      source: entry.source ?? 'system',
      expires_at: entry.memory_type === 'pattern' ? new Date(Date.now() + 90 * 86400000).toISOString() : null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function searchMemories(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  options?: {
    matchThreshold?: number;
    matchCount?: number;
    memoryTypes?: MemoryType[];
  },
): Promise<MemorySearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase.rpc('search_agent_memories', {
      p_user_id: userId,
      p_query_embedding: queryEmbedding,
      p_match_threshold: options?.matchThreshold ?? 0.5,
      p_match_count: options?.matchCount ?? 5,
      p_memory_types: options?.memoryTypes ?? null,
    });

    if (error) throw error;
    return (data ?? []) as MemorySearchResult[];
  } catch (err) {
    // Fallback to FTS if embedding fails (OpenAI down, rate limit, etc.)
    console.warn('[agent-memory] Embedding search failed, falling back to FTS:', err);
    return searchMemoriesFTS(supabase, userId, query, options?.matchCount ?? 5);
  }
}

const MAX_MEMORY_TOKENS = 400; // ~100 tokens per memory, max 4-5 memories in prompt

export function formatMemoriesForPrompt(memories: MemorySearchResult[]): string {
  if (memories.length === 0) return '';

  const typeLabel: Record<string, string> = {
    decision: 'Decisão',
    lesson: 'Lição',
    preference: 'Preferência',
    pattern: 'Padrão',
    note: 'Nota',
    feedback: 'Feedback',
  };

  const lines: string[] = [];
  let estimatedTokens = 20; // header
  for (const m of memories) {
    const line = `- [${typeLabel[m.memory_type] ?? m.memory_type}] ${m.content}`;
    const lineTokens = Math.ceil(line.length / 4); // rough estimate: 4 chars per token
    if (estimatedTokens + lineTokens > MAX_MEMORY_TOKENS) break;
    lines.push(line);
    estimatedTokens += lineTokens;
  }

  if (lines.length === 0) return '';
  return `## MEMÓRIAS RELEVANTES (o que já sei sobre esta situação)\n${lines.join('\n')}`;
}

// FTS fallback when embedding API fails
export async function searchMemoriesFTS(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  matchCount: number = 5,
): Promise<MemorySearchResult[]> {
  const { data, error } = await supabase
    .from('agent_memory_entries')
    .select('id, memory_type, content, metadata, tags')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .textSearch('content', query, { type: 'websearch', config: 'portuguese' })
    .limit(matchCount);

  if (error || !data) return [];
  return data.map((m) => ({ ...m, similarity: 0.5 })) as MemorySearchResult[];
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/agent-memory.ts
git commit -m "feat(agent): create agent-memory module with embeddings, search, and prompt formatting"
```

---

### Task 6: Integrate Memory into NLP Pipeline (Additive)

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/index.ts` (add ~25 lines in the enrichment block)

**SAFETY:** Uses the same `agentEnrichment` pattern from Task 3. Memory search is wrapped in try/catch. If it fails, the existing `buscarMemoriaUsuario` (short-term memory) still works as before. The new RAG memories are APPENDED to the prompt via the enrichment object — they don't replace the existing `## MEMÓRIA DO USUÁRIO` section.

- [ ] **Step 1: Add memory search in index.ts (additive)**

In `process-whatsapp-message/index.ts`, AFTER the `agentEnrichment` block from Task 3 and BEFORE the call to `classificarIntencaoNLP`, add:

```typescript
import { searchMemories, formatMemoriesForPrompt } from '../_shared/agent-memory.ts';

// Additive: RAG memory search. Failure = no memories, existing flow unchanged.
let memoriasRelevantes = '';
try {
  if (agentEnrichment) {  // Only search if agent identity exists (feature flag)
    const memories = await searchMemories(supabase, userId, userMessage, {
      matchCount: 5,
      matchThreshold: 0.5,
    });
    memoriasRelevantes = formatMemoriesForPrompt(memories);
    console.log(`[agent-memory] Found ${memories.length} relevant memories`);
  }
} catch (err) {
  console.error('[agent-memory] Search failed, continuing without memories:', err);
}

// Extend enrichment with memories (if enrichment exists)
if (agentEnrichment && memoriasRelevantes) {
  agentEnrichment.soulBlock += '\n\n' + memoriasRelevantes;
}
```

No changes needed in `nlp-classifier.ts` — the enrichment.soulBlock already gets appended to the prompt via Task 3's mechanism.

- [ ] **Step 2: Add memory extraction after response (async, non-blocking)**

AFTER the handler returns a response (the existing response flow completes normally), add a fire-and-forget memory extraction:

```typescript
import { saveMemory } from '../_shared/agent-memory.ts';

// Additive: async memory extraction. NEVER blocks response.
if (agentEnrichment) {
  (async () => {
    try {
      if (classificacao.intencao === 'OUTRO' || classificacao.confianca < 0.5) return;

      // Detect preferences
      if (userMessage.toLowerCase().includes('prefiro') ||
          userMessage.toLowerCase().includes('sempre') ||
          userMessage.toLowerCase().includes('não gosto')) {
        await saveMemory(supabase, {
          user_id: userId,
          memory_type: 'preference',
          content: `Usuário disse: "${userMessage}" — Contexto: ${classificacao.explicacao}`,
          tags: ['auto-detected', classificacao.intencao.toLowerCase()],
          source: 'conversation',
        });
      }

      // Detect corrections (user changing account, category, etc.)
      if (classificacao.intencao.startsWith('EDITAR_') ||
          classificacao.intencao === 'MUDAR_CONTA') {
        await saveMemory(supabase, {
          user_id: userId,
          memory_type: 'lesson',
          content: `Quando ${userMessage}, o usuário quis: ${classificacao.explicacao}`,
          tags: ['correction', classificacao.intencao.toLowerCase()],
          source: 'conversation',
        });
      }
    } catch (err) {
      console.error('[agent-memory] Failed to save memory (non-blocking):', err);
    }
  })();
}
```

- [ ] **Step 3: Test end-to-end**

1. Test WITHOUT `agent_identity` row — behavior identical to today, no memory search happens
2. Create `agent_identity` row, send preference message, verify memory saved
3. Send related message later, verify memory appears in enriched prompt

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/process-whatsapp-message/index.ts
git commit -m "feat(agent): integrate RAG memory search and auto-extraction (additive, non-blocking)"
```

---

## Phase 3: Proactive Intelligence

> Upgrade crons from generic broadcasts to contextual, personalized alerts.

### Task 7: Create Morning Briefing Edge Function

**Files:**
- Create: `supabase/functions/send-morning-briefing/index.ts`

- [ ] **Step 1: Write the edge function**

```typescript
/**
 * Morning Briefing — sent daily at user-configured time (default 07:30)
 * Combines: agenda (TickTick + calendar_events), bills due today/tomorrow,
 * account balances, goal progress, and relevant memories.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { resolveTickTickApiToken } from '../_shared/integration-token.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find users whose morning_briefing time matches current hour
  const now = new Date();
  const brHour = parseInt(
    now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }),
  );
  const brMinute = parseInt(
    now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', minute: '2-digit' }),
  );
  const currentTime = `${String(brHour).padStart(2, '0')}:${String(brMinute).padStart(2, '0')}`;

  // Get users with WhatsApp connected and briefing time matching
  const { data: users } = await supabase
    .from('whatsapp_connections')
    .select('user_id, phone_number')
    .eq('connected', true)
    .eq('status', 'connected');

  if (!users?.length) {
    return new Response(JSON.stringify({ message: 'No active users' }));
  }

  const results = [];

  for (const user of users) {
    try {
      // Check notification preferences
      const { data: identity } = await supabase
        .from('agent_identity')
        .select('notification_preferences, soul_config')
        .eq('user_id', user.user_id)
        .maybeSingle();

      const prefs = identity?.notification_preferences ?? {};
      const briefingTime = prefs.morning_briefing ?? '07:30';

      // Only send if within 30min window of configured time
      const [targetH, targetM] = briefingTime.split(':').map(Number);
      const diffMin = (brHour * 60 + brMinute) - (targetH * 60 + targetM);
      if (diffMin < 0 || diffMin > 30) continue;

      // Build briefing content
      const agentName = identity?.soul_config?.name ?? 'Ana Clara';
      const briefing = await buildBriefing(supabase, user.user_id, agentName);

      if (briefing) {
        await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            user_id: user.user_id,
            message: briefing,
          },
        });
        results.push({ user_id: user.user_id, sent: true });
      }
    } catch (err) {
      console.error(`[morning-briefing] Error for ${user.user_id}:`, err);
      results.push({ user_id: user.user_id, sent: false, error: String(err) });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function buildBriefing(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  agentName: string,
): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // 1. Bills due today/tomorrow
  const { data: bills } = await supabase
    .from('payable_bills')
    .select('name, amount, due_date, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .lte('due_date', tomorrow)
    .order('due_date');

  // 2. Calendar events today
  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, display_start_at, display_end_at, event_type')
    .eq('user_id', userId)
    .gte('display_start_at', `${today}T00:00:00`)
    .lt('display_start_at', `${tomorrow}T23:59:59`)
    .order('display_start_at');

  // 3. Account balances
  const { data: accounts } = await supabase
    .from('accounts')
    .select('name, balance')
    .eq('user_id', userId)
    .eq('is_active', true);

  // 4. Goal progress (active goals)
  const { data: goals } = await supabase
    .from('savings_goals')
    .select('name, target_amount, current_amount, deadline')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(3);

  // Build message
  const parts: string[] = [];
  const hora = parseInt(
    new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      hour12: false,
    }),
  );
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  parts.push(`${saudacao}! Seu briefing de hoje:\n`);

  // Agenda
  if (events?.length) {
    parts.push('📅 *Agenda*');
    for (const ev of events) {
      const time = ev.display_start_at
        ? new Date(ev.display_start_at).toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
      parts.push(`  ${time ? time + ' — ' : ''}${ev.title}`);
    }
    parts.push('');
  }

  // Bills
  if (bills?.length) {
    parts.push('💰 *Contas*');
    for (const bill of bills) {
      const dueLabel = bill.due_date === today ? 'HOJE' : 'amanhã';
      const status = bill.status === 'overdue' ? ' ⚠️ ATRASADA' : '';
      parts.push(
        `  ${bill.name}: R$ ${Number(bill.amount).toFixed(2).replace('.', ',')} — vence ${dueLabel}${status}`,
      );
    }
    parts.push('');
  }

  // Balances
  if (accounts?.length) {
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    parts.push(`🏦 *Saldo total:* R$ ${totalBalance.toFixed(2).replace('.', ',')}`);
    parts.push('');
  }

  // Goals
  if (goals?.length) {
    parts.push('🎯 *Metas*');
    for (const g of goals) {
      const pct = g.target_amount > 0
        ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
        : 0;
      parts.push(`  ${g.name}: ${pct}%`);
    }
    parts.push('');
  }

  if (parts.length <= 1) return null;

  parts.push(`_${agentName} • Personal Finance_ 🙋🏻‍♀️`);
  return parts.join('\n');
}
```

- [ ] **Step 2: Create pg_cron migration for morning briefing**

```sql
-- Run every 30 minutes from 6am to 10am to catch different user preferences
SELECT cron.schedule(
  'send-morning-briefing',
  '*/30 6-10 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/send-morning-briefing',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    )
  ) AS request_id;
  $$
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-morning-briefing/index.ts
git add supabase/migrations/*_create_morning_briefing_cron.sql
git commit -m "feat(agent): create morning briefing with agenda + bills + balances + goals"
```

---

### Task 8: Create Anomaly Detection Edge Function

**Files:**
- Create: `supabase/functions/detect-spending-anomalies/index.ts`

- [ ] **Step 1: Write the anomaly detector**

This function runs after each transaction is registered. It compares the transaction against the user's spending patterns (stored as memories and historical data) to detect anomalies.

```typescript
/**
 * Spending Anomaly Detector
 * Called after transaction registration to detect unusual spending.
 * Sends WhatsApp alert if anomaly detected.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export async function checkSpendingAnomaly(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  transaction: {
    amount: number;
    category: string;
    description: string;
  },
): Promise<string | null> {
  // Get average spending in this category for last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: history } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .ilike('category', `%${transaction.category}%`)
    .gte('date', threeMonthsAgo.toISOString())
    .limit(100);

  if (!history?.length || history.length < 5) return null;

  const amounts = history.map((t) => Number(t.amount));
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const stdDev = Math.sqrt(
    amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length,
  );

  // Skip if all spending is identical (stdDev zero = no variance, avoid false positive)
  if (stdDev === 0) return null;

  // Alert if transaction is > 2 standard deviations above average
  const threshold = avg + 2 * stdDev;
  if (transaction.amount > threshold && transaction.amount > avg * 1.5) {
    const avgFormatted = avg.toFixed(2).replace('.', ',');
    const amountFormatted = transaction.amount.toFixed(2).replace('.', ',');
    return (
      `⚠️ *Gasto fora do padrão detectado*\n\n` +
      `Você gastou *R$ ${amountFormatted}* em ${transaction.category}.\n` +
      `Sua média nos últimos 3 meses nessa categoria é *R$ ${avgFormatted}*.\n\n` +
      `Tá tudo certo com esse gasto? Se precisar, posso te ajudar a entender onde tá indo mais dinheiro.`
    );
  }

  return null;
}
```

- [ ] **Step 2: Integrate into transaction registration flow**

In the transaction handler within `process-whatsapp-message`, after successfully registering a transaction, call:

```typescript
import { checkSpendingAnomaly } from './anomaly-detector.ts';

// After transaction saved:
const anomalyAlert = await checkSpendingAnomaly(supabase, userId, {
  amount: transacao.valor,
  category: transacao.categoria,
  description: transacao.descricao,
});

if (anomalyAlert) {
  // Append to response or send as separate follow-up
  responseMessage += '\n\n---\n\n' + anomalyAlert;
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/process-whatsapp-message/anomaly-detector.ts
git commit -m "feat(agent): add spending anomaly detection with statistical threshold"
```

---

## Phase 4: Autonomy & Challenge

> Implement the autonomy rules and the "challenge" behavior.

### Task 9: Implement Autonomy Engine (OBSERVATIONAL ONLY)

**Files:**
- Create: `supabase/functions/_shared/autonomy-engine.ts`
- Modify: `supabase/functions/process-whatsapp-message/index.ts` (add ~10 lines AFTER handler execution, not before)

**SAFETY CRITICAL:** The autonomy engine is OBSERVATIONAL in v1. It does NOT block or change the handler flow. It runs AFTER the handler returns, and only adds metadata to the response message (e.g., "Registrei automaticamente porque sua confianca era alta" or "Da proxima vez, posso registrar sem perguntar?"). The existing handler pipeline runs exactly as today.

- [ ] **Step 1: Write the autonomy engine (isolated module)**

```typescript
/**
 * Autonomy Engine v1 — OBSERVATIONAL ONLY
 * Classifies actions but does NOT block handlers.
 * Used to annotate responses and learn user preferences.
 */

import type { AutonomyRules } from './ana-clara-soul.ts';

export type AutonomyDecision = 'auto_execute' | 'require_confirmation' | 'soft_confirmation';

interface ActionContext {
  intent: string;
  confidence: number;
}

const INTENT_TO_ACTION: Record<string, string> = {
  REGISTRAR_DESPESA: 'register_transaction_high_confidence',
  REGISTRAR_RECEITA: 'register_transaction_high_confidence',
  REGISTRAR_TRANSFERENCIA: 'any_money_movement',
  EXCLUIR_TRANSACAO: 'delete_any_data',
  MARCAR_CONTA_PAGA: 'mark_bill_as_paid',
  EDITAR_VALOR: 'edit_transaction_amount',
  CADASTRAR_CONTA_PAGAR: 'create_recurring_bill',
  EDITAR_CONTA: 'change_category',
  EDITAR_CATEGORIA: 'change_category',
  PAGAR_FATURA: 'any_money_movement',
  COMPRA_CARTAO: 'register_transaction_high_confidence',
  COMPRA_PARCELADA: 'register_transaction_high_confidence',
};

export function evaluateAutonomy(
  rules: AutonomyRules,
  context: ActionContext,
): AutonomyDecision {
  const actionKey = INTENT_TO_ACTION[context.intent];
  if (!actionKey) return 'auto_execute';

  if (rules.require_confirmation.includes(actionKey)) return 'require_confirmation';
  if (rules.soft_confirmation.includes(actionKey)) return 'soft_confirmation';
  if (rules.auto_execute.includes(actionKey) && context.confidence >= 0.85) return 'auto_execute';
  if (context.confidence < 0.7) return 'require_confirmation';

  return 'soft_confirmation';
}
```

- [ ] **Step 2: Add observational annotation AFTER handler execution (additive)**

In `process-whatsapp-message/index.ts`, AFTER the handler has already executed and response message is ready to send, add:

```typescript
import { evaluateAutonomy } from '../_shared/autonomy-engine.ts';

// OBSERVATIONAL: classify autonomy AFTER handler ran. Does NOT change flow.
if (agentEnrichment?.autonomy) {
  try {
    const decision = evaluateAutonomy(agentEnrichment.autonomy, {
      intent: classificacao.intencao,
      confidence: classificacao.confianca,
    });
    // Log for future analysis — does NOT change the response yet
    console.log(`[autonomy] Intent=${classificacao.intencao} Confidence=${classificacao.confianca} Decision=${decision}`);
  } catch (err) {
    console.error('[autonomy] Classification failed (non-blocking):', err);
  }
}
```

In v2 (future), this will be moved to BEFORE the handler to enable actual gating. But v1 is observation-only.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/autonomy-engine.ts
git add supabase/functions/process-whatsapp-message/index.ts
git commit -m "feat(agent): implement autonomy engine v1 (observational only, does not change flow)"
```

---

### Task 10: Implement Challenge Behavior

**Files:**
- Modify: `supabase/functions/process-whatsapp-message/nlp-classifier.ts`
- Create: `supabase/functions/_shared/challenge-engine.ts`

- [ ] **Step 1: Write the challenge engine**

```typescript
/**
 * Challenge Engine
 * Determines when Ana Clara should push back on a financial decision.
 * Max 1 challenge per session to avoid annoying the user.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ChallengeContext {
  userId: string;
  intent: string;
  amount: number;
  category: string;
  description: string;
}

export async function shouldChallenge(
  supabase: SupabaseClient,
  ctx: ChallengeContext,
): Promise<string | null> {
  // Check if already challenged today
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('agent_memory_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .eq('memory_type', 'note')
    .contains('tags', ['challenge'])
    .gte('created_at', `${today}T00:00:00`);

  if ((count ?? 0) > 0) return null;

  // Check if spending goal exists for this category
  const { data: goals } = await supabase
    .from('spending_goals')
    .select('name, target_amount, current_amount')
    .eq('user_id', ctx.userId)
    .eq('status', 'active')
    .ilike('category', `%${ctx.category}%`)
    .limit(1);

  if (goals?.length) {
    const goal = goals[0];
    const newTotal = Number(goal.current_amount) + ctx.amount;
    const pct = Math.round((newTotal / Number(goal.target_amount)) * 100);

    if (pct >= 90) {
      // Save challenge memory
      await supabase.from('agent_memory_entries').insert({
        user_id: ctx.userId,
        memory_type: 'note',
        content: `Desafiei gasto de R$${ctx.amount} em ${ctx.category} — meta em ${pct}%`,
        tags: ['challenge', ctx.category.toLowerCase()],
        source: 'system',
      });

      return (
        `Registrei, mas preciso te avisar: com esse gasto, sua meta de *${goal.name}* ` +
        `já está em *${pct}%* do limite. ${pct >= 100 ? 'Já estourou.' : 'Tá no limite.'}\n\n` +
        `Quer que eu te mostre onde tá indo mais dinheiro nessa categoria?`
      );
    }
  }

  return null;
}
```

- [ ] **Step 2: Add challenge prompt instruction to soul**

In `ana-clara-soul.ts`, add to the `buildSoulPromptBlock` function:

```typescript
## QUANDO DESAFIAR O USUÁRIO
- Se gasto vai estourar uma meta: avise e pergunte
- Se gasto é muito acima da média da categoria: questione gentilmente
- Máximo 1 desafio por dia — não seja chata
- Se o usuário já foi desafiado e insistiu: respeite e registre
- Nunca desafie gastos com saúde ou emergência
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/challenge-engine.ts
git add supabase/functions/_shared/ana-clara-soul.ts
git commit -m "feat(agent): implement challenge engine — push back on spending near goal limits"
```

---

## Phase 5: Integrated Agenda Reading

> Make "o que tenho amanhã?" return agenda + financial context.

### Task 11: Create Unified Day Context Builder

**Files:**
- Create: `supabase/functions/_shared/day-context-builder.ts`

- [ ] **Step 1: Write the day context builder**

```typescript
/**
 * Unified Day Context Builder
 * Combines calendar events, TickTick tasks, bills, and goals
 * into a single view for a given date.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface DayContext {
  date: string;
  events: Array<{ title: string; time?: string; type: string }>;
  bills: Array<{ name: string; amount: number; status: string }>;
  goalAlerts: Array<{ name: string; message: string }>;
  summary: string;
}

export async function buildDayContext(
  supabase: SupabaseClient,
  userId: string,
  date: string,
): Promise<DayContext> {
  const nextDay = new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0];

  // Calendar events
  const { data: events } = await supabase
    .from('calendar_events')
    .select('title, display_start_at, display_end_at, event_type, subtitle')
    .eq('user_id', userId)
    .gte('display_start_at', `${date}T00:00:00`)
    .lt('display_start_at', `${nextDay}T00:00:00`)
    .order('display_start_at');

  // Bills due
  const { data: bills } = await supabase
    .from('payable_bills')
    .select('name, amount, status')
    .eq('user_id', userId)
    .eq('due_date', date)
    .in('status', ['pending', 'overdue']);

  // Goals near deadline
  const { data: goals } = await supabase
    .from('savings_goals')
    .select('name, target_amount, current_amount, deadline')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lte('deadline', nextDay)
    .gte('deadline', date);

  const ctx: DayContext = {
    date,
    events: (events ?? []).map((e) => ({
      title: e.title,
      time: e.display_start_at
        ? new Date(e.display_start_at).toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
      type: e.event_type ?? 'event',
    })),
    bills: (bills ?? []).map((b) => ({
      name: b.name,
      amount: Number(b.amount),
      status: b.status,
    })),
    goalAlerts: (goals ?? []).map((g) => ({
      name: g.name,
      message: `Meta "${g.name}" vence hoje — ${Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)}% atingido`,
    })),
    summary: '',
  };

  // Build human-readable summary
  const parts: string[] = [];
  if (ctx.events.length) {
    parts.push(`${ctx.events.length} compromisso(s)`);
  }
  if (ctx.bills.length) {
    const total = ctx.bills.reduce((s, b) => s + b.amount, 0);
    parts.push(`${ctx.bills.length} conta(s) vencendo (R$ ${total.toFixed(2).replace('.', ',')})`);
  }
  if (ctx.goalAlerts.length) {
    parts.push(`${ctx.goalAlerts.length} meta(s) no prazo`);
  }
  ctx.summary = parts.length ? parts.join(', ') : 'Dia tranquilo';

  return ctx;
}

export function formatDayContextForPrompt(ctx: DayContext): string {
  const lines: string[] = [`## AGENDA DE HOJE (${ctx.date})`];

  if (ctx.events.length) {
    lines.push('Compromissos:');
    for (const e of ctx.events) {
      lines.push(`  - ${e.time ? e.time + ' ' : ''}${e.title} (${e.type})`);
    }
  }

  if (ctx.bills.length) {
    lines.push('Contas vencendo:');
    for (const b of ctx.bills) {
      lines.push(`  - ${b.name}: R$ ${b.amount.toFixed(2).replace('.', ',')} ${b.status === 'overdue' ? '(ATRASADA)' : ''}`);
    }
  }

  if (ctx.goalAlerts.length) {
    lines.push('Metas:');
    for (const g of ctx.goalAlerts) {
      lines.push(`  - ${g.message}`);
    }
  }

  lines.push(`Resumo: ${ctx.summary}`);
  return lines.join('\n');
}
```

- [ ] **Step 2: Inject day context into NLP prompt**

In `process-whatsapp-message/index.ts`:

```typescript
import { buildDayContext, formatDayContextForPrompt } from '../_shared/day-context-builder.ts';

const today = new Date().toISOString().split('T')[0];
let agendaHoje = '';
try {
  const dayCtx = await buildDayContext(supabase, userId, today);
  agendaHoje = formatDayContextForPrompt(dayCtx);
} catch (err) {
  console.error('[day-context] Failed to build:', err);
}
```

Pass `agendaHoje` to `gerarSystemPrompt()`.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/day-context-builder.ts
git add supabase/functions/process-whatsapp-message/index.ts
git commit -m "feat(agent): create unified day context builder — agenda + bills + goals in prompt"
```

---

## Phase 6: Daily Sessions & Reflection

> End-of-day summary generation and session logging.

### Task 12: Create Session Generator

**Files:**
- Create: `supabase/functions/generate-daily-session/index.ts`

- [ ] **Step 1: Write the session generator**

This function runs at end of day (via cron) and generates a reflection of what happened financially.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];

  const { data: users } = await supabase
    .from('whatsapp_connections')
    .select('user_id')
    .eq('connected', true);

  for (const user of users ?? []) {
    try {
      // Financial snapshot
      const { data: txns } = await supabase
        .from('transactions')
        .select('type, amount, category, description')
        .eq('user_id', user.user_id)
        .gte('date', `${today}T00:00:00`)
        .lt('date', `${today}T23:59:59`);

      const expenses = (txns ?? []).filter((t) => t.type === 'expense');
      const income = (txns ?? []).filter((t) => t.type === 'income');

      const snapshot = {
        total_expenses: expenses.reduce((s, t) => s + Number(t.amount), 0),
        total_income: income.reduce((s, t) => s + Number(t.amount), 0),
        transaction_count: (txns ?? []).length,
        top_categories: Object.entries(
          expenses.reduce(
            (acc, t) => {
              acc[t.category ?? 'outros'] = (acc[t.category ?? 'outros'] || 0) + Number(t.amount);
              return acc;
            },
            {} as Record<string, number>,
          ),
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([cat, amt]) => ({ category: cat, amount: amt })),
      };

      // Decisions made today (from memory)
      const { data: decisions } = await supabase
        .from('agent_memory_entries')
        .select('content')
        .eq('user_id', user.user_id)
        .in('memory_type', ['decision', 'preference'])
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // Bills paid today
      const { data: paidBills } = await supabase
        .from('bill_payment_history')
        .select('bill_name, amount')
        .eq('user_id', user.user_id)
        .gte('paid_at', `${today}T00:00:00`);

      await supabase.from('agent_daily_sessions').upsert({
        user_id: user.user_id,
        session_date: today,
        financial_snapshot: snapshot,
        decisions_made: (decisions ?? []).map((d) => d.content),
        highlights: [
          ...(paidBills ?? []).map((b) => `Conta paga: ${b.bill_name}`),
          ...(snapshot.top_categories.length
            ? [`Top gasto: ${snapshot.top_categories[0].category}`]
            : []),
        ],
      });
    } catch (err) {
      console.error(`[daily-session] Error for ${user.user_id}:`, err);
    }
  }

  return new Response(JSON.stringify({ ok: true }));
});
```

- [ ] **Step 2: Create pg_cron migration**

```sql
SELECT cron.schedule(
  'generate-daily-sessions',
  '0 3 * * *',  -- 3am UTC = midnight BRT
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/generate-daily-session',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    )
  ) AS request_id;
  $$
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/generate-daily-session/index.ts
git add supabase/migrations/*_create_daily_session_cron.sql
git commit -m "feat(agent): create daily session generator with financial snapshots and decision tracking"
```

---

## Phase Summary & Dependencies

### Recommended execution order (Alfredo-reviewed)

```
1. Phase 0 (TickTick Fix)   → Task 0     (~20min, no deps, immediate value)
2. Phase 1 (Foundation)     → Tasks 1-3  (2-3h, creates tables + modules)
3. Phase 5 (Agenda)         → Task 11    (1-2h, simpler than memory, delivers value fast)
4. Phase 2 (Memory)         → Tasks 4-6  (3-4h, needs dedup + flush, depends on Phase 1)
5. Phase 3 (Proactivity)    → Tasks 7-8  (2-3h, benefits from Phase 2 memories)
6. Phase 4 (Autonomy)       → Tasks 9-10 (1-2h, OBSERVATIONAL ONLY in v1)
7. Phase 6 (Sessions)       → Task 12    (1-2h, depends on Phase 2)
```

**Estimated total:** 12-16h of focused development.

**Phase 7 (Open Finance)** is out of scope for this plan. It builds on top of all previous phases and requires Pluggy API integration, which is a separate spec.

### Safety verification per phase

| Phase | Existing files modified | Type of change | Risk |
|-------|----------------------|----------------|------|
| 0 | `calendar-sync-ticktick/index.ts` | Add ~20 lines in existing branch | Low |
| 1 | `nlp-classifier.ts`, `index.ts` | Add optional last parameter + append to prompt end | Low (fallback to current behavior) |
| 2 | `index.ts` only | Add memory search + async save, both try/catch | Low (non-blocking) |
| 3 | None (new edge functions + new cron) | New files only | Zero |
| 4 | `index.ts` | Add observational log AFTER handler | Zero (does not change flow) |
| 5 | `index.ts` | Add day context to enrichment block | Low (non-blocking) |
| 6 | None (new edge function + new cron) | New files only | Zero |

---

*Plan created: 2026-04-10*
*Based on spec: `docs/superpowers/specs/2026-04-10-ana-clara-agent-upgrade-design.md`*
