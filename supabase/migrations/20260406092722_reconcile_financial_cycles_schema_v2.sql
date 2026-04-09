BEGIN;

CREATE TABLE IF NOT EXISTS public.financial_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  day INTEGER NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  color TEXT,
  icon TEXT,
  notify_start BOOLEAN NOT NULL DEFAULT false,
  notify_days_before INTEGER,
  linked_goals TEXT[],
  auto_actions JSONB
);

ALTER TABLE public.financial_cycles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.financial_cycles
  DROP CONSTRAINT IF EXISTS financial_cycles_type_check;

ALTER TABLE public.financial_cycles
  ADD CONSTRAINT financial_cycles_type_check
  CHECK (type = ANY (ARRAY['salary'::text, 'credit_card'::text, 'rent'::text, 'custom'::text]));

ALTER TABLE public.financial_cycles
  DROP CONSTRAINT IF EXISTS financial_cycles_day_check;

ALTER TABLE public.financial_cycles
  ADD CONSTRAINT financial_cycles_day_check
  CHECK (day >= 1 AND day <= 28);

ALTER TABLE public.financial_cycles
  DROP CONSTRAINT IF EXISTS financial_cycles_notify_days_before_check;

ALTER TABLE public.financial_cycles
  ADD CONSTRAINT financial_cycles_notify_days_before_check
  CHECK (notify_days_before IS NULL OR (notify_days_before >= 1 AND notify_days_before <= 7));

CREATE INDEX IF NOT EXISTS idx_financial_cycles_user_id
  ON public.financial_cycles(user_id);

CREATE INDEX IF NOT EXISTS idx_financial_cycles_active
  ON public.financial_cycles(user_id, active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_cycles'
      AND policyname = 'financial_cycles_select_own'
  ) THEN
    CREATE POLICY financial_cycles_select_own
      ON public.financial_cycles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_cycles'
      AND policyname = 'financial_cycles_insert_own'
  ) THEN
    CREATE POLICY financial_cycles_insert_own
      ON public.financial_cycles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_cycles'
      AND policyname = 'financial_cycles_update_own'
  ) THEN
    CREATE POLICY financial_cycles_update_own
      ON public.financial_cycles
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'financial_cycles'
      AND policyname = 'financial_cycles_delete_own'
  ) THEN
    CREATE POLICY financial_cycles_delete_own
      ON public.financial_cycles
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_financial_cycles_updated_at'
      AND tgrelid = 'public.financial_cycles'::regclass
  ) THEN
    CREATE TRIGGER update_financial_cycles_updated_at
      BEFORE UPDATE ON public.financial_cycles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

COMMENT ON TABLE public.financial_cycles IS
  'Ciclos financeiros pessoais usados em planejamento, insights da Ana Clara e notificacoes proativas.';

COMMENT ON COLUMN public.financial_cycles.type IS
  'Tipos canonicos da UI: salary, credit_card, rent e custom.';

COMMENT ON COLUMN public.financial_cycles.linked_goals IS
  'Reservado para relacionamento futuro com metas e automacoes.';

COMMENT ON COLUMN public.financial_cycles.auto_actions IS
  'Reservado para automacoes futuras disparadas no inicio de ciclo.';

COMMIT;;
