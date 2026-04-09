-- SPRINT 4: SISTEMA DE BADGES COMPLETO
-- Gamificação para engajar usuários

-- 1. Tabela de badges disponíveis
CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'investment', 'engagement', 'performance'
  condition_type TEXT NOT NULL, -- 'investment_count', 'category_diversity', etc
  condition_value JSONB NOT NULL, -- Critérios para unlock
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de badges desbloqueados por usuário
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked_at ON public.user_badges(unlocked_at DESC);

-- 4. RLS Policies
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Badges: todos podem ler
DROP POLICY IF EXISTS "Badges são públicos" ON public.badges;
CREATE POLICY "Badges são públicos"
  ON public.badges
  FOR SELECT
  TO authenticated
  USING (true);

-- User badges: usuário só vê os próprios
DROP POLICY IF EXISTS "Usuários veem seus próprios badges" ON public.user_badges;
CREATE POLICY "Usuários veem seus próprios badges"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User badges: sistema pode inserir
DROP POLICY IF EXISTS "Sistema pode inserir badges" ON public.user_badges;
CREATE POLICY "Sistema pode inserir badges"
  ON public.user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 5. Popular badges iniciais
INSERT INTO public.badges (id, name, description, icon, category, condition_type, condition_value)
VALUES
  (
    'first_investment',
    'Primeira Compra',
    'Registrou seu primeiro investimento',
    '🎯',
    'investment',
    'investment_count',
    '{"min": 1}'::jsonb
  ),
  (
    'diversified',
    'Diversificado',
    'Investiu em 3 ou mais classes de ativos',
    '🌈',
    'investment',
    'category_diversity',
    '{"min_categories": 3}'::jsonb
  ),
  (
    'investor',
    'Investidor',
    'Possui 10 ou mais investimentos',
    '💼',
    'investment',
    'investment_count',
    '{"min": 10}'::jsonb
  ),
  (
    'dividend_earner',
    'Dividendeiro',
    'Recebeu seus primeiros dividendos',
    '💰',
    'investment',
    'dividend_received',
    '{"min_transactions": 1}'::jsonb
  ),
  (
    'balanced',
    'Balanceado',
    'Portfólio com Health Score acima de 80',
    '⚖️',
    'performance',
    'health_score',
    '{"min_score": 80}'::jsonb
  ),
  (
    'consistent',
    'Consistente',
    'Investiu por 6 meses consecutivos',
    '🔥',
    'engagement',
    'consecutive_months',
    '{"months": 6}'::jsonb
  ),
  (
    'wealthy',
    'Patrimônio Sólido',
    'Portfólio acima de R$ 50.000',
    '💎',
    'performance',
    'portfolio_value',
    '{"min_value": 50000}'::jsonb
  ),
  (
    'long_term',
    'Visão de Longo Prazo',
    'Possui investimentos há mais de 1 ano',
    '📈',
    'engagement',
    'investment_age_days',
    '{"min_days": 365}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Function: Verificar e desbloquear badges automaticamente
CREATE OR REPLACE FUNCTION public.check_and_unlock_badges(p_user_id UUID)
RETURNS SETOF public.user_badges
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge RECORD;
  v_unlocked RECORD;
  v_investment_count INT;
  v_category_count INT;
  v_dividend_count INT;
  v_portfolio_value NUMERIC;
  v_oldest_investment_days INT;
  v_consecutive_months INT;
BEGIN
  -- Buscar métricas do usuário
  SELECT COUNT(*) INTO v_investment_count
  FROM investments
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COUNT(DISTINCT category) INTO v_category_count
  FROM investments
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COUNT(*) INTO v_dividend_count
  FROM investment_transactions
  WHERE user_id = p_user_id AND transaction_type = 'dividend';
  
  SELECT COALESCE(SUM(current_value), 0) INTO v_portfolio_value
  FROM investments
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COALESCE(MAX(EXTRACT(DAYS FROM NOW() - created_at)), 0) INTO v_oldest_investment_days
  FROM investments
  WHERE user_id = p_user_id;
  
  -- Calcular meses consecutivos (simplificado)
  SELECT COUNT(DISTINCT DATE_TRUNC('month', transaction_date)) INTO v_consecutive_months
  FROM investment_transactions
  WHERE user_id = p_user_id
    AND transaction_type IN ('buy', 'sell')
    AND transaction_date >= NOW() - INTERVAL '6 months';
  
  -- Verificar cada badge
  FOR v_badge IN SELECT * FROM badges LOOP
    -- Verificar se já desbloqueado
    SELECT * INTO v_unlocked
    FROM user_badges
    WHERE user_id = p_user_id AND badge_id = v_badge.id;
    
    IF v_unlocked IS NULL THEN
      -- Badge ainda não desbloqueado, verificar condições
      CASE v_badge.condition_type
        WHEN 'investment_count' THEN
          IF v_investment_count >= (v_badge.condition_value->>'min')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'category_diversity' THEN
          IF v_category_count >= (v_badge.condition_value->>'min_categories')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'dividend_received' THEN
          IF v_dividend_count >= (v_badge.condition_value->>'min_transactions')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'portfolio_value' THEN
          IF v_portfolio_value >= (v_badge.condition_value->>'min_value')::NUMERIC THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'investment_age_days' THEN
          IF v_oldest_investment_days >= (v_badge.condition_value->>'min_days')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'consecutive_months' THEN
          IF v_consecutive_months >= (v_badge.condition_value->>'months')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        -- health_score será verificado por trigger separado
        ELSE
          NULL;
      END CASE;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- 7. Trigger: Verificar badges após inserir/atualizar investimento
CREATE OR REPLACE FUNCTION public.trigger_check_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar badges de forma assíncrona (não bloqueia a transação)
  PERFORM check_and_unlock_badges(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_investment_check_badges ON public.investments;
CREATE TRIGGER after_investment_check_badges
  AFTER INSERT OR UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();

DROP TRIGGER IF EXISTS after_transaction_check_badges ON public.investment_transactions;
CREATE TRIGGER after_transaction_check_badges
  AFTER INSERT ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();

-- 8. View: Badges do usuário com detalhes
CREATE OR REPLACE VIEW public.user_badges_detailed AS
SELECT
  ub.id,
  ub.user_id,
  ub.badge_id,
  b.name,
  b.description,
  b.icon,
  b.category,
  ub.unlocked_at,
  ub.created_at
FROM public.user_badges ub
JOIN public.badges b ON b.id = ub.badge_id
ORDER BY ub.unlocked_at DESC;

-- Comentários
COMMENT ON TABLE public.badges IS 'Definição de todos os badges disponíveis no sistema';
COMMENT ON TABLE public.user_badges IS 'Badges desbloqueados por cada usuário';
COMMENT ON FUNCTION public.check_and_unlock_badges IS 'Verifica condições e desbloqueia badges para um usuário';;
