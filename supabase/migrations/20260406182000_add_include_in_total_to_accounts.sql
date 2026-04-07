ALTER TABLE IF EXISTS public.accounts
  ADD COLUMN IF NOT EXISTS include_in_total BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.accounts.include_in_total IS 'Define se a conta participa dos totais consolidados patrimoniais';
