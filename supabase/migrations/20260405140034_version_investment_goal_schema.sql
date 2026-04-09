-- Version investment goals and alerts schema that already exists in production.
-- This migration is intentionally idempotent so the repo can catch up safely.

CREATE TABLE IF NOT EXISTS public.investment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  expected_return_rate NUMERIC NOT NULL,
  monthly_contribution NUMERIC DEFAULT 0,
  contribution_day INTEGER,
  linked_investments UUID[] DEFAULT '{}'::UUID[],
  auto_invest BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  notify_milestones BOOLEAN DEFAULT TRUE,
  notify_contribution BOOLEAN DEFAULT FALSE,
  notify_rebalancing BOOLEAN DEFAULT FALSE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investment_goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.investment_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investment_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  last_checked TIMESTAMPTZ,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.investment_goals
  ALTER COLUMN current_amount SET DEFAULT 0,
  ALTER COLUMN start_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN monthly_contribution SET DEFAULT 0,
  ALTER COLUMN linked_investments SET DEFAULT '{}'::UUID[],
  ALTER COLUMN auto_invest SET DEFAULT FALSE,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN priority SET DEFAULT 'medium',
  ALTER COLUMN notify_milestones SET DEFAULT TRUE,
  ALTER COLUMN notify_contribution SET DEFAULT FALSE,
  ALTER COLUMN notify_rebalancing SET DEFAULT FALSE,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.investment_goal_contributions
  ALTER COLUMN date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.investment_alerts
  ALTER COLUMN is_active SET DEFAULT TRUE,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_category_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_category_check
      CHECK (category = ANY (ARRAY['retirement', 'financial_freedom', 'education', 'real_estate', 'general']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_contribution_day_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_contribution_day_check
      CHECK (contribution_day IS NULL OR (contribution_day >= 1 AND contribution_day <= 28));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_current_amount_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_current_amount_check
      CHECK (current_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_expected_return_rate_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_expected_return_rate_check
      CHECK (expected_return_rate >= 0 AND expected_return_rate <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_monthly_contribution_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_monthly_contribution_check
      CHECK (monthly_contribution >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_priority_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_priority_check
      CHECK (priority = ANY (ARRAY['low', 'medium', 'high', 'critical']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_status_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_status_check
      CHECK (status = ANY (ARRAY['active', 'completed', 'paused', 'cancelled']));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goals_target_amount_check'
      AND conrelid = 'public.investment_goals'::regclass
  ) THEN
    ALTER TABLE public.investment_goals
      ADD CONSTRAINT investment_goals_target_amount_check
      CHECK (target_amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_goal_contributions_amount_check'
      AND conrelid = 'public.investment_goal_contributions'::regclass
  ) THEN
    ALTER TABLE public.investment_goal_contributions
      ADD CONSTRAINT investment_goal_contributions_amount_check
      CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'investment_alerts_alert_type_check'
      AND conrelid = 'public.investment_alerts'::regclass
  ) THEN
    ALTER TABLE public.investment_alerts
      ADD CONSTRAINT investment_alerts_alert_type_check
      CHECK (alert_type = ANY (ARRAY['price_above', 'price_below', 'percent_change']));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON public.investment_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_investment_goals_status ON public.investment_goals (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_investment_goals_target_date ON public.investment_goals (target_date);
CREATE INDEX IF NOT EXISTS idx_investment_goals_linked_investments ON public.investment_goals USING gin (linked_investments);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_goal ON public.investment_goal_contributions (goal_id);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_user ON public.investment_goal_contributions (user_id);
CREATE INDEX IF NOT EXISTS idx_investment_contributions_date ON public.investment_goal_contributions (date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_user_active ON public.investment_alerts (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_investment_alerts_ticker ON public.investment_alerts (ticker) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_investment_alerts_active ON public.investment_alerts (is_active, last_checked);

ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_goals' AND policyname = 'investment_goals_select_own') THEN
    CREATE POLICY investment_goals_select_own ON public.investment_goals FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_goals' AND policyname = 'investment_goals_insert_own') THEN
    CREATE POLICY investment_goals_insert_own ON public.investment_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_goals' AND policyname = 'investment_goals_update_own') THEN
    CREATE POLICY investment_goals_update_own ON public.investment_goals FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_goals' AND policyname = 'investment_goals_delete_own') THEN
    CREATE POLICY investment_goals_delete_own ON public.investment_goals FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_goal_contributions' AND policyname = 'contributions_select_own') THEN
    CREATE POLICY contributions_select_own ON public.investment_goal_contributions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_goal_contributions' AND policyname = 'contributions_insert_own') THEN
    CREATE POLICY contributions_insert_own ON public.investment_goal_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_goal_contributions' AND policyname = 'contributions_delete_own') THEN
    CREATE POLICY contributions_delete_own ON public.investment_goal_contributions FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_alerts' AND policyname = 'Users can view own alerts') THEN
    CREATE POLICY "Users can view own alerts" ON public.investment_alerts FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_alerts' AND policyname = 'Users can create own alerts') THEN
    CREATE POLICY "Users can create own alerts" ON public.investment_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_alerts' AND policyname = 'Users can update own alerts') THEN
    CREATE POLICY "Users can update own alerts" ON public.investment_alerts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'investment_alerts' AND policyname = 'Users can delete own alerts') THEN
    CREATE POLICY "Users can delete own alerts" ON public.investment_alerts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_investment_alerts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_investment_goal_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.investment_goals
    SET current_amount = current_amount + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.investment_goals
    SET current_amount = current_amount - OLD.amount,
        updated_at = NOW()
    WHERE id = OLD.goal_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_investment_projection(
  p_current_amount NUMERIC,
  p_monthly_contribution NUMERIC,
  p_annual_rate NUMERIC,
  p_months INTEGER
)
RETURNS TABLE (month INTEGER, contribution NUMERIC, interest NUMERIC, balance NUMERIC)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_monthly_rate NUMERIC;
  v_balance NUMERIC;
  v_month INTEGER;
  v_interest NUMERIC;
BEGIN
  v_monthly_rate := p_annual_rate / 12 / 100;
  v_balance := p_current_amount;
  FOR v_month IN 1..p_months LOOP
    v_interest := v_balance * v_monthly_rate;
    v_balance := v_balance + v_interest + p_monthly_contribution;
    RETURN QUERY SELECT v_month, p_monthly_contribution, ROUND(v_interest, 2), ROUND(v_balance, 2);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_investment_goal_metrics(p_goal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_goal public.investment_goals%ROWTYPE;
  v_months_total INTEGER;
  v_months_elapsed INTEGER;
  v_months_remaining INTEGER;
  v_percentage NUMERIC;
  v_is_on_track BOOLEAN;
  v_final_projection NUMERIC;
  v_total_contributions NUMERIC;
  v_total_interest NUMERIC;
BEGIN
  SELECT * INTO v_goal FROM public.investment_goals WHERE id = p_goal_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_months_total := EXTRACT(YEAR FROM AGE(v_goal.target_date, v_goal.start_date)) * 12 + EXTRACT(MONTH FROM AGE(v_goal.target_date, v_goal.start_date));
  v_months_elapsed := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_goal.start_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_goal.start_date));
  v_months_remaining := GREATEST(0, v_months_total - v_months_elapsed);
  v_percentage := CASE WHEN v_goal.target_amount > 0 THEN (v_goal.current_amount / v_goal.target_amount) * 100 ELSE 0 END;
  SELECT balance INTO v_final_projection FROM public.calculate_investment_projection(v_goal.current_amount, v_goal.monthly_contribution, v_goal.expected_return_rate, v_months_remaining) ORDER BY month DESC LIMIT 1;
  v_total_contributions := v_goal.monthly_contribution * v_months_remaining;
  v_total_interest := COALESCE(v_final_projection, v_goal.current_amount) - v_goal.current_amount - v_total_contributions;
  v_is_on_track := COALESCE(v_final_projection, v_goal.current_amount) >= v_goal.target_amount;
  RETURN jsonb_build_object(
    'goal_id', v_goal.id,
    'current_amount', v_goal.current_amount,
    'target_amount', v_goal.target_amount,
    'percentage', ROUND(v_percentage, 2),
    'months_total', v_months_total,
    'months_elapsed', v_months_elapsed,
    'months_remaining', v_months_remaining,
    'final_projection', ROUND(COALESCE(v_final_projection, v_goal.current_amount), 2),
    'total_contributions', ROUND(v_total_contributions, 2),
    'total_interest', ROUND(v_total_interest, 2),
    'is_on_track', v_is_on_track,
    'shortfall', CASE WHEN COALESCE(v_final_projection, v_goal.current_amount) < v_goal.target_amount THEN ROUND(v_goal.target_amount - COALESCE(v_final_projection, v_goal.current_amount), 2) ELSE 0 END
  );
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table = 'investment_alerts' AND trigger_name = 'trigger_update_investment_alerts_timestamp') THEN
    CREATE TRIGGER trigger_update_investment_alerts_timestamp BEFORE UPDATE ON public.investment_alerts FOR EACH ROW EXECUTE FUNCTION public.update_investment_alerts_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table = 'investment_goal_contributions' AND trigger_name = 'investment_contribution_update_goal') THEN
    CREATE TRIGGER investment_contribution_update_goal AFTER INSERT OR DELETE ON public.investment_goal_contributions FOR EACH ROW EXECUTE FUNCTION public.update_investment_goal_amount();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table = 'investment_goal_contributions' AND trigger_name = 'investment_contributions_updated_at') THEN
    CREATE TRIGGER investment_contributions_updated_at BEFORE UPDATE ON public.investment_goal_contributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_schema = 'public' AND event_object_table = 'investment_goals' AND trigger_name = 'investment_goals_updated_at') THEN
    CREATE TRIGGER investment_goals_updated_at BEFORE UPDATE ON public.investment_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON FUNCTION public.calculate_investment_projection IS 'Calcula projeção mensal de uma meta de investimento';
COMMENT ON FUNCTION public.get_investment_goal_metrics IS 'Retorna métricas consolidadas de progresso e projeção da meta de investimento';;
