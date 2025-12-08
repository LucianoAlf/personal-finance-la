-- ============================================
-- TABELA: user_memory
-- Sistema de memória do usuário (gírias, preferências, apelidos)
-- Padrão Copiloto - Dezembro 2025
-- ============================================

-- Tabela para memória do usuário
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- 'giria', 'preferencia', 'local_frequente', 'apelido', 'conta_padrao'
  chave TEXT NOT NULL,
  valor JSONB NOT NULL,
  categoria TEXT,
  confianca DECIMAL(3,2) DEFAULT 0.50,
  frequencia INTEGER DEFAULT 1,
  origem TEXT DEFAULT 'inferido',  -- 'inferido', 'explicito', 'correcao', 'sistema'
  ultima_vez TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tipo, chave)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_memory_user_id ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_tipo ON user_memory(tipo);
CREATE INDEX IF NOT EXISTS idx_user_memory_chave ON user_memory(chave);

-- RLS (Row Level Security)
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem gerenciar suas próprias memórias
CREATE POLICY "Users can manage own memory" ON user_memory
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- GÍRIAS GLOBAIS PADRÃO (user_id = NULL)
-- ============================================

INSERT INTO user_memory (user_id, tipo, chave, valor, origem) VALUES
  -- Gírias de dinheiro
  (NULL, 'giria', 'conto', '{"expressao": "conto", "significa": "real (R$)", "exemplo": "50 conto = R$ 50"}', 'sistema'),
  (NULL, 'giria', 'pila', '{"expressao": "pila", "significa": "real (R$)", "exemplo": "30 pila = R$ 30"}', 'sistema'),
  (NULL, 'giria', 'mango', '{"expressao": "mango", "significa": "real (R$)", "exemplo": "100 mango = R$ 100"}', 'sistema'),
  (NULL, 'giria', 'pau', '{"expressao": "pau", "significa": "real (R$)", "exemplo": "20 pau = R$ 20"}', 'sistema'),
  (NULL, 'giria', 'pratas', '{"expressao": "pratas", "significa": "real (R$)", "exemplo": "50 pratas = R$ 50"}', 'sistema'),
  
  -- Gírias de bancos
  (NULL, 'giria', 'roxinho', '{"expressao": "roxinho", "significa": "Nubank", "tipo": "banco"}', 'sistema'),
  (NULL, 'giria', 'laranjinha', '{"expressao": "laranjinha", "significa": "Banco Inter", "tipo": "banco"}', 'sistema'),
  (NULL, 'giria', 'amarelinho', '{"expressao": "amarelinho", "significa": "Banco do Brasil", "tipo": "banco"}', 'sistema'),
  (NULL, 'giria', 'verdinho', '{"expressao": "verdinho", "significa": "PicPay", "tipo": "banco"}', 'sistema'),
  
  -- Gírias de ações
  (NULL, 'giria', 'torrei', '{"expressao": "torrei", "significa": "gastei", "tipo": "acao"}', 'sistema'),
  (NULL, 'giria', 'queimei', '{"expressao": "queimei", "significa": "gastei", "tipo": "acao"}', 'sistema'),
  (NULL, 'giria', 'rasguei', '{"expressao": "rasguei", "significa": "gastei muito", "tipo": "acao"}', 'sistema'),
  (NULL, 'giria', 'detonei', '{"expressao": "detonei", "significa": "gastei muito", "tipo": "acao"}', 'sistema'),
  (NULL, 'giria', 'pintou', '{"expressao": "pintou", "significa": "recebi/apareceu", "tipo": "acao"}', 'sistema'),
  (NULL, 'giria', 'caiu', '{"expressao": "caiu", "significa": "recebi (dinheiro)", "tipo": "acao"}', 'sistema'),
  
  -- Gírias de comida
  (NULL, 'giria', 'dogao', '{"expressao": "dogão", "significa": "cachorro-quente", "categoria": "alimentacao"}', 'sistema'),
  (NULL, 'giria', 'rango', '{"expressao": "rango", "significa": "comida/refeição", "categoria": "alimentacao"}', 'sistema'),
  (NULL, 'giria', 'breja', '{"expressao": "breja", "significa": "cerveja", "categoria": "alimentacao"}', 'sistema'),
  (NULL, 'giria', 'gelada', '{"expressao": "gelada", "significa": "cerveja", "categoria": "alimentacao"}', 'sistema'),
  (NULL, 'giria', 'marmita', '{"expressao": "marmita", "significa": "refeição/almoço", "categoria": "alimentacao"}', 'sistema'),
  
  -- Gírias de transporte
  (NULL, 'giria', 'uber', '{"expressao": "uber", "significa": "corrida de app", "categoria": "transporte"}', 'sistema'),
  (NULL, 'giria', '99', '{"expressao": "99", "significa": "corrida de app", "categoria": "transporte"}', 'sistema'),
  
  -- Gírias de status
  (NULL, 'giria', 'ta pago', '{"expressao": "tá pago", "significa": "status pago", "tipo": "status"}', 'sistema'),
  (NULL, 'giria', 'ja paguei', '{"expressao": "já paguei", "significa": "status pago", "tipo": "status"}', 'sistema'),
  (NULL, 'giria', 'vou pagar', '{"expressao": "vou pagar", "significa": "status pendente", "tipo": "status"}', 'sistema')
  
ON CONFLICT (user_id, tipo, chave) DO NOTHING;

-- ============================================
-- FUNÇÃO: Incrementar frequência de uso
-- ============================================

CREATE OR REPLACE FUNCTION incrementar_frequencia_memoria(
  p_user_id UUID,
  p_tipo TEXT,
  p_chave TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE user_memory 
  SET 
    frequencia = frequencia + 1,
    ultima_vez = NOW()
  WHERE user_id = p_user_id 
    AND tipo = p_tipo 
    AND chave = p_chave;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: Adicionar nova memória
-- ============================================

CREATE OR REPLACE FUNCTION adicionar_memoria_usuario(
  p_user_id UUID,
  p_tipo TEXT,
  p_chave TEXT,
  p_valor JSONB,
  p_origem TEXT DEFAULT 'inferido'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_memory (user_id, tipo, chave, valor, origem)
  VALUES (p_user_id, p_tipo, p_chave, p_valor, p_origem)
  ON CONFLICT (user_id, tipo, chave) 
  DO UPDATE SET 
    valor = p_valor,
    frequencia = user_memory.frequencia + 1,
    ultima_vez = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE user_memory IS 'Memória do usuário: gírias, preferências, apelidos, locais frequentes';
COMMENT ON COLUMN user_memory.tipo IS 'Tipo: giria, preferencia, local_frequente, apelido, conta_padrao';
COMMENT ON COLUMN user_memory.confianca IS 'Nível de confiança (0.00 a 1.00)';
COMMENT ON COLUMN user_memory.frequencia IS 'Quantas vezes foi usado';
COMMENT ON COLUMN user_memory.origem IS 'Como foi aprendido: inferido, explicito, correcao, sistema';
