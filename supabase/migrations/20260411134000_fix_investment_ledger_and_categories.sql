-- Canonicaliza categorias de investimentos e torna o ledger transacional a fonte de verdade.

-- 1. Normalização de categorias legadas e correção de títulos do tesouro classificados incorretamente.
UPDATE public.investments
SET category = CASE category
  WHEN 'renda_fixa' THEN 'fixed_income'
  WHEN 'acoes_nacionais' THEN 'stock'
  WHEN 'fiis' THEN 'reit'
  WHEN 'internacional' THEN 'international'
  WHEN 'cripto' THEN 'crypto'
  WHEN 'previdencia' THEN 'pension'
  WHEN 'outros' THEN 'other'
  ELSE category
END
WHERE category IN (
  'renda_fixa',
  'acoes_nacionais',
  'fiis',
  'internacional',
  'cripto',
  'previdencia',
  'outros'
);

UPDATE public.investments
SET category = CASE
    WHEN type = 'treasury' THEN 'fixed_income'
    WHEN type = 'stock' THEN 'stock'
    WHEN type = 'real_estate' THEN 'reit'
    WHEN type = 'fund' THEN 'fund'
    WHEN type = 'crypto' THEN 'crypto'
    ELSE 'other'
  END
WHERE category IS NULL;

UPDATE public.investments
SET
  type = 'treasury',
  category = 'fixed_income',
  updated_at = NOW()
WHERE UPPER(COALESCE(ticker, '')) ~ '^(IPCA|SELIC|PRE)'
   OR UPPER(COALESCE(name, '')) LIKE '%TESOURO%';

-- 2. Garante uma transação de abertura para investimentos antigos sem compra registrada.
INSERT INTO public.investment_transactions (
  investment_id,
  user_id,
  transaction_type,
  quantity,
  price,
  total_value,
  fees,
  tax,
  transaction_date,
  notes
)
SELECT
  i.id,
  i.user_id,
  'buy',
  i.quantity,
  i.purchase_price,
  COALESCE(NULLIF(i.total_invested, 0), i.quantity * i.purchase_price),
  0,
  0,
  (COALESCE(i.purchase_date::timestamp, i.created_at AT TIME ZONE 'UTC')::date + TIME '12:00') AT TIME ZONE 'UTC',
  'Posição inicial da carteira'
FROM public.investments i
WHERE i.is_active = true
  AND COALESCE(i.quantity, 0) > 0
  AND COALESCE(i.purchase_price, 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.investment_transactions t
    WHERE t.investment_id = i.id
      AND t.transaction_type = 'buy'
  );

-- 3. Recalcula a posição do investimento a partir do ledger completo.
CREATE OR REPLACE FUNCTION public.recalculate_investment_from_ledger(p_investment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction RECORD;
  v_quantity NUMERIC(18,8) := 0;
  v_total_invested NUMERIC(18,2) := 0;
  v_average_price NUMERIC(18,8) := 0;
  v_current_price NUMERIC(18,2);
BEGIN
  SELECT current_price
  INTO v_current_price
  FROM public.investments
  WHERE id = p_investment_id;

  FOR v_transaction IN
    SELECT
      transaction_type,
      COALESCE(quantity, 0) AS quantity,
      COALESCE(price, 0) AS price,
      COALESCE(total_value, 0) AS total_value
    FROM public.investment_transactions
    WHERE investment_id = p_investment_id
    ORDER BY transaction_date ASC, created_at ASC, id ASC
  LOOP
    IF v_transaction.transaction_type = 'buy' THEN
      v_quantity := v_quantity + v_transaction.quantity;
      v_total_invested := v_total_invested + v_transaction.total_value;
    ELSIF v_transaction.transaction_type = 'sell' THEN
      IF v_quantity > 0 AND v_transaction.quantity > 0 THEN
        v_average_price := v_total_invested / v_quantity;
        v_total_invested := GREATEST(v_total_invested - (v_average_price * v_transaction.quantity), 0);
        v_quantity := GREATEST(v_quantity - v_transaction.quantity, 0);
      END IF;
    ELSIF v_transaction.transaction_type = 'split' THEN
      IF v_transaction.quantity > 0 THEN
        v_quantity := v_quantity * v_transaction.quantity;
      END IF;
    ELSIF v_transaction.transaction_type = 'bonus' THEN
      v_quantity := v_quantity + v_transaction.quantity;
    END IF;
  END LOOP;

  v_average_price := CASE
    WHEN v_quantity > 0 THEN v_total_invested / v_quantity
    ELSE 0
  END;

  UPDATE public.investments
  SET
    quantity = v_quantity,
    purchase_price = v_average_price,
    total_invested = v_total_invested,
    current_value = CASE
      WHEN COALESCE(v_current_price, 0) > 0 THEN v_current_price * v_quantity
      ELSE v_total_invested
    END,
    status = CASE
      WHEN v_quantity <= 0 THEN 'sold'
      ELSE 'active'
    END,
    updated_at = NOW()
  WHERE id = p_investment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_investment_after_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.recalculate_investment_from_ledger(COALESCE(NEW.investment_id, OLD.investment_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_investment_after_transaction ON public.investment_transactions;

CREATE TRIGGER trigger_update_investment_after_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_investment_after_transaction();

CREATE OR REPLACE FUNCTION public.create_opening_transaction_for_investment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(NEW.quantity, 0) <= 0 OR COALESCE(NEW.purchase_price, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.investment_transactions (
    investment_id,
    user_id,
    transaction_type,
    quantity,
    price,
    total_value,
    fees,
    tax,
    transaction_date,
    notes
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    'buy',
    NEW.quantity,
    NEW.purchase_price,
    COALESCE(NULLIF(NEW.total_invested, 0), NEW.quantity * NEW.purchase_price),
    0,
    0,
    (COALESCE(NEW.purchase_date::timestamp, NEW.created_at AT TIME ZONE 'UTC')::date + TIME '12:00') AT TIME ZONE 'UTC',
    'Posição inicial da carteira'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_opening_transaction_for_investment ON public.investments;

CREATE TRIGGER trigger_create_opening_transaction_for_investment
AFTER INSERT ON public.investments
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.create_opening_transaction_for_investment();

-- 4. Recalcula todos os investimentos ativos após o backfill.
DO $$
DECLARE
  investment_row RECORD;
BEGIN
  FOR investment_row IN
    SELECT id
    FROM public.investments
    WHERE is_active = true
  LOOP
    PERFORM public.recalculate_investment_from_ledger(investment_row.id);
  END LOOP;
END;
$$;
