BEGIN;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS budget_allocation JSONB,
  ADD COLUMN IF NOT EXISTS budget_alert_threshold INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_settings_budget_alert_threshold_check'
      AND conrelid = 'public.user_settings'::regclass
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_budget_alert_threshold_check
      CHECK (budget_alert_threshold >= 50 AND budget_alert_threshold <= 100);
  END IF;
END
$$;

COMMENT ON COLUMN public.user_settings.budget_allocation IS
  'Distribuicao planejada de renda/gastos por buckets para dashboard e insights da Ana Clara.';

COMMENT ON COLUMN public.user_settings.budget_alert_threshold IS
  'LEGADO: limiar simples de alerta. O contrato canonico de alertas proativos vive em notification_preferences.';

COMMIT;
