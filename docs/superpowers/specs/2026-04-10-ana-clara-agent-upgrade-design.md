# Ana Clara Agent Upgrade - Design Spec

> **De assistente conversacional para agente financeiro autônomo**
> Inspirado na arquitetura OpenClaw/Alfredo, adaptado para o domínio de finanças pessoais.

---

## 1. Contexto e Motivação

### O que existe hoje

A Ana Clara é uma assistente conversacional via WhatsApp que:

- **Registra** despesas, receitas, transferências por texto/áudio
- **Consulta** saldos, extratos, gastos, receitas, faturas
- **Gerencia** contas a pagar, cartões de crédito, parcelas
- **Notifica** proativamente: contas vencendo, metas, resumos
- **Sincroniza** agenda com TickTick (bidirecional)
- **Gera insights** via LLM para dashboard, investimentos, educação financeira

**Infraestrutura atual:**
- Edge Functions Supabase (Deno) para processamento
- NLP via OpenAI Function Calling (`nlp-classifier.ts`)
- WhatsApp via UAZAPI (`webhook-uazapi`, `send-whatsapp-message`)
- pg_cron para agendamentos (resumos, dicas, lembretes, sync)
- Contexto de conversa em `conversation_context` (TTL, JSONB)
- Cache de insights em `ana_insights_cache` (~24h TTL)
- Transcrição de áudio via Whisper
- Leitura de imagens (recibos, comprovantes)

### O que falta (gap vs Alfredo/OpenClaw)

| Capacidade | Alfredo | Ana Clara Hoje | Gap |
|-----------|---------|----------------|-----|
| Alma/personalidade documentada (SOUL.md) | SOUL.md + IDENTITY.md | `humanization.ts` inline | Raso, sem profundidade |
| Contexto profundo do usuário (USER.md) | USER.md detalhado | Nome + `ai_provider_configs` | Sem rotinas, preferências, família |
| Memória de longo prazo | `MEMORY.md` + `memory/` hierarchy | `conversation_context` (TTL) | Perde tudo após expirar |
| Memória semântica (RAG) | `memory_search()` nativo | Nenhuma | Zero |
| Proatividade inteligente | Monitora + alerta sem pedir | Crons fixos (resumo, tips) | Sem inteligência contextual |
| Autonomia vs confirmação | Regras claras por tipo de ação | Sempre pede confirmação | Atrito desnecessário |
| Leitura integrada de agendas | TickTick nativo | Sync bidirecional | Falta "leitura inteligente" |
| Open Finance | N/A | N/A | Novo para ambos |
| Memória de decisões | `decisions.md` | Nenhuma | Repete perguntas |
| Memória de erros | `lessons.md` | Nenhuma | Repete erros |
| Sessões diárias | `sessions/YYYY-MM-DD.md` | `whatsapp_messages` log | Sem reflexão |
| Briefing matinal | Cron 8h30 (TickTick + agenda) | `send-daily-summary` (20h) | Horário errado, sem agenda |
| Resumo semanal | Domingo 8h | `send-weekly-summary` | Sem integração TickTick |
| Desafiar o usuário | "Pode e deve discordar" | Sempre concorda | Zero push-back |

### Bug descoberto: Sync TickTick → payable_bills

**O sync bidirecional com TickTick atualiza `calendar_events` mas NÃO atualiza `payable_bills`.**

Quando o Alfredo (OpenClaw) marca uma conta como paga no TickTick:
- `calendar_external_event_links` detecta a mudança (hash diferente)
- Se o link aponta para `calendar_events.event_id` → `calendar_events.status` vira `'completed'`
- Se o link tem `origin_type = 'payable_bill'` → **NÃO atualiza `payable_bills.status`**. Apenas grava `last_error: 'payable_bill_inbound_update_not_supported_v1'` no link.

**Impacto:** Contas que o Alf marca como pagas via Alfredo/TickTick não aparecem como pagas no app. Isso precisa ser corrigido antes ou durante a Phase 5 (Leitura Integrada de Agendas).

