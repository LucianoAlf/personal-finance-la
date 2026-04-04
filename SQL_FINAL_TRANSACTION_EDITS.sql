-- ============================================
-- SQL CORRIGIDO - TRANSACTION EDITS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Verificar se a tabela já existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transaction_edits'
    ) THEN
        -- Criar tabela
        CREATE TABLE transaction_edits (
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
        
        RAISE NOTICE 'Tabela transaction_edits criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela transaction_edits já existe!';
    END IF;
END $$;

-- 2. Criar índices (IF NOT EXISTS funciona em índices)
CREATE INDEX IF NOT EXISTS idx_transaction_edits_transaction_id 
    ON transaction_edits(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_edits_user_id 
    ON transaction_edits(user_id);

CREATE INDEX IF NOT EXISTS idx_transaction_edits_edited_at 
    ON transaction_edits(edited_at DESC);

-- 3. Habilitar RLS
ALTER TABLE transaction_edits ENABLE ROW LEVEL SECURITY;

-- 4. Remover policies antigas se existirem
DROP POLICY IF EXISTS "Users can view their own transaction edits" ON transaction_edits;
DROP POLICY IF EXISTS "Users can insert their own transaction edits" ON transaction_edits;

-- 5. Criar policies novas
CREATE POLICY "Users can view their own transaction edits"
    ON transaction_edits
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction edits"
    ON transaction_edits
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6. Atualizar transações WhatsApp pendentes para completas
UPDATE transactions 
SET 
    status = 'completed',
    is_paid = true,
    updated_at = NOW()
WHERE 
    source = 'whatsapp'
    AND is_paid = false;

-- 7. Comentários
COMMENT ON TABLE transaction_edits IS 'Histórico de edições de transações via WhatsApp';
COMMENT ON COLUMN transaction_edits.edit_type IS 'Tipo de edição realizada';
COMMENT ON COLUMN transaction_edits.old_value IS 'Valor anterior';
COMMENT ON COLUMN transaction_edits.new_value IS 'Novo valor';
COMMENT ON COLUMN transaction_edits.edited_via IS 'Canal de edição (whatsapp, web, mobile)';

-- 8. Verificação final
SELECT 
    'transaction_edits' as tabela,
    COUNT(*) as total_edits
FROM transaction_edits;
