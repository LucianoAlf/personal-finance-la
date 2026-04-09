
-- Adicionar coluna insight_type para diferenciar tipos de insights
ALTER TABLE ana_insights_cache 
ADD COLUMN IF NOT EXISTS insight_type TEXT DEFAULT 'dashboard';

-- Atualizar registros existentes
UPDATE ana_insights_cache 
SET insight_type = 'dashboard' 
WHERE insight_type IS NULL;

-- Tornar coluna NOT NULL após popular
ALTER TABLE ana_insights_cache 
ALTER COLUMN insight_type SET NOT NULL;

-- Remover constraint antiga se existir
ALTER TABLE ana_insights_cache 
DROP CONSTRAINT IF EXISTS ana_insights_cache_pkey;

-- Adicionar nova primary key composta
ALTER TABLE ana_insights_cache 
ADD CONSTRAINT ana_insights_cache_pkey PRIMARY KEY (user_id, insight_type);

-- Criar índice para busca rápida por expiração
CREATE INDEX IF NOT EXISTS idx_ana_insights_cache_expires_at 
ON ana_insights_cache(expires_at);

-- Comentários
COMMENT ON COLUMN ana_insights_cache.insight_type IS 'Tipo de insight: dashboard ou investment';
COMMENT ON TABLE ana_insights_cache IS 'Cache de insights da Ana Clara com TTL de 24h';
;