**Fix necessário:** No `processInboundTickTickForUser` em `index.ts`, quando `linkRow.origin_type === 'payable_bill'` e o task remoto tem `status === 2` (completed), atualizar `payable_bills.status` para `'paid'` e registrar em `bill_payment_history`.

---

### Princípio Fundamental: ADITIVO, NUNCA DESTRUTIVO

**O plano de implementação NÃO pode refatorar a Ana Clara.**

Ela já funciona. Já registra transações, gerencia contas, envia notificações, sincroniza com TickTick. O objetivo é **adicionar camadas de inteligência** sem tocar no que já funciona.

**Regras:**
1. **Nenhum código existente é removido** — apenas adições e extensões
2. **O system prompt existente é preservado** — blocos novos são INSERIDOS, não substituem
3. **Os handlers existentes continuam funcionando** — autonomia é uma camada opcional que roda ANTES, com fallback para comportamento atual
4. **Todos os módulos novos são isolados** — `_shared/ana-clara-soul.ts`, `_shared/agent-memory.ts`, etc.
5. **Erros nos módulos novos nunca bloqueiam** — try/catch com fallback para fluxo original
6. **Feature flags** — cada capacidade nova pode ser ligada/desligada por usuário via `agent_identity`

---

## 2. Visão do Produto

### Ana Clara v2: Copiloto Financeiro Autônomo

Ana Clara deixa de ser uma "anotadora de gastos com voz simpática" e passa a ser um **copiloto financeiro que pensa junto com o usuário**.

**Analogia:** Alfredo é para a vida profissional/pessoal do Alf o que Ana Clara v2 será para a vida financeira de cada usuário.

### Princípios de Design

1. **Proativa, não reativa** - Não espera ser perguntada. Monitora, detecta, alerta.
2. **Memória persistente** - Lembra de decisões, padrões, preferências, erros passados.
3. **Contextual** - Sabe o dia, hora, histórico, agenda, humor inferido do padrão de gastos.
4. **Desafiadora** - Quando vê gasto fora do padrão, questiona. Quando meta está em risco, alerta.
5. **Autônoma onde seguro** - Registra, categoriza, organiza sem perguntar. Pede confirmação para dinheiro.
6. **Integrada** - TickTick, Open Finance, agenda, contas, metas formam uma visão unificada.

---

## 3. Arquitetura do Agente

### 3.1 Sistema de Identidade (equivalente SOUL.md + IDENTITY.md)

**Onde vive:** Tabela `agent_identity` + arquivo `_shared/ana-clara-soul.ts`

```
agent_identity
├── soul          → Quem ela é, como pensa, tom de voz, anti-patterns
├── capabilities  → O que pode fazer por domínio
├── boundaries    → O que NUNCA faz sem confirmação
└── user_context  → Perfil profundo do usuário (rotina, família, preferências)
```

**O que muda no system prompt:**
- Hoje: ~50 linhas de identidade no `nlp-classifier.ts`
- v2: Soul completa carregada do banco, com:
  - Personalidade (direta, desafiadora, proativa)
  - Anti-patterns ("nunca concordar por educação", "nunca dizer 'ótima pergunta'")
  - Regras de autonomia por tipo de ação
  - Contexto profundo do usuário carregado dinamicamente

### 3.2 Sistema de Memória (equivalente MEMORY.md + `memory/`)

**Três camadas:**

#### Camada 1: Memória de Curto Prazo (já existe)
- `conversation_context` (TTL 30min-2h)
- Histórico de mensagens na sessão
- Sem mudanças significativas

#### Camada 2: Memória de Médio Prazo (NOVO)
- Tabela `agent_memory_entries`
- Tipo: `decision | lesson | preference | pattern | note`
- Exemplos:
  - `decision`: "Alf decidiu que gastos com Lala (pet) são prioridade e não devem ser questionados"
  - `lesson`: "Quando Alf diz 'era no Itaú' ele quer mudar a conta, não registrar novo"
  - `preference`: "Prefere ver resumo às 7h, não às 20h"
  - `pattern`: "Todo dia 5 tem pagamento de aluguel ~R$1.500"
