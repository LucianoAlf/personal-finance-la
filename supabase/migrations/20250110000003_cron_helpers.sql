-- SPRINT 4: HELPER FUNCTIONS PARA CRON JOBS

-- 1. Function: Get active users (usuários com investimentos ativos)
CREATE OR REPLACE FUNCTION public.get_active_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  investment_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    i.user_id AS id,
    u.email::TEXT,
    COUNT(i.id) AS investment_count
  FROM investments i
  JOIN auth.users u ON u.id = i.user_id
  WHERE i.status = 'active'
  GROUP BY i.user_id, u.email
  HAVING COUNT(i.id) > 0
  ORDER BY investment_count DESC;
END;
$$;

COMMENT ON FUNCTION public.get_active_users IS 'Retorna usuários com investimentos ativos para processamento em lote (cron jobs)';
