ALTER TABLE IF EXISTS public.portfolio_snapshots
  ADD COLUMN IF NOT EXISTS total_assets NUMERIC,
  ADD COLUMN IF NOT EXISTS total_liabilities NUMERIC,
  ADD COLUMN IF NOT EXISTS net_worth NUMERIC,
  ADD COLUMN IF NOT EXISTS asset_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS liability_breakdown JSONB;

COMMENT ON COLUMN public.portfolio_snapshots.total_assets IS 'Ativos totais consolidados no snapshot diário';
COMMENT ON COLUMN public.portfolio_snapshots.total_liabilities IS 'Passivos totais consolidados no snapshot diário';
COMMENT ON COLUMN public.portfolio_snapshots.net_worth IS 'Patrimônio líquido consolidado no snapshot diário';
COMMENT ON COLUMN public.portfolio_snapshots.asset_breakdown IS 'Composição resumida dos ativos no snapshot diário';
COMMENT ON COLUMN public.portfolio_snapshots.liability_breakdown IS 'Composição resumida dos passivos no snapshot diário';