- TTL: indefinido (permanente até o usuário ou sistema limpar)
- Busca: full-text search (pg FTS) + tag-based

#### Camada 3: Memória Semântica / RAG (NOVO)
- Embeddings (OpenAI `text-embedding-3-small`) dos `agent_memory_entries`
- Vetor armazenado via `pgvector` (Supabase já suporta nativamente)
- Na classificação NLP, antes de gerar o prompt:
  1. Embedding da mensagem do usuário
  2. Busca top-5 memórias relevantes por similaridade
  3. Injeta como contexto no system prompt
- Garante que Ana Clara "lembra" de decisões e padrões mesmo meses depois

### 3.3 Motor de Proatividade (equivalente Crons do Alfredo)

**Reformulação dos crons existentes + novos:**

| Cron | Quando | O que faz | Status |
|------|--------|-----------|--------|
| Briefing Matinal | 07:30 (configurável) | Agenda do dia (TickTick), contas vencendo, saldo, meta do mês | NOVO |
| Alerta de Conta | 3 dias antes do vencimento | Lembra conta específica, valor, histórico de atraso | EXISTE (melhorar) |
| Resumo Diário | 20:00 (configurável) | Gastos do dia, balanço, destaque, dica personalizada | EXISTE (melhorar) |
| Resumo Semanal | Domingo 09:00 | Semana consolidada, tendências, comparativo anterior | EXISTE (melhorar) |
| Resumo Mensal | Dia 1, 09:00 | Mês fechado, DRE pessoal, conquistas, alertas | EXISTE (melhorar) |
| Radar de Oportunidade | Quando detecta | Taxa de juros melhor, investimento parecido rendendo mais | EXISTE (melhorar) |
| Alerta de Anomalia | Quando detecta | Gasto fora do padrão, assinatura nova, cobrança duplicada | NOVO |
| Lembrete de Meta | Semanal | Progresso da meta, projeção, risco de não atingir | NOVO |
| Dica Personalizada | 2x/semana | Baseada no perfil e momento financeiro do usuário | EXISTE (melhorar) |

**Diferença do Alfredo:** Os crons do Alfredo usam TickTick API direto no prompt do OpenClaw. Aqui, os crons são Edge Functions com pg_cron, consultando banco de dados local + TickTick API, e entregando via WhatsApp.

### 3.4 Sistema de Autonomia (equivalente regras AGENTS.md)

**Ações autônomas (sem confirmação):**
- Registrar transação quando confiança NLP > 0.85
- Categorizar automaticamente
- Associar a conta quando há apenas uma opção
- Gerar insights e relatórios
- Enviar notificações proativas
- Atualizar memórias de padrão/preferência
- Ler agenda e contas para contexto

**Ações com confirmação (sempre):**
- Excluir qualquer dado
- Marcar conta como paga (movimenta dinheiro)
- Editar valor de transação
- Criar conta a pagar recorrente
- Qualquer ação financeira que envolva "dinheiro saindo"
- Compartilhar dados com terceiros

**Ações com confirmação suave (inline):**
- Mudar categoria (sugere e aplica se usuário não corrigir em 30s)
- Associar a conta quando há múltiplas opções (pergunta uma vez, lembra)

### 3.5 Leitura Inteligente de Agendas (upgrade TickTick)

**Hoje:** Sync bidirecional CRUD funciona. Falta a "leitura inteligente".

**v2:**
- Ana Clara cruza agenda + contas a pagar + metas para gerar contexto temporal
- "Amanhã você tem reunião 14h e a conta de luz vence"
- "Essa semana tem 3 contas vencendo, total R$850"
- "Seu compromisso de quarta pode impactar a meta de economia"
- Quando usuário pergunta "o que tenho amanhã?" — responde agenda + financeiro integrado

