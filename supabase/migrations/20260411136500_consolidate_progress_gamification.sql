-- Consolidated gamification RPCs (depends on user_gamification, badge_progress, add_xp_to_user,
-- update_badge_progress, unlock_badge from 20260411136000_gamification_complete.sql).
-- Relocated from 20260405234934_consolidate_progress_gamification.sql (wrong replay order).

BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_user_gamification_profile(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_gamification (
    user_id,
    level,
    xp,
    total_xp,
    current_streak,
    best_streak,
    last_activity_date
  )
  VALUES (p_user_id, 1, 0, 0, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_user_activity_streak(
  p_user_id UUID,
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  current_streak INTEGER,
  best_streak INTEGER,
  last_activity_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile public.user_gamification%ROWTYPE;
  v_current_streak INTEGER;
  v_best_streak INTEGER;
BEGIN
  PERFORM public.ensure_user_gamification_profile(p_user_id);

  SELECT *
  INTO v_profile
  FROM public.user_gamification
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_profile.last_activity_date IS NULL THEN
    v_current_streak := 1;
  ELSIF v_profile.last_activity_date = p_activity_date THEN
    v_current_streak := COALESCE(v_profile.current_streak, 0);
  ELSIF v_profile.last_activity_date = p_activity_date - 1 THEN
    v_current_streak := COALESCE(v_profile.current_streak, 0) + 1;
  ELSE
    v_current_streak := 1;
  END IF;

  v_best_streak := GREATEST(COALESCE(v_profile.best_streak, 0), v_current_streak);

  UPDATE public.user_gamification
  SET
    current_streak = v_current_streak,
    best_streak = v_best_streak,
    last_activity_date = GREATEST(COALESCE(v_profile.last_activity_date, p_activity_date), p_activity_date)
  WHERE user_id = p_user_id;

  RETURN QUERY
  SELECT ug.current_streak, ug.best_streak, ug.last_activity_date
  FROM public.user_gamification ug
  WHERE ug.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_badge_tiers(
  p_user_id UUID,
  p_badge_id TEXT,
  p_progress NUMERIC,
  p_bronze_target NUMERIC,
  p_silver_target NUMERIC,
  p_gold_target NUMERIC,
  p_bronze_xp INTEGER,
  p_silver_xp INTEGER,
  p_gold_xp INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.update_badge_progress(p_user_id, p_badge_id, 'bronze', p_progress, p_bronze_target);
  IF p_bronze_xp > 0 AND p_progress >= p_bronze_target THEN
    PERFORM public.unlock_badge(p_user_id, p_badge_id, 'bronze', p_bronze_xp);
  END IF;

  PERFORM public.update_badge_progress(p_user_id, p_badge_id, 'silver', p_progress, p_silver_target);
  IF p_silver_xp > 0 AND p_progress >= p_silver_target THEN
    PERFORM public.unlock_badge(p_user_id, p_badge_id, 'silver', p_silver_xp);
  END IF;

  PERFORM public.update_badge_progress(p_user_id, p_badge_id, 'gold', p_progress, p_gold_target);
  IF p_gold_xp > 0 AND p_progress >= p_gold_target THEN
    PERFORM public.unlock_badge(p_user_id, p_badge_id, 'gold', p_gold_xp);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_gamification_badges(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_savings_total NUMERIC := 0;
  v_investments_total NUMERIC := 0;
  v_emergency_total NUMERIC := 0;
  v_spending_under_limit_count INTEGER := 0;
  v_current_streak INTEGER := 0;
  v_best_streak INTEGER := 0;
  v_completed_goals_count INTEGER := 0;
  v_total_goals_count INTEGER := 0;
  v_distinct_goal_categories INTEGER := 0;
  v_any_activity INTEGER := 0;
  v_wealth_total NUMERIC := 0;
  v_contributions_count INTEGER := 0;
  v_perfect_month_progress INTEGER := 0;
BEGIN
  PERFORM public.ensure_user_gamification_profile(p_user_id);

  SELECT COALESCE(SUM(current_amount), 0)
  INTO v_savings_total
  FROM public.financial_goals
  WHERE user_id = p_user_id
    AND goal_type = 'savings';

  SELECT COALESCE(SUM(current_value), 0)
  INTO v_investments_total
  FROM public.investments
  WHERE user_id = p_user_id
    AND is_active = true;

  SELECT COALESCE(SUM(current_amount), 0)
  INTO v_emergency_total
  FROM public.financial_goals
  WHERE user_id = p_user_id
    AND goal_type = 'savings'
    AND category = 'emergency';

  SELECT COUNT(*)
  INTO v_spending_under_limit_count
  FROM public.financial_goals
  WHERE user_id = p_user_id
    AND goal_type = 'spending_limit'
    AND status = 'active';

  SELECT
    COALESCE(current_streak, 0),
    COALESCE(best_streak, 0)
  INTO
    v_current_streak,
    v_best_streak
  FROM public.user_gamification
  WHERE user_id = p_user_id;

  SELECT
    (
      SELECT COUNT(*)
      FROM public.financial_goals
      WHERE user_id = p_user_id
    ) +
    (
      SELECT COUNT(*)
      FROM public.investment_goals
      WHERE user_id = p_user_id
    )
  INTO v_total_goals_count;

  SELECT
    (
      SELECT COUNT(*)
      FROM public.financial_goals
      WHERE user_id = p_user_id
        AND status = 'completed'
    ) +
    (
      SELECT COUNT(*)
      FROM public.investment_goals
      WHERE user_id = p_user_id
        AND status = 'completed'
    )
  INTO v_completed_goals_count;

  SELECT COUNT(DISTINCT category_key)
  INTO v_distinct_goal_categories
  FROM (
    SELECT NULLIF(category, '') AS category_key
    FROM public.financial_goals
    WHERE user_id = p_user_id
      AND category IS NOT NULL
    UNION
    SELECT CONCAT('expense:', category_id::TEXT) AS category_key
    FROM public.financial_goals
    WHERE user_id = p_user_id
      AND category_id IS NOT NULL
    UNION
    SELECT NULLIF(category, '') AS category_key
    FROM public.investment_goals
    WHERE user_id = p_user_id
      AND category IS NOT NULL
  ) category_union
  WHERE category_key IS NOT NULL;

  SELECT
    (
      SELECT COUNT(*) FROM public.transactions WHERE user_id = p_user_id
    ) +
    (
      SELECT COUNT(*) FROM public.financial_goals WHERE user_id = p_user_id
    ) +
    (
      SELECT COUNT(*) FROM public.investments WHERE user_id = p_user_id
    ) +
    (
      SELECT COUNT(*) FROM public.payable_bills WHERE user_id = p_user_id AND status IN ('paid', 'partial')
    )
  INTO v_any_activity;

  v_wealth_total := COALESCE(v_savings_total, 0) + COALESCE(v_investments_total, 0);

  SELECT
    (
      SELECT COUNT(*) FROM public.financial_goal_contributions WHERE user_id = p_user_id
    ) +
    (
      SELECT COUNT(*) FROM public.investment_goal_contributions WHERE user_id = p_user_id
    )
  INTO v_contributions_count;

  SELECT COALESCE(MIN(best_streak), 0)
  INTO v_perfect_month_progress
  FROM public.financial_goals
  WHERE user_id = p_user_id
    AND goal_type = 'spending_limit'
    AND status IN ('active', 'completed');

  PERFORM public.sync_badge_tiers(p_user_id, 'savings_master', v_savings_total, 1000, 10000, 50000, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'investment_guru', v_investments_total, 5000, 25000, 100000, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'emergency_fund', v_emergency_total, 3000, 10000, 30000, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'spending_control', v_best_streak, 3, 6, 12, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'budget_ninja', v_spending_under_limit_count, 1, 3, 6, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'consistency_king', v_current_streak, 3, 6, 12, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'unstoppable', v_best_streak, 6, 12, 24, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'goal_achiever', v_completed_goals_count, 1, 5, 15, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'goal_creator', v_total_goals_count, 3, 10, 25, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'multi_category', v_distinct_goal_categories, 3, 7, 12, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'first_steps', CASE WHEN v_any_activity > 0 THEN 1 ELSE 0 END, 1, 1, 1, 100, 0, 0);
  PERFORM public.sync_badge_tiers(p_user_id, 'wealth_builder', v_wealth_total, 50000, 200000, 1000000, 50, 150, 500);
  PERFORM public.sync_badge_tiers(p_user_id, 'financial_freedom', v_wealth_total, 100000, 500000, 2000000, 50, 150, 500);
  PERFORM public.sync_badge_tiers(p_user_id, 'contribution_hero', v_contributions_count, 10, 50, 200, 50, 150, 300);
  PERFORM public.sync_badge_tiers(p_user_id, 'perfect_month', v_perfect_month_progress, 1, 3, 6, 100, 200, 400);
END;
$$;

CREATE OR REPLACE FUNCTION public.migrate_legacy_badges_to_badge_progress(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.badge_progress (
    user_id,
    badge_id,
    tier,
    progress,
    target,
    unlocked,
    unlocked_at,
    xp_reward
  )
  SELECT
    ub.user_id,
    ub.badge_id,
    'bronze',
    1,
    1,
    true,
    ub.unlocked_at,
    0
  FROM public.user_badges ub
  WHERE ub.user_id = p_user_id
  ON CONFLICT (user_id, badge_id, tier) DO UPDATE
  SET
    unlocked = EXCLUDED.unlocked,
    unlocked_at = COALESCE(badge_progress.unlocked_at, EXCLUDED.unlocked_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_gamification_state(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.ensure_user_gamification_profile(p_user_id);
  PERFORM public.migrate_legacy_badges_to_badge_progress(p_user_id);
  PERFORM public.sync_gamification_badges(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_gamification_event(
  p_user_id UUID,
  p_event TEXT,
  p_activity_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_award INTEGER := 0;
BEGIN
  PERFORM public.ensure_user_gamification_profile(p_user_id);

  v_xp_award := CASE p_event
    WHEN 'create_transaction' THEN 10
    WHEN 'create_goal' THEN 20
    WHEN 'add_goal_contribution' THEN 15
    WHEN 'pay_bill' THEN 10
    WHEN 'create_investment' THEN 25
    ELSE 0
  END;

  IF v_xp_award > 0 THEN
    PERFORM public.add_xp_to_user(p_user_id, v_xp_award);
  END IF;

  PERFORM public.track_user_activity_streak(p_user_id, p_activity_date);
  PERFORM public.sync_gamification_badges(p_user_id);

  RETURN jsonb_build_object(
    'event', p_event,
    'xp_awarded', v_xp_award
  );
END;
$$;

COMMENT ON FUNCTION public.ensure_user_gamification_profile(UUID)
IS 'Garante a existência do perfil canônico de gamificação do usuário.';

COMMENT ON FUNCTION public.track_user_activity_streak(UUID, DATE)
IS 'Atualiza o streak global diário do usuário com base na última atividade registrada.';

COMMENT ON FUNCTION public.sync_gamification_badges(UUID)
IS 'Sincroniza badge_progress com as 15 conquistas oficiais do produto a partir de dados reais.';

COMMENT ON FUNCTION public.migrate_legacy_badges_to_badge_progress(UUID)
IS 'Copia badges legados desbloqueados para badge_progress preservando unlocked_at para backfill.';

COMMENT ON FUNCTION public.bootstrap_gamification_state(UUID)
IS 'Inicializa o perfil canônico, migra badges legados e popula badge_progress do usuário.';

COMMENT ON FUNCTION public.process_gamification_event(UUID, TEXT, DATE)
IS 'Processa um evento canônico de gamificação: concede XP, atualiza streak diário e sincroniza badge_progress.';

COMMIT;
