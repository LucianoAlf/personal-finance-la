-- Migration: Integração de Tags para Transações de Cartão
-- Data: 2025-01-06
-- Descrição: Cria tabela de relacionamento entre transações de cartão e tags

-- Criar tabela credit_card_transaction_tags
CREATE TABLE credit_card_transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_transaction_id UUID NOT NULL REFERENCES credit_card_transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(credit_card_transaction_id, tag_id)
);

-- Índices para performance
CREATE INDEX idx_cc_transaction_tags_transaction ON credit_card_transaction_tags(credit_card_transaction_id);
CREATE INDEX idx_cc_transaction_tags_tag ON credit_card_transaction_tags(tag_id);

-- RLS Policies
ALTER TABLE credit_card_transaction_tags ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário pode ver suas próprias tags de transações
CREATE POLICY "Users can view their own credit card transaction tags"
  ON credit_card_transaction_tags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM credit_card_transactions
      WHERE credit_card_transactions.id = credit_card_transaction_tags.credit_card_transaction_id
      AND credit_card_transactions.user_id = auth.uid()
    )
  );

-- Policy: Usuário pode inserir tags em suas transações
CREATE POLICY "Users can insert tags to their credit card transactions"
  ON credit_card_transaction_tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM credit_card_transactions
      WHERE credit_card_transactions.id = credit_card_transaction_tags.credit_card_transaction_id
      AND credit_card_transactions.user_id = auth.uid()
    )
  );

-- Policy: Usuário pode deletar tags de suas transações
CREATE POLICY "Users can delete tags from their credit card transactions"
  ON credit_card_transaction_tags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM credit_card_transactions
      WHERE credit_card_transactions.id = credit_card_transaction_tags.credit_card_transaction_id
      AND credit_card_transactions.user_id = auth.uid()
    )
  );

-- Adicionar comentário explicativo
COMMENT ON TABLE credit_card_transaction_tags IS 'Tabela de relacionamento entre transações de cartão de crédito e tags';;