### 3.6 Open Finance (NOVO - futuro)

**Fase futura, mas arquitetura preparada desde agora:**
- Pluggy como agregador (consentimento, sync de contas/cartões/investimentos)
- Categorização automática de transações importadas
- Detecção de cobranças desconhecidas
- Reconciliação: "Vi um débito de R$49,90 no Nubank. Quer que eu registre?"
- Alerta de saldo baixo baseado em dados reais (não manuais)

---

## 4. Modelo de Dados

### 4.1 Novas Tabelas

```sql
-- Identidade do agente por usuário (personalizável)
CREATE TABLE agent_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  soul_config JSONB NOT NULL DEFAULT '{}',
  user_context JSONB NOT NULL DEFAULT '{}',
  autonomy_rules JSONB NOT NULL DEFAULT '{}',
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Memória persistente do agente
CREATE TABLE agent_memory_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'decision', 'lesson', 'preference', 'pattern', 'note', 'feedback'
  )),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  embedding vector(1536),
  source TEXT,  -- 'conversation', 'system', 'user_explicit'
  expires_at TIMESTAMPTZ,  -- NULL = permanente
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca
CREATE INDEX idx_agent_memory_user ON agent_memory_entries(user_id);
CREATE INDEX idx_agent_memory_type ON agent_memory_entries(user_id, memory_type);
CREATE INDEX idx_agent_memory_tags ON agent_memory_entries USING GIN(tags);
CREATE INDEX idx_agent_memory_embedding ON agent_memory_entries 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_agent_memory_fts ON agent_memory_entries 
  USING GIN(to_tsvector('portuguese', content));

-- Sessões diárias (reflexão do agente)
CREATE TABLE agent_daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  summary TEXT,
  highlights JSONB DEFAULT '[]',
  decisions_made JSONB DEFAULT '[]',
  pending_items JSONB DEFAULT '[]',
  financial_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, session_date)
);

-- Heartbeat / tarefas pendentes do agente
CREATE TABLE agent_pending_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### 4.2 Modificações em Tabelas Existentes

```sql
-- Estender conversation_context com referência a memórias usadas
ALTER TABLE conversation_context 
  ADD COLUMN IF NOT EXISTS memories_used UUID[] DEFAULT '{}';

-- Estender ai_provider_configs com preferências de agente
ALTER TABLE ai_provider_configs
  ADD COLUMN IF NOT EXISTS agent_mode TEXT DEFAULT 'conversational'
    CHECK (agent_mode IN ('conversational', 'copilot', 'autonomous'));
```

### 4.3 RPCs Necessárias

```sql
-- Busca semântica de memórias
CREATE OR REPLACE FUNCTION search_agent_memories(
  p_user_id UUID,
  p_query_embedding vector(1536),
  p_match_threshold FLOAT DEFAULT 0.7,
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
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$ LANGUAGE sql STABLE;

-- Gerar sessão diária
CREATE OR REPLACE FUNCTION generate_daily_session(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_snapshot JSONB;
BEGIN
  -- Snapshot financeiro do dia
  SELECT jsonb_build_object(
    'total_expenses', COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0),
    'total_income', COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0),
    'transaction_count', COUNT(*)
  ) INTO v_snapshot
  FROM transactions
  WHERE user_id = p_user_id
    AND date::date = p_date;

  INSERT INTO agent_daily_sessions (user_id, session_date, financial_snapshot)
  VALUES (p_user_id, p_date, v_snapshot)
  ON CONFLICT (user_id, session_date)
  DO UPDATE SET financial_snapshot = v_snapshot, created_at = now()
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Fluxo de Processamento v2

### Fluxo Atual (simplificado)
```
WhatsApp → webhook-uazapi → process-whatsapp-message
  → nlp-classifier (OpenAI function calling)
  → handler específico (transaction, bills, cards, calendar...)
  → resposta formatada → send-whatsapp-message
```

