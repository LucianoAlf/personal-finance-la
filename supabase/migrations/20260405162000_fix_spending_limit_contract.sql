BEGIN;

CREATE OR REPLACE FUNCTION public.get_spending_goal_actual_amount(
  p_user_id UUID,
  p_category_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS NUMERIC AS $$
DECLARE
  regular_expenses NUMERIC := 0;
  credit_expenses NUMERIC := 0;
BEGIN
  SELECT COALESCE(SUM(ABS(t.amount)), 0)
  INTO regular_expenses
  FROM public.transactions t
  WHERE t.user_id = p_user_id
    AND t.category_id = p_category_id
    AND t.type = 'expense'
    AND COALESCE(t.is_paid, TRUE) = TRUE
    AND t.transaction_date >= p_period_start
    AND t.transaction_date <= p_period_end;

  SELECT COALESCE(SUM(ABS(t.amount)), 0)
  INTO credit_expenses
  FROM public.credit_card_transactions t
  WHERE t.user_id = p_user_id
    AND t.category_id = p_category_id
    AND t.purchase_date >= p_period_start
    AND t.purchase_date <= p_period_end;

  RETURN regular_expenses + credit_expenses;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.refresh_spending_goal(goal_row public.financial_goals)
RETURNS VOID AS $$
DECLARE
  actual_amount NUMERIC := 0;
  new_status TEXT := 'active';
BEGIN
  IF goal_row.goal_type <> 'spending_limit' OR goal_row.category_id IS NULL OR goal_row.period_start IS NULL OR goal_row.period_end IS NULL THEN
    RETURN;
  END IF;

  actual_amount := public.get_spending_goal_actual_amount(
    goal_row.user_id,
    goal_row.category_id,
    goal_row.period_start,
    goal_row.period_end
  );

  IF actual_amount >= goal_row.target_amount THEN
    new_status := 'exceeded';
  END IF;

  UPDATE public.financial_goals
  SET
    current_amount = actual_amount,
    status = new_status,
    updated_at = NOW()
  WHERE id = goal_row.id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.refresh_spending_goals_by_category(
  p_user_id UUID,
  p_category_id UUID
)
RETURNS VOID AS $$
DECLARE
  goal_row public.financial_goals%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_category_id IS NULL THEN
    RETURN;
  END IF;

  FOR goal_row IN
    SELECT *
    FROM public.financial_goals
    WHERE user_id = p_user_id
      AND goal_type = 'spending_limit'
      AND category_id = p_category_id
      AND status IN ('active', 'exceeded')
  LOOP
    PERFORM public.refresh_spending_goal(goal_row);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_spending_goal_before_write()
RETURNS TRIGGER AS $$
DECLARE
  actual_amount NUMERIC := 0;
BEGIN
  IF NEW.goal_type <> 'spending_limit' THEN
    RETURN NEW;
  END IF;

  IF NEW.period_start IS NULL OR NEW.period_end IS NULL OR NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  actual_amount := public.get_spending_goal_actual_amount(
    NEW.user_id,
    NEW.category_id,
    NEW.period_start,
    NEW.period_end
  );

  NEW.current_amount := actual_amount;
  NEW.status := CASE
    WHEN actual_amount >= NEW.target_amount THEN 'exceeded'
    ELSE 'active'
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_spending_goal_before_write ON public.financial_goals;

CREATE TRIGGER trg_sync_spending_goal_before_write
  BEFORE INSERT OR UPDATE OF category_id, period_start, period_end, target_amount, goal_type
  ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_spending_goal_before_write();

CREATE OR REPLACE FUNCTION public.update_spending_goals()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  new_category_id UUID;
  old_user_id UUID;
  old_category_id UUID;
BEGIN
  new_user_id := COALESCE(NEW.user_id, NULL);
  new_category_id := COALESCE(NEW.category_id, NULL);
  old_user_id := COALESCE(OLD.user_id, NULL);
  old_category_id := COALESCE(OLD.category_id, NULL);

  PERFORM public.refresh_spending_goals_by_category(new_user_id, new_category_id);

  IF old_category_id IS DISTINCT FROM new_category_id OR old_user_id IS DISTINCT FROM new_user_id THEN
    PERFORM public.refresh_spending_goals_by_category(old_user_id, old_category_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_spending_goals_from_transactions()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  new_category_id UUID;
  old_user_id UUID;
  old_category_id UUID;
BEGIN
  new_user_id := COALESCE(NEW.user_id, NULL);
  new_category_id := COALESCE(NEW.category_id, NULL);
  old_user_id := COALESCE(OLD.user_id, NULL);
  old_category_id := COALESCE(OLD.category_id, NULL);

  IF TG_OP <> 'DELETE' AND COALESCE(NEW.type, '') <> 'expense' THEN
    new_category_id := NULL;
  END IF;

  IF TG_OP <> 'INSERT' AND COALESCE(OLD.type, '') <> 'expense' THEN
    old_category_id := NULL;
  END IF;

  PERFORM public.refresh_spending_goals_by_category(new_user_id, new_category_id);

  IF old_category_id IS DISTINCT FROM new_category_id OR old_user_id IS DISTINCT FROM new_user_id THEN
    PERFORM public.refresh_spending_goals_by_category(old_user_id, old_category_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_spending_goals_from_transactions ON public.transactions;

CREATE TRIGGER trg_update_spending_goals_from_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_spending_goals_from_transactions();

CREATE OR REPLACE FUNCTION public.calculate_spending_streak(goal_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  current_period_start DATE;
  current_period_end DATE;
  goal_record RECORD;
  period_spending NUMERIC := 0;
BEGIN
  SELECT *
  INTO goal_record
  FROM public.financial_goals
  WHERE id = goal_id;

  IF goal_record.goal_type <> 'spending_limit' OR goal_record.category_id IS NULL THEN
    RETURN 0;
  END IF;

  IF goal_record.period_type = 'yearly' THEN
    current_period_start := DATE_TRUNC('year', CURRENT_DATE)::DATE;
    current_period_end := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day')::DATE;
  ELSIF goal_record.period_type = 'quarterly' THEN
    current_period_start := DATE_TRUNC('quarter', CURRENT_DATE)::DATE;
    current_period_end := (DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 month' - INTERVAL '1 day')::DATE;
  ELSE
    current_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    current_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  END IF;

  WHILE current_period_start >= goal_record.period_start LOOP
    period_spending := public.get_spending_goal_actual_amount(
      goal_record.user_id,
      goal_record.category_id,
      current_period_start,
      current_period_end
    );

    IF period_spending <= goal_record.target_amount THEN
      streak := streak + 1;
    ELSE
      EXIT;
    END IF;

    IF goal_record.period_type = 'yearly' THEN
      current_period_start := (current_period_start - INTERVAL '1 year')::DATE;
      current_period_end := (current_period_end - INTERVAL '1 year')::DATE;
    ELSIF goal_record.period_type = 'quarterly' THEN
      current_period_start := (current_period_start - INTERVAL '3 month')::DATE;
      current_period_end := (current_period_end - INTERVAL '3 month')::DATE;
    ELSE
      current_period_start := (current_period_start - INTERVAL '1 month')::DATE;
      current_period_end := (current_period_end - INTERVAL '1 month')::DATE;
    END IF;
  END LOOP;

  RETURN streak;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_best_streak(goal_id UUID)
RETURNS VOID AS $$
DECLARE
  current_streak INTEGER;
BEGIN
  current_streak := public.calculate_spending_streak(goal_id);

  UPDATE public.financial_goals
  SET
    streak_count = current_streak,
    best_streak = GREATEST(COALESCE(best_streak, 0), current_streak),
    updated_at = NOW()
  WHERE id = goal_id;
END;
$$ LANGUAGE plpgsql;

UPDATE public.financial_goals
SET
  period_end = CASE
    WHEN period_type = 'monthly'
      AND period_end = (DATE_TRUNC('month', period_start) + INTERVAL '1 month')::DATE
      THEN (DATE_TRUNC('month', period_start) + INTERVAL '1 month - 1 day')::DATE
    WHEN period_type = 'quarterly'
      AND period_end = (DATE_TRUNC('quarter', period_start) + INTERVAL '3 month')::DATE
      THEN (DATE_TRUNC('quarter', period_start) + INTERVAL '3 month - 1 day')::DATE
    WHEN period_type = 'yearly'
      AND period_end = (DATE_TRUNC('year', period_start) + INTERVAL '1 year')::DATE
      THEN (DATE_TRUNC('year', period_start) + INTERVAL '1 year - 1 day')::DATE
    ELSE period_end
  END,
  updated_at = NOW()
WHERE goal_type = 'spending_limit'
  AND period_start IS NOT NULL
  AND period_end IS NOT NULL;

WITH refreshed AS (
  SELECT id
  FROM public.financial_goals
  WHERE goal_type = 'spending_limit'
)
UPDATE public.financial_goals fg
SET
  current_amount = public.get_spending_goal_actual_amount(fg.user_id, fg.category_id, fg.period_start, fg.period_end),
  status = CASE
    WHEN public.get_spending_goal_actual_amount(fg.user_id, fg.category_id, fg.period_start, fg.period_end) >= fg.target_amount THEN 'exceeded'
    ELSE 'active'
  END,
  updated_at = NOW()
WHERE fg.id IN (SELECT id FROM refreshed);

DO $$
DECLARE
  goal_row RECORD;
BEGIN
  FOR goal_row IN
    SELECT id
    FROM public.financial_goals
    WHERE goal_type = 'spending_limit'
  LOOP
    PERFORM public.update_best_streak(goal_row.id);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.get_spending_goal_actual_amount(UUID, UUID, DATE, DATE)
IS 'Calcula o gasto real de uma meta spending_limit somando transactions e credit_card_transactions.';

COMMIT;
