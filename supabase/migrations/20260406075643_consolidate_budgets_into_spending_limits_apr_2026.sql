BEGIN;

CREATE OR REPLACE FUNCTION public.backfill_budgets_into_spending_goals(
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH source_rows AS (
    SELECT
      b.user_id,
      b.category_id,
      b.month,
      b.planned_amount,
      b.notes,
      c.name AS category_name
    FROM public.budgets b
    LEFT JOIN public.categories c
      ON c.id = b.category_id
    WHERE p_user_id IS NULL OR b.user_id = p_user_id
  ),
  inserted_rows AS (
    INSERT INTO public.financial_goals (
      user_id,
      goal_type,
      name,
      category_id,
      target_amount,
      period_type,
      period_start,
      period_end,
      status,
      created_at,
      updated_at
    )
    SELECT
      src.user_id,
      'spending_limit',
      COALESCE('Limite ' || NULLIF(src.category_name, ''), 'Limite mensal'),
      src.category_id,
      src.planned_amount,
      'monthly',
      TO_DATE(src.month || '-01', 'YYYY-MM-DD'),
      (DATE_TRUNC('month', TO_DATE(src.month || '-01', 'YYYY-MM-DD')) + INTERVAL '1 month - 1 day')::DATE,
      'active',
      NOW(),
      NOW()
    FROM source_rows src
    WHERE COALESCE(src.planned_amount, 0) > 0
      AND src.user_id IS NOT NULL
      AND src.category_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.financial_goals fg
        WHERE fg.user_id = src.user_id
          AND fg.goal_type = 'spending_limit'
          AND fg.category_id = src.category_id
          AND fg.period_type = 'monthly'
          AND fg.period_start = TO_DATE(src.month || '-01', 'YYYY-MM-DD')
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO inserted_count
  FROM inserted_rows;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

SELECT public.backfill_budgets_into_spending_goals();

COMMENT ON FUNCTION public.backfill_budgets_into_spending_goals(UUID)
IS 'Migra budgets legados para financial_goals.goal_type = spending_limit, evitando duplicidade por usuário/categoria/mês.';

COMMENT ON TABLE public.budgets
IS 'DEPRECATED: legado temporário. O conceito canônico de planejamento mensal por categoria está em financial_goals com goal_type = spending_limit.';

COMMIT;;