### Fluxo v2 (com memória e autonomia)
```
WhatsApp → webhook-uazapi → process-whatsapp-message
  1. Carregar contexto de conversa (curto prazo)
  2. Carregar identidade do agente (soul + user_context)
  3. Embedding da mensagem do usuário
  4. Buscar memórias relevantes (RAG top-5)
  5. Buscar agenda do dia (TickTick + calendar_events)
  6. Montar system prompt enriquecido
  7. nlp-classifier (com contexto completo)
  8. Avaliar autonomia (pode executar direto ou precisa confirmar?)
  9. Executar handler específico
  10. Avaliar se há memória nova para salvar
      - Decisão? → salvar como 'decision'
      - Preferência nova? → salvar como 'preference'
      - Padrão detectado? → salvar como 'pattern'
  11. Responder
  12. Atualizar sessão diária (async)
```

---

## 6. Reformulação do System Prompt

### Estrutura do Prompt v2

```
[SOUL]
Quem sou, personalidade, anti-patterns, tom de voz

[USER CONTEXT]
Nome, rotina, família, preferências, momento financeiro

[AUTONOMY RULES]
O que posso fazer sozinha vs preciso confirmar

[MEMORIES]
Top-5 memórias relevantes para esta conversa

[AGENDA TODAY]
Compromissos + contas vencendo hoje/amanhã

[FINANCIAL SNAPSHOT]
Saldo, gastos do mês, progresso das metas

[CONVERSATION HISTORY]
Últimas mensagens da sessão

[INTENT SCHEMA]
Function calling schema (já existe)
```

---

## 7. Fases de Implementação

### Fase 1: Fundação do Agente (2-3 dias)
- Tabelas de identidade e memória
- `ana-clara-soul.ts` como arquivo de alma
- Refatorar system prompt do `nlp-classifier.ts`
- Carregar soul + user_context no prompt
- Testes unitários

### Fase 2: Sistema de Memória (2-3 dias)
- `agent_memory_entries` com embeddings
- RPC `search_agent_memories`
- Integração no fluxo NLP (busca antes do prompt)
- Detector de memórias novas (pós-resposta)
- Testes de busca semântica

### Fase 3: Proatividade Inteligente (2-3 dias)
- Briefing matinal (cron 07:30) com agenda + finanças
- Reformular resumo diário com contexto de memória
- Alerta de anomalia (gasto fora do padrão)
- Lembrete de meta semanal
- Preferências de horário configuráveis

### Fase 4: Autonomia e Desafio (1-2 dias)
- Regras de autonomia por tipo de ação
- Lógica de "desafio" quando gasto fora do padrão
- Confirmação suave (sugere e aplica se não corrigir)
- Testes de boundary

### Fase 5: Leitura Integrada de Agendas (1-2 dias)
- Cruzar TickTick + contas + metas para briefing
- "O que tenho amanhã?" retorna agenda + financeiro
- Contexto temporal no prompt (compromissos do dia)

### Fase 6: Sessões e Reflexão (1 dia)
- `agent_daily_sessions` gerada no fim do dia
- Snapshot financeiro
- Highlights e decisões extraídos da conversa
- Heartbeat / pending tasks

### Fase 7: Open Finance (futuro, fora deste plano)
- Integração Pluggy
- Categorização automática de transações importadas
- Reconciliação e alertas de saldo real

---

## 8. Prompt para o OpenClaw/Alfredo

Se quiser perguntar ao Alfredo (via OpenClaw) como ele implementa cada capacidade:

