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

-- 4. Habilitar Realtime para a tabela
ALTER TABLE category_rules REPLICA IDENTITY FULL;

COMMENT ON TABLE category_rules IS 'Regras automáticas de categorização por estabelecimento';
COMMENT ON COLUMN category_rules.merchant_pattern IS 'Padrão de busca (ex: UBER%, %IFOOD%, AMAZON*)';;
