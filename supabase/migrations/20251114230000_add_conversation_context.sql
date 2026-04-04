-- ============================================
-- MIGRATION: Contexto Conversacional
-- Permite interações multi-turno inteligentes
-- ============================================

-- 1. Criar ENUM para tipos de contexto
CREATE TYPE conversation_type AS ENUM (
  'idle',
  'editing_transaction',
  'creating_transaction',
  'confirming_action',
  'multi_step_flow'
);

-- 2. Criar tabela de contexto
CREATE TABLE conversation_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  context_type conversation_type NOT NULL DEFAULT 'idle',
  context_data JSONB DEFAULT '{}'::jsonb,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices (SEM predicado NOW() que não é IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_conversation_context_user_phone 
  ON conversation_context(user_id, phone, expires_at);

CREATE INDEX IF NOT EXISTS idx_conversation_context_expires 
  ON conversation_context(expires_at DESC);

-- 4. Habilitar RLS
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
CREATE POLICY "Users can manage their own conversation context"
  ON conversation_context
  FOR ALL
  USING (auth.uid() = user_id);

-- 6. Função para limpar contextos expirados (cron)
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_contexts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_context
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 7. Comentários
COMMENT ON TABLE conversation_context IS 'Armazena contexto de conversação multi-turno para interações inteligentes via WhatsApp';
COMMENT ON COLUMN conversation_context.context_type IS 'Tipo de fluxo conversacional ativo';
COMMENT ON COLUMN conversation_context.context_data IS 'Dados do contexto (transaction_id, step, etc)';
COMMENT ON COLUMN conversation_context.expires_at IS 'Contexto expira após 5 minutos de inatividade';

-- 8. Trigger para atualizar updated_at
CREATE TRIGGER update_conversation_context_updated_at
  BEFORE UPDATE ON conversation_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