```
Alfredo, preciso da sua ajuda técnica. Estou construindo a Ana Clara — 
uma copiloto financeira pessoal que roda em Supabase Edge Functions (Deno) 
com WhatsApp via UAZAPI.

Quero que ela tenha as mesmas capacidades fundamentais que você tem:

1. MEMÓRIA: Como funciona o seu memory_search()? É embedding-based (RAG) 
   ou FTS? Qual modelo de embedding? Como decide o que salvar como 
   decision/lesson/preference? Qual é o threshold de similaridade?

2. PROATIVIDADE: Seus crons no OpenClaw — o "8h30 Contas do dia e da semana" 
   por exemplo — como você monta o contexto? Faz uma query no TickTick e 
   monta o texto inline no prompt, ou tem um pipeline separado?

3. AUTONOMIA: Suas regras de "fazer sem perguntar" vs "sempre confirmar" — 
   são hard-coded no AGENTS.md ou tem lógica dinâmica? Como decide quando 
   fazer push-back no usuário?

4. SESSÕES: O memory/sessions/YYYY-MM-DD.md — você gera automaticamente 
   no fim da sessão ou vai escrevendo ao longo do dia? O que extrai para 
   MEMORY.md e como?

5. SOUL: O SOUL.md carrega inteiro no system prompt a cada mensagem ou 
   só trechos relevantes? Quanto do contexto total cabe no prompt?

Minha stack: Supabase (PostgreSQL + pgvector + pg_cron), Deno Edge Functions, 
OpenAI (GPT-4 + embeddings), WhatsApp UAZAPI. Não tenho filesystem como você — 
tudo é banco de dados.

Me dá detalhes técnicos de implementação, não conceito.
```

---

## 9. Métricas de Sucesso

| Métrica | Atual | Meta v2 |
|---------|-------|---------|
| Tempo médio de resposta | ~3-5s | <3s |
| Acurácia de classificação NLP | ~85% | >92% (com memória) |
| Perguntas de desambiguação | ~30% das mensagens | <15% (memória resolve) |
| Retenção de preferência | 0 (esquece tudo) | 100% (persiste) |
| Alertas proativos úteis | ~2/dia (genéricos) | 3-5/dia (contextuais) |
| Taxa de push-back construtivo | 0% | >10% em gastos fora padrão |
| Integração agenda+finanças | Separados | Unificado no briefing |

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Prompt muito grande (tokens) | Custo + latência | Token budget: soul max 600, memórias max 400, agenda+snapshot max 300. Total enrichment max 1.500 tokens. Se estourar, cortar memórias primeiro, depois agenda, nunca soul. |
| Memórias desatualizadas | Sugestões erradas | TTL de 90 dias em `pattern`, permanente em `decision`. pg_cron mensal que merge similares e remove patterns sem acesso. |
| Memórias duplicadas | Ruído no RAG | Antes de INSERT, buscar por similaridade > 0.85. Se encontrar, UPDATE no existente. |
| Push-back excessivo | Irritar usuário | Limitar a 1 desafio por sessão, aprender quando ignorado |
| Embedding ruim | Memórias irrelevantes | Threshold 0.5 (não 0.7 — textos curtos de WhatsApp dão similaridade baixa). Fallback explícito para FTS: se OpenAI retornar erro → `to_tsvector('portuguese', content)` com `ts_rank`. |
| pg_cron falhar | Sem briefing | Monitoramento + retry, alerta para admin |
| Custo de embeddings | Gasto com API | Batch embeddings, cache, modelo small. Rate limit: max 1 embedding por mensagem. |
| Perda de contexto entre sessões | Esquece decisões | Memory flush: pg_cron a cada 30min que extrai decisions/preferences de `conversation_context` perto de expirar e salva em `agent_memory_entries`. |
| Confirmação suave perigosa | Ação sem consentimento | Confirmação suave APENAS para categorização. Nunca para valores, contas, ou movimentação de dinheiro. WhatsApp não tem "read receipt" confiável. |

---

## 11. Feedback do Alfredo (OpenClaw) — Respostas Técnicas e Ajustes

*Recebido em: 2026-04-10. Integrado na spec e plano.*

### Respostas técnicas do Alfredo

