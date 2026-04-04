-- ============================================
-- REFATORAÇÃO: REGISTRO AUTOMÁTICO + EDIÇÃO INLINE
-- ============================================

-- 1. Criar ENUM para tipos de edição
CREATE TYPE edit_command_type AS ENUM (
  'edit_value',
  'edit_description',
  'edit_category',
  'edit_date',
  'edit_account',
  'delete'
);

-- 2. Criar tabela para histórico de edições
CREATE TABLE IF NOT EXISTS transaction_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  edit_type edit_command_type NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  edited_via TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX idx_transaction_edits_transaction_id ON transaction_edits(transaction_id);
CREATE INDEX idx_transaction_edits_user_id ON transaction_edits(user_id);
CREATE INDEX idx_transaction_edits_edited_at ON transaction_edits(edited_at DESC);

-- 4. Habilitar RLS
ALTER TABLE transaction_edits ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
CREATE POLICY "Users can view their own transaction edits"
  ON transaction_edits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction edits"
  ON transaction_edits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Atualizar transações pending_confirmation para completed (limpeza)
UPDATE transactions 
SET 
  status = 'completed',
  is_paid = true,
  updated_at = NOW()
WHERE 
  status = 'pending_confirmation'
  OR (source = 'whatsapp' AND is_paid = false);

-- 7. Comentários
COMMENT ON TABLE transaction_edits IS 'Histórico de edições de transações via WhatsApp';
COMMENT ON COLUMN transaction_edits.edit_type IS 'Tipo de edição realizada';
COMMENT ON COLUMN transaction_edits.old_value IS 'Valor anterior';
COMMENT ON COLUMN transaction_edits.new_value IS 'Novo valor';
COMMENT ON COLUMN transaction_edits.edited_via IS 'Canal de edição (whatsapp, web, mobile)';
