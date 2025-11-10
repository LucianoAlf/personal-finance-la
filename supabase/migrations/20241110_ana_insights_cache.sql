-- Tabela de cache para insights da Ana Clara
-- Cache válido por 24 horas (1x por dia)

CREATE TABLE IF NOT EXISTS ana_insights_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  insights JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ana_cache_user ON ana_insights_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ana_cache_expiration ON ana_insights_cache(expires_at);

-- RLS (Row Level Security)
ALTER TABLE ana_insights_cache ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só vê seu próprio cache
CREATE POLICY "Users can view their own cache"
  ON ana_insights_cache
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Sistema pode inserir/atualizar cache
CREATE POLICY "Service role can manage cache"
  ON ana_insights_cache
  FOR ALL
  USING (true);

-- Comentários
COMMENT ON TABLE ana_insights_cache IS 'Cache de insights da Ana Clara (válido por 24h)';
COMMENT ON COLUMN ana_insights_cache.user_id IS 'ID do usuário';
COMMENT ON COLUMN ana_insights_cache.insights IS 'Payload JSON dos insights gerados';
COMMENT ON COLUMN ana_insights_cache.generated_at IS 'Timestamp de quando foi gerado';
COMMENT ON COLUMN ana_insights_cache.expires_at IS 'Timestamp de quando expira (24h)';
