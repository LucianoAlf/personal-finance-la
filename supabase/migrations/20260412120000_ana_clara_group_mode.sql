-- Ana Clara modo grupo: config, memória passiva de grupo, enum de sessão.
-- conversation_context.phone precisa caber JID normalizado do grupo.

ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'ana_clara_group_session';

ALTER TABLE conversation_context
  ALTER COLUMN phone TYPE VARCHAR(128);

CREATE TABLE IF NOT EXISTS ana_clara_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ana_clara_config_enabled
  ON ana_clara_config (user_id) WHERE is_enabled = true;

ALTER TABLE ana_clara_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ana_clara_config" ON ana_clara_config;
CREATE POLICY "Users read own ana_clara_config"
  ON ana_clara_config FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own ana_clara_config" ON ana_clara_config;
CREATE POLICY "Users update own ana_clara_config"
  ON ana_clara_config FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access ana_clara_config" ON ana_clara_config;
CREATE POLICY "Service role full access ana_clara_config"
  ON ana_clara_config FOR ALL
  USING ((SELECT current_setting('role', true)) = 'service_role');

CREATE TABLE IF NOT EXISTS ana_clara_group_message_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_jid TEXT NOT NULL,
  participant_phone VARCHAR(32),
  participant_name TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_summary TEXT,
  trigger_detected BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE INDEX IF NOT EXISTS idx_ana_clara_group_memory_user_group_created
  ON ana_clara_group_message_memory (user_id, group_jid, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ana_clara_group_memory_expires
  ON ana_clara_group_message_memory (expires_at);

ALTER TABLE ana_clara_group_message_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ana_clara_group_message_memory" ON ana_clara_group_message_memory;
CREATE POLICY "Users read own ana_clara_group_message_memory"
  ON ana_clara_group_message_memory FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access ana_clara_group_message_memory" ON ana_clara_group_message_memory;
CREATE POLICY "Service role full access ana_clara_group_message_memory"
  ON ana_clara_group_message_memory FOR ALL
  USING ((SELECT current_setting('role', true)) = 'service_role');

COMMENT ON TABLE ana_clara_config IS 'Configuração runtime da Ana Clara (grupo WhatsApp e futuros canais).';
COMMENT ON TABLE ana_clara_group_message_memory IS 'Memória passiva recente de grupos WhatsApp (curta duração, para contexto de sessão).';
