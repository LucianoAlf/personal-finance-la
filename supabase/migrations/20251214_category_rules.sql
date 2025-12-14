-- Migration: Regras Automáticas de Categorização
-- Data: 14/12/2025
-- Descrição: Cria tabela para armazenar regras de categorização automática por estabelecimento

-- 1. Criar tabela category_rules
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_pattern TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, merchant_pattern)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_category_rules_user_id ON category_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_category_rules_pattern ON category_rules(merchant_pattern);

-- 3. RLS (Row Level Security)
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só vê suas próprias regras
DROP POLICY IF EXISTS "Users can view own category rules" ON category_rules;
CREATE POLICY "Users can view own category rules" ON category_rules
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuário só pode inserir suas próprias regras
DROP POLICY IF EXISTS "Users can insert own category rules" ON category_rules;
CREATE POLICY "Users can insert own category rules" ON category_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Usuário só pode atualizar suas próprias regras
DROP POLICY IF EXISTS "Users can update own category rules" ON category_rules;
CREATE POLICY "Users can update own category rules" ON category_rules
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: Usuário só pode deletar suas próprias regras
DROP POLICY IF EXISTS "Users can delete own category rules" ON category_rules;
CREATE POLICY "Users can delete own category rules" ON category_rules
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Função para aplicar regras de categorização
CREATE OR REPLACE FUNCTION apply_category_rules()
RETURNS TRIGGER AS $$
DECLARE
  matched_category_id UUID;
BEGIN
  -- Buscar regra que corresponde ao padrão do estabelecimento
  SELECT category_id INTO matched_category_id
  FROM category_rules
  WHERE user_id = NEW.user_id
    AND NEW.description ILIKE merchant_pattern
  ORDER BY LENGTH(merchant_pattern) DESC -- Regra mais específica primeiro
  LIMIT 1;

  -- Se encontrou regra, aplicar categoria
  IF matched_category_id IS NOT NULL THEN
    NEW.category_id := matched_category_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para aplicar regras em novas transações
DROP TRIGGER IF EXISTS trigger_apply_category_rules ON credit_card_transactions;
CREATE TRIGGER trigger_apply_category_rules
  BEFORE INSERT ON credit_card_transactions
  FOR EACH ROW
  EXECUTE FUNCTION apply_category_rules();

-- 6. Função para criar regra a partir de padrão
CREATE OR REPLACE FUNCTION create_category_rule(
  p_user_id UUID,
  p_merchant_pattern TEXT,
  p_category_id UUID
)
RETURNS UUID AS $$
DECLARE
  rule_id UUID;
BEGIN
  -- Inserir ou atualizar regra (upsert)
  INSERT INTO category_rules (user_id, merchant_pattern, category_id)
  VALUES (p_user_id, p_merchant_pattern, p_category_id)
  ON CONFLICT (user_id, merchant_pattern)
  DO UPDATE SET 
    category_id = EXCLUDED.category_id,
    updated_at = NOW()
  RETURNING id INTO rule_id;

  RETURN rule_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Habilitar Realtime para a tabela
ALTER TABLE category_rules REPLICA IDENTITY FULL;

COMMENT ON TABLE category_rules IS 'Regras automáticas de categorização por estabelecimento';
COMMENT ON COLUMN category_rules.merchant_pattern IS 'Padrão de busca (ex: UBER%, %IFOOD%, AMAZON*)';
