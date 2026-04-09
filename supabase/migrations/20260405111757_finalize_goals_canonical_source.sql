BEGIN;

ALTER TABLE public.financial_goals
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.financial_goal_contributions
ADD COLUMN IF NOT EXISTS date DATE;

ALTER TABLE public.financial_goal_contributions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.financial_goal_contributions
SET
  date = COALESCE(date, created_at::date, CURRENT_DATE),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE date IS NULL OR updated_at IS NULL;

ALTER TABLE public.financial_goal_contributions
ALTER COLUMN date SET DEFAULT CURRENT_DATE;

ALTER TABLE public.financial_goal_contributions
ALTER COLUMN date SET NOT NULL;

ALTER TABLE public.financial_goal_contributions
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.financial_goal_contributions
ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'financial_goals_category_check'
  ) THEN
    ALTER TABLE public.financial_goals
    ADD CONSTRAINT financial_goals_category_check
    CHECK (
      category IS NULL OR category = ANY (
        ARRAY['travel', 'house', 'car', 'emergency', 'education', 'retirement', 'general']
      )
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_financial_goal_savings_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.goal_type = 'savings' THEN
    IF NEW.target_date IS NULL AND NEW.deadline IS NOT NULL THEN
      NEW.target_date := NEW.deadline;
    END IF;

    IF NEW.deadline IS NULL AND NEW.target_date IS NOT NULL THEN
      NEW.deadline := NEW.target_date;
    END IF;

    IF NEW.target_date IS NOT NULL AND NEW.deadline IS NOT NULL AND NEW.target_date <> NEW.deadline THEN
      NEW.deadline := NEW.target_date;
    END IF;

    IF NEW.category IS NULL OR BTRIM(NEW.category) = '' THEN
      NEW.category := 'general';
    END IF;

    IF NEW.start_date IS NULL THEN
      NEW.start_date := CURRENT_DATE;
    END IF;
  ELSE
    NEW.category := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_financial_goal_savings_fields ON public.financial_goals;

CREATE TRIGGER trg_sync_financial_goal_savings_fields
  BEFORE INSERT OR UPDATE ON public.financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_financial_goal_savings_fields();

CREATE OR REPLACE FUNCTION public.apply_financial_goal_contribution()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.financial_goals
    SET
      current_amount = COALESCE(current_amount, 0) + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.goal_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.financial_goals
    SET
      current_amount = COALESCE(current_amount, 0) - COALESCE(OLD.amount, 0) + COALESCE(NEW.amount, 0),
      updated_at = NOW()
    WHERE id = NEW.goal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.financial_goals
    SET
      current_amount = COALESCE(current_amount, 0) - OLD.amount,
      updated_at = NOW()
    WHERE id = OLD.goal_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apply_savings_contribution ON public.financial_goal_contributions;
DROP TRIGGER IF EXISTS trg_apply_financial_goal_contribution ON public.financial_goal_contributions;

CREATE TRIGGER trg_apply_financial_goal_contribution
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_financial_goal_contribution();

DROP TRIGGER IF EXISTS trg_financial_goal_contributions_updated_at ON public.financial_goal_contributions;

CREATE TRIGGER trg_financial_goal_contributions_updated_at
  BEFORE UPDATE ON public.financial_goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

WITH legacy_savings AS (
  SELECT
    sg.*,
    COALESCE(sg.target_date, sg.deadline) AS canonical_target_date,
    CASE
      WHEN COALESCE(sg.is_completed, FALSE) THEN 'completed'
      WHEN sg.status IN ('paused', 'cancelled') THEN 'archived'
      ELSE COALESCE(sg.status, 'active')
    END AS canonical_status
  FROM public.savings_goals sg
)
UPDATE public.financial_goals fg
SET
  icon = COALESCE(fg.icon, ls.icon),
  priority = COALESCE(fg.priority, ls.priority, 'medium'),
  start_date = COALESCE(fg.start_date, ls.start_date, CURRENT_DATE),
  target_date = COALESCE(fg.target_date, ls.canonical_target_date),
  deadline = COALESCE(fg.deadline, fg.target_date, ls.canonical_target_date),
  category = COALESCE(NULLIF(fg.category, ''), ls.category, 'general'),
  contribution_frequency = COALESCE(fg.contribution_frequency, ls.contribution_frequency),
  contribution_day = COALESCE(fg.contribution_day, ls.contribution_day),
  notify_milestones = COALESCE(fg.notify_milestones, ls.notify_milestones, TRUE),
  notify_contribution = COALESCE(fg.notify_contribution, ls.notify_contribution, FALSE),
  notify_delay = COALESCE(fg.notify_delay, ls.notify_delay, FALSE),
  is_completed = COALESCE(fg.is_completed, ls.is_completed, FALSE),
  target_percent = COALESCE(fg.target_percent, ls.target_percent),
  status = COALESCE(fg.status, ls.canonical_status),
  updated_at = NOW()
FROM legacy_savings ls
WHERE fg.user_id = ls.user_id
  AND fg.goal_type = 'savings'
  AND fg.name = ls.name
  AND fg.target_amount = ls.target_amount
  AND COALESCE(fg.target_date, fg.deadline) = ls.canonical_target_date;

WITH legacy_savings AS (
  SELECT
    sg.*,
    COALESCE(sg.target_date, sg.deadline) AS canonical_target_date,
    CASE
      WHEN COALESCE(sg.is_completed, FALSE) THEN 'completed'
      WHEN sg.status IN ('paused', 'cancelled') THEN 'archived'
      ELSE COALESCE(sg.status, 'active')
    END AS canonical_status
  FROM public.savings_goals sg
)
INSERT INTO public.financial_goals (
  user_id,
  goal_type,
  name,
  icon,
  target_amount,
  current_amount,
  deadline,
  status,
  priority,
  start_date,
  target_date,
  target_percent,
  contribution_frequency,
  contribution_day,
  notify_milestones,
  notify_contribution,
  notify_delay,
  is_completed,
  category,
  created_at,
  updated_at
)
SELECT
  ls.user_id,
  'savings',
  ls.name,
  ls.icon,
  ls.target_amount,
  ls.current_amount,
  ls.canonical_target_date,
  ls.canonical_status,
  COALESCE(ls.priority, 'medium'),
  COALESCE(ls.start_date, CURRENT_DATE),
  ls.canonical_target_date,
  ls.target_percent,
  ls.contribution_frequency,
  ls.contribution_day,
  COALESCE(ls.notify_milestones, TRUE),
  COALESCE(ls.notify_contribution, FALSE),
  COALESCE(ls.notify_delay, FALSE),
  COALESCE(ls.is_completed, FALSE),
  COALESCE(ls.category, 'general'),
  ls.created_at,
  ls.updated_at
FROM legacy_savings ls
WHERE NOT EXISTS (
  SELECT 1
  FROM public.financial_goals fg
  WHERE fg.user_id = ls.user_id
    AND fg.goal_type = 'savings'
    AND fg.name = ls.name
    AND fg.target_amount = ls.target_amount
    AND COALESCE(fg.target_date, fg.deadline) = ls.canonical_target_date
);

WITH legacy_goal_map AS (
  SELECT
    sg.id AS savings_goal_id,
    fg.id AS financial_goal_id
  FROM public.savings_goals sg
  JOIN public.financial_goals fg
    ON fg.user_id = sg.user_id
   AND fg.goal_type = 'savings'
   AND fg.name = sg.name
   AND fg.target_amount = sg.target_amount
   AND COALESCE(fg.target_date, fg.deadline) = COALESCE(sg.target_date, sg.deadline)
)
INSERT INTO public.financial_goal_contributions (
  user_id,
  goal_id,
  amount,
  note,
  created_at,
  date,
  updated_at
)
SELECT
  gc.user_id,
  lgm.financial_goal_id,
  gc.amount,
  gc.note,
  gc.created_at,
  COALESCE(gc.date, gc.created_at::date, CURRENT_DATE),
  COALESCE(gc.updated_at, gc.created_at, NOW())
FROM public.goal_contributions gc
JOIN legacy_goal_map lgm
  ON lgm.savings_goal_id = gc.goal_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.financial_goal_contributions fgc
  WHERE fgc.user_id = gc.user_id
    AND fgc.goal_id = lgm.financial_goal_id
    AND fgc.amount = gc.amount
    AND fgc.date = COALESCE(gc.date, gc.created_at::date, CURRENT_DATE)
    AND COALESCE(fgc.note, '') = COALESCE(gc.note, '')
);

WITH legacy_savings AS (
  SELECT
    sg.*,
    COALESCE(sg.target_date, sg.deadline) AS canonical_target_date
  FROM public.savings_goals sg
)
UPDATE public.financial_goals fg
SET
  current_amount = ls.current_amount,
  updated_at = NOW()
FROM legacy_savings ls
WHERE fg.user_id = ls.user_id
  AND fg.goal_type = 'savings'
  AND fg.name = ls.name
  AND fg.target_amount = ls.target_amount
  AND COALESCE(fg.target_date, fg.deadline) = ls.canonical_target_date;

COMMENT ON TABLE public.financial_goal_contributions IS 'Histórico canônico de aportes em financial_goals.';
COMMENT ON COLUMN public.financial_goals.category IS 'Categoria semântica da meta de economia legada (travel, house, etc).';
COMMENT ON COLUMN public.financial_goal_contributions.date IS 'Data efetiva do aporte.';

COMMIT;;