1. **MEMÓRIA:** Embedding-based (text-embedding-3-small) + FTS híbrido. Threshold: 0.35 (baixo — melhor trazer mais e filtrar). Salva `decision` quando usuário diz "sempre/nunca/a partir de agora". Salva `lesson` quando algo dá errado e identifica padrão.

2. **PROATIVIDADE:** Crons fazem curl direto na API do TickTick dentro do prompt. Inline, sem pipeline separado. Para Edge Functions: a function faz fetch no TickTick, monta texto e envia.

3. **AUTONOMIA:** Hard-coded no AGENTS.md, carregado no system prompt. Sem lógica dinâmica. Push-back: desafia quando vê contradição com decision salva ou padrão detectado.

4. **SESSÕES:** Salva sob demanda (compactação ou evento relevante), não automático. Recomenda pg_cron às 23h59 para Ana Clara.

5. **SOUL:** Carrega inteiro no system prompt (~1.500 tokens). Se ficar grande, cortar anti-patterns e manter personalidade + regras de autonomia.

### Ajustes aplicados na spec e plano

| Feedback | Decisão | Justificativa |
|----------|---------|---------------|
| Soul no arquivo, não no banco | **ACEITO PARCIAL**: DEFAULT_SOUL no arquivo `ana-clara-soul.ts`, overrides por usuário no banco `agent_identity.soul_config`. O `buildSoulPromptBlock` já faz merge. | Arquivo é versionável; banco permite personalização por usuário. Melhor dos dois mundos. |
| Threshold 0.7 → 0.5 | **ACEITO**: alterado no plano e na spec | Confirmado pela experiência do Alfredo e faz sentido para textos curtos. |
| Token budget por seção | **ACEITO**: soul max 600, memórias max 400, total enrichment max 1.500 | Essencial para não estourar prompt. Implementar truncamento no `buildSoulPromptBlock` e `formatMemoriesForPrompt`. |
| Deduplicação de memórias | **ACEITO**: buscar similaridade > 0.85 antes de INSERT, fazer UPDATE se encontrar | Sem isso, memórias explodem. |
| Memory flush antes de expirar conversation_context | **ACEITO**: pg_cron a cada 30min extrai decisions/preferences de contextos perto de expirar | Alfredo faz isso antes de compactação. Equivalente para nossa stack. |
| Confirmação suave perigosa | **ACEITO**: restringir a categorização apenas | WhatsApp não tem como saber se leu. Correto. |
| Briefing matinal 07:30 → 08:00 | **ACEITO**: default 08:00, configurável por usuário | Rotina do Alf: acorda 06:30, computador às 08:00. |
| Compactação mensal de memórias | **ACEITO**: pg_cron mensal que merge similares e remove patterns > 90 dias | Essencial para não degradar a busca. |
| Observabilidade / agent_action_log | **ACEITO**: tabela simples de log por decisão de autonomia e memória salva | Debug impossível sem isso. |
| FTS fallback explícito | **ACEITO**: se embedding falhar → `to_tsvector('portuguese', content)` com `ts_rank` | Plano mencionava mas não detalhava. |
| Anomaly detector: stdDev zero | **ACEITO**: se stdDev === 0, não alertar | Evita falso positivo quando gastos são sempre iguais. |
| Ordem no prompt: soul ANTES, não DEPOIS | **DISCORDO**: APPEND funciona melhor. O modelo lê o prompt existente primeiro (identidade, regras, contexto), e depois o enrichment adiciona profundidade. Colocar soul ANTES do prompt existente cria risco de conflito com `## SUA IDENTIDADE` já existente. | Segurança > performance marginal de ordenação. |
| Teste de regressão NLP (20 mensagens) | **ACEITO**: antes de injetar soul, salvar respostas de 20 mensagens reais. Depois, comparar. | Prático e barato. Adicionar como step na Task 3. |

---

*Spec atualizada em: 2026-04-10 (v2 — com feedback Alfredo)*
*Autores: Cursor Agent + Alf + Alfredo (OpenClaw)*
