
-- ============================================
-- MIGRATION: Integração Faturas x Contas a Pagar
-- ============================================

-- 1. Adicionar novos ENUMs de contexto para fluxo de faturas
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_invoice_due_date';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_invoice_amount';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_card_selection';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_card_creation_confirmation';
ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'awaiting_card_limit';

-- 2. Criar função que retorna contas consolidadas (payable_bills + credit_card_invoices)
CREATE OR REPLACE FUNCTION get_contas_consolidadas(
  p_user_id UUID,
  p_status TEXT[] DEFAULT ARRAY['pending', 'overdue', 'open', 'closed'],
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  description TEXT,
  amount NUMERIC,
  due_date DATE,
  bill_type TEXT,
  status TEXT,
  is_recurring BOOLEAN,
  is_installment BOOLEAN,
  installment_number INTEGER,
  installment_total INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  source_type TEXT,
  source_id UUID,
  credit_card_id UUID,
  credit_card_name TEXT,
  credit_card_brand TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  
  -- Contas a pagar normais (exceto bill_type = 'credit_card' para evitar duplicação)
  SELECT 
    pb.id,
    pb.user_id,
    pb.description::TEXT,
    pb.amount,
    pb.due_date,
    pb.bill_type::TEXT,
    pb.status::TEXT,
    pb.is_recurring,
    pb.is_installment,
    pb.installment_number,
    pb.installment_total,
    pb.created_at,
    pb.updated_at,
    'payable_bill'::TEXT as source_type,
    pb.id as source_id,
    NULL::UUID as credit_card_id,
    NULL::TEXT as credit_card_name,
    NULL::TEXT as credit_card_brand
  FROM payable_bills pb
  WHERE pb.user_id = p_user_id
    AND pb.bill_type != 'credit_card'
    AND pb.status::TEXT = ANY(p_status)
    AND (p_start_date IS NULL OR pb.due_date >= p_start_date)
    AND (p_end_date IS NULL OR pb.due_date <= p_end_date)
  
  UNION ALL
  
  -- Faturas de cartão de crédito
  SELECT 
    ci.id,
    ci.user_id,
    ('Fatura ' || cc.name)::TEXT as description,
    ci.total_amount as amount,
    ci.due_date,
    'credit_card'::TEXT as bill_type,
    ci.status::TEXT,
    false as is_recurring,
    false as is_installment,
    NULL::INTEGER as installment_number,
    NULL::INTEGER as installment_total,
    ci.created_at,
    ci.updated_at,
    'credit_card_invoice'::TEXT as source_type,
    ci.id as source_id,
    cc.id as credit_card_id,
    cc.name::TEXT as credit_card_name,
    cc.brand::TEXT as credit_card_brand
  FROM credit_card_invoices ci
  JOIN credit_cards cc ON ci.credit_card_id = cc.id
  WHERE ci.user_id = p_user_id
    AND ci.status::TEXT = ANY(p_status)
    AND (p_start_date IS NULL OR ci.due_date >= p_start_date)
    AND (p_end_date IS NULL OR ci.due_date <= p_end_date)
  
  ORDER BY due_date ASC;
END;
$$;

-- 3. Criar função auxiliar para buscar cartão por nome/banco
CREATE OR REPLACE FUNCTION buscar_cartao_por_nome(
  p_user_id UUID,
  p_nome_busca TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand TEXT,
  due_day INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.name::TEXT,
    cc.brand::TEXT,
    cc.due_day,
    cc.is_active
  FROM credit_cards cc
  WHERE cc.user_id = p_user_id
    AND cc.is_active = true
    AND (
      LOWER(cc.name) LIKE '%' || LOWER(p_nome_busca) || '%'
      OR LOWER(cc.brand) LIKE '%' || LOWER(p_nome_busca) || '%'
    )
  LIMIT 1;
END;
$$;

-- 4. Criar função para criar/atualizar fatura de cartão
CREATE OR REPLACE FUNCTION criar_ou_atualizar_fatura(
  p_user_id UUID,
  p_credit_card_id UUID,
  p_amount NUMERIC,
  p_due_date DATE
)
RETURNS TABLE (
  sucesso BOOLEAN,
  fatura_id UUID,
  acao TEXT,
  mensagem TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fatura_existente UUID;
  v_mes_referencia DATE;
  v_closing_day INTEGER;
  v_closing_date DATE;
BEGIN
  -- Calcular mês de referência baseado na data de vencimento
  v_mes_referencia := DATE_TRUNC('month', p_due_date)::DATE;
  
  -- Buscar dia de fechamento do cartão
  SELECT closing_day INTO v_closing_day
  FROM credit_cards
  WHERE id = p_credit_card_id AND user_id = p_user_id;
  
  IF v_closing_day IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'erro'::TEXT, 'Cartão não encontrado'::TEXT;
    RETURN;
  END IF;
  
  -- Calcular data de fechamento (mês anterior ao vencimento)
  v_closing_date := (v_mes_referencia - INTERVAL '1 month' + (v_closing_day - 1) * INTERVAL '1 day')::DATE;
  
  -- Verificar se já existe fatura para este mês
  SELECT id INTO v_fatura_existente
  FROM credit_card_invoices
  WHERE credit_card_id = p_credit_card_id
    AND user_id = p_user_id
    AND reference_month = v_mes_referencia
    AND status IN ('open', 'pending', 'closed')
  LIMIT 1;
  
  IF v_fatura_existente IS NOT NULL THEN
    -- Atualizar fatura existente
    UPDATE credit_card_invoices
    SET 
      total_amount = p_amount,
      due_date = p_due_date,
      updated_at = NOW()
    WHERE id = v_fatura_existente;
    
    RETURN QUERY SELECT true, v_fatura_existente, 'atualizada'::TEXT, 'Fatura atualizada com sucesso'::TEXT;
  ELSE
    -- Criar nova fatura
    INSERT INTO credit_card_invoices (
      credit_card_id,
      user_id,
      reference_month,
      closing_date,
      due_date,
      total_amount,
      status
    ) VALUES (
      p_credit_card_id,
      p_user_id,
      v_mes_referencia,
      v_closing_date,
      p_due_date,
      p_amount,
      'open'
    )
    RETURNING id INTO v_fatura_existente;
    
    RETURN QUERY SELECT true, v_fatura_existente, 'criada'::TEXT, 'Fatura criada com sucesso'::TEXT;
  END IF;
END;
$$;

-- 5. Comentários
COMMENT ON FUNCTION get_contas_consolidadas IS 'Retorna visão consolidada de payable_bills + credit_card_invoices para o usuário';
COMMENT ON FUNCTION buscar_cartao_por_nome IS 'Busca cartão de crédito por nome ou banco (case-insensitive)';
COMMENT ON FUNCTION criar_ou_atualizar_fatura IS 'Cria nova fatura ou atualiza existente para o mês de referência';
;
