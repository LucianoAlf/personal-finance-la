-- SPRINT 4 DIA 1: Investment Radar SQL Functions

-- 1. Expirar oportunidades antigas (>7 dias ou passadas)
CREATE OR REPLACE FUNCTION expire_old_opportunities()
RETURNS void AS $$
BEGIN
  UPDATE market_opportunities
  SET dismissed = true, dismissed_at = NOW()
  WHERE expires_at < NOW() 
    AND dismissed = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Buscar oportunidades ativas para um usuário
CREATE OR REPLACE FUNCTION get_active_opportunities(p_user_id uuid)
RETURNS SETOF market_opportunities AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM market_opportunities
  WHERE user_id = p_user_id
    AND dismissed = false
    AND expires_at > NOW()
  ORDER BY confidence_score DESC, created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Marcar oportunidade como dismissed
CREATE OR REPLACE FUNCTION dismiss_opportunity(p_opportunity_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE market_opportunities
  SET dismissed = true, dismissed_at = NOW()
  WHERE id = p_opportunity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON FUNCTION expire_old_opportunities() IS 'Expira oportunidades de mercado que passaram da data de validade';
COMMENT ON FUNCTION get_active_opportunities(uuid) IS 'Retorna oportunidades ativas para um usuário específico';
COMMENT ON FUNCTION dismiss_opportunity(uuid) IS 'Marca uma oportunidade como dismissed (ignorada pelo usuário)';;
