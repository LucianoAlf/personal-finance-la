-- =====================================================
-- SPRINT 1 - DIA 4: VIEWS + FUNCTIONS
-- =====================================================

-- =====================================================
-- VIEW: v_portfolio_summary
-- =====================================================

CREATE OR REPLACE VIEW v_portfolio_summary AS
SELECT 
  i.user_id,
  COUNT(*) as total_assets,
  SUM(i.total_invested) as total_invested,
  SUM(i.current_value) as current_value,
  SUM(i.current_value - i.total_invested) as total_return,
  CASE 
    WHEN SUM(i.total_invested) > 0 THEN
      ((SUM(i.current_value) - SUM(i.total_invested)) / SUM(i.total_invested)) * 100
    ELSE 0
  END as return_percentage,
  COUNT(DISTINCT i.category) as categories_count,
  COUNT(DISTINCT i.account_id) as accounts_count,
  MAX(i.updated_at) as last_updated
FROM investments i
WHERE i.is_active = TRUE AND i.status = 'active'
GROUP BY i.user_id;

COMMENT ON VIEW v_portfolio_summary IS 'Resumo consolidado do portfólio por usuário';

-- =====================================================
-- VIEW: v_investment_performance
-- =====================================================

CREATE OR REPLACE VIEW v_investment_performance AS
SELECT 
  i.user_id,
  i.category,
  COUNT(*) as asset_count,
  SUM(i.current_value) as total_value,
  SUM(i.total_invested) as total_invested,
  SUM(i.current_value - i.total_invested) as total_return,
  CASE 
    WHEN SUM(i.total_invested) > 0 THEN
      AVG((i.current_value - i.total_invested) / NULLIF(i.total_invested, 0) * 100)
    ELSE 0
  END as avg_return_pct,
  AVG(i.dividend_yield) as avg_dividend_yield
FROM investments i
WHERE i.is_active = TRUE AND i.status = 'active' AND i.category IS NOT NULL
GROUP BY i.user_id, i.category;

COMMENT ON VIEW v_investment_performance IS 'Performance por categoria de ativo';

-- =====================================================
-- FUNCTION: calculate_portfolio_metrics
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_portfolio_metrics(p_user_id UUID)
RETURNS TABLE (
  diversification_score INTEGER,
  portfolio_health_score INTEGER,
  total_dividends NUMERIC(18,2),
  rebalancing_needed BOOLEAN,
  concentration_risk TEXT,
  asset_allocation JSONB
) AS $$
DECLARE
  v_total_value NUMERIC;
  v_asset_count INTEGER;
  v_categories_count INTEGER;
  v_max_allocation NUMERIC;
  v_diversification INTEGER;
  v_health INTEGER;
  v_concentration TEXT;
  v_allocation JSONB;
BEGIN
  -- Buscar dados básicos
  SELECT 
    COALESCE(SUM(current_value), 0),
    COUNT(*),
    COUNT(DISTINCT category)
  INTO v_total_value, v_asset_count, v_categories_count
  FROM investments
  WHERE user_id = p_user_id AND is_active = TRUE AND status = 'active';
  
  -- Calcular maior alocação individual
  SELECT COALESCE(MAX(current_value / NULLIF(v_total_value, 0) * 100), 0)
  INTO v_max_allocation
  FROM investments
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Diversification Score
  v_diversification := CASE
    WHEN v_asset_count = 0 THEN 0
    WHEN v_asset_count = 1 THEN 10
    WHEN v_asset_count <= 3 THEN 30
    WHEN v_asset_count <= 5 THEN 50
    WHEN v_asset_count <= 10 THEN 75
    WHEN v_asset_count <= 15 THEN 90
    ELSE 100
  END;
  
  -- Ajustar por categorias
  v_diversification := LEAST((v_diversification * v_categories_count::NUMERIC / 6)::INTEGER, 100);
  
  -- Ajustar por concentração
  IF v_max_allocation > 50 THEN
    v_diversification := (v_diversification * 0.5)::INTEGER;
  ELSIF v_max_allocation > 30 THEN
    v_diversification := (v_diversification * 0.7)::INTEGER;
  END IF;
  
  -- Health Score
  v_health := v_diversification;
  
  -- Risco de concentração
  v_concentration := CASE
    WHEN v_max_allocation > 50 THEN 'ALTO'
    WHEN v_max_allocation > 30 THEN 'MÉDIO'
    ELSE 'BAIXO'
  END;
  
  -- Total de dividendos (12 meses)
  total_dividends := COALESCE((
    SELECT SUM(total_value)
    FROM investment_transactions
    WHERE user_id = p_user_id
      AND transaction_type IN ('dividend', 'interest')
      AND transaction_date >= NOW() - INTERVAL '12 months'
  ), 0);
  
  -- Verificar rebalanceamento
  rebalancing_needed := EXISTS (
    SELECT 1
    FROM investment_allocation_targets t
    LEFT JOIN (
      SELECT 
        category,
        SUM(current_value) / NULLIF(v_total_value, 0) * 100 as current_percentage
      FROM investments
      WHERE user_id = p_user_id AND is_active = TRUE
      GROUP BY category
    ) a ON t.asset_class = a.category
    WHERE t.user_id = p_user_id
      AND ABS(t.target_percentage - COALESCE(a.current_percentage, 0)) > 5
  );
  
  -- Alocação atual
  SELECT COALESCE(jsonb_object_agg(category, percentage), '{}'::jsonb) INTO v_allocation
  FROM (
    SELECT 
      category,
      ROUND((SUM(current_value) / NULLIF(v_total_value, 0) * 100)::NUMERIC, 2) as percentage
    FROM investments
    WHERE user_id = p_user_id AND is_active = TRUE AND category IS NOT NULL
    GROUP BY category
  ) sub;
  
  -- Retornar
  diversification_score := v_diversification;
  portfolio_health_score := v_health;
  concentration_risk := v_concentration;
  asset_allocation := v_allocation;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_portfolio_metrics IS 'Calcula métricas: diversificação, saúde, dividendos, rebalanceamento';

-- =====================================================
-- FUNCTION: sync_investment_prices (stub)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_investment_prices()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Sync via Edge Function (Sprint 2)',
    'updated_count', 0,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_investment_prices IS 'Sincroniza preços. Implementação completa no Sprint 2.';
