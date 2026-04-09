-- Migration: Adicionar suporte a tags em contas a pagar
-- Cria tabela de relacionamento N:N entre bills e tags

CREATE TABLE IF NOT EXISTS bill_tags (
  bill_id UUID NOT NULL REFERENCES payable_bills(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (bill_id, tag_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bill_tags_bill_id ON bill_tags(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_tags_tag_id ON bill_tags(tag_id);

-- Comentários para documentação
COMMENT ON TABLE bill_tags IS 'Relacionamento N:N entre contas a pagar e tags';
COMMENT ON COLUMN bill_tags.bill_id IS 'ID da conta a pagar';
COMMENT ON COLUMN bill_tags.tag_id IS 'ID da tag';
COMMENT ON COLUMN bill_tags.created_at IS 'Data de criação do relacionamento';;
