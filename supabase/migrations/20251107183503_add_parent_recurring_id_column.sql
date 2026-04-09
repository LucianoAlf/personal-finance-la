-- Adicionar campo parent_recurring_id para ligar ocorrências aos templates
ALTER TABLE payable_bills 
ADD COLUMN IF NOT EXISTS parent_recurring_id UUID REFERENCES payable_bills(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_payable_bills_parent_recurring 
ON payable_bills(parent_recurring_id) 
WHERE parent_recurring_id IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN payable_bills.parent_recurring_id IS 'ID do template recorrente que gerou esta ocorrência';;
