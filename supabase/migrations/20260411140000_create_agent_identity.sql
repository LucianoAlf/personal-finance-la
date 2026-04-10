-- Agent identity, memory, sessions, pending tasks, and action log
-- Part of Ana Clara Agent Upgrade v2

-- ============================================
-- 1. AGENT IDENTITY (soul + user context + autonomy rules)
-- ============================================

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
  }'::jsonb,
  user_context JSONB NOT NULL DEFAULT '{}'::jsonb,
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
      "change_category"
    ]
  }'::jsonb,
  notification_preferences JSONB NOT NULL DEFAULT '{
    "morning_briefing": "08:00",
    "daily_summary": "20:00",
    "weekly_summary_day": "sunday",
    "weekly_summary_time": "09:00",
    "bill_alert_days_before": 3,
    "anomaly_alerts": true,
    "goal_reminders": true,
    "tips_per_week": 2
  }'::jsonb,
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
  USING ((SELECT current_setting('role', true)) = 'service_role');

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

-- ============================================
-- 2. AGENT MEMORY ENTRIES (with pgvector for RAG)
-- ============================================

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
CREATE INDEX idx_agent_memory_embedding ON agent_memory_entries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE agent_memory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own memories"
  ON agent_memory_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access memories"
  ON agent_memory_entries FOR ALL
  USING ((SELECT current_setting('role', true)) = 'service_role');

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

-- ============================================
-- 3. AGENT DAILY SESSIONS
-- ============================================

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
  ON agent_daily_sessions FOR ALL
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- ============================================
-- 4. AGENT PENDING TASKS (heartbeat)
-- ============================================

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
  ON agent_pending_tasks FOR ALL
  USING ((SELECT current_setting('role', true)) = 'service_role');

-- ============================================
-- 5. AGENT ACTION LOG (observability)
-- ============================================

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
  ON agent_action_log FOR ALL
  USING ((SELECT current_setting('role', true)) = 'service_role');
