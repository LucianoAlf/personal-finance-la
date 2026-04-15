


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."ai_provider_type" AS ENUM (
    'openai',
    'gemini',
    'claude',
    'openrouter'
);


ALTER TYPE "public"."ai_provider_type" OWNER TO "postgres";


CREATE TYPE "public"."auth_type" AS ENUM (
    'none',
    'bearer',
    'api_key',
    'basic'
);


ALTER TYPE "public"."auth_type" OWNER TO "postgres";


CREATE TYPE "public"."calendar_event_created_by" AS ENUM (
    'user',
    'ana_clara',
    'system'
);


ALTER TYPE "public"."calendar_event_created_by" OWNER TO "postgres";


CREATE TYPE "public"."calendar_event_source" AS ENUM (
    'internal',
    'external'
);


ALTER TYPE "public"."calendar_event_source" OWNER TO "postgres";


CREATE TYPE "public"."calendar_event_status" AS ENUM (
    'scheduled',
    'confirmed',
    'cancelled',
    'completed'
);


ALTER TYPE "public"."calendar_event_status" OWNER TO "postgres";


CREATE TYPE "public"."calendar_recurrence_frequency" AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);


ALTER TYPE "public"."calendar_recurrence_frequency" OWNER TO "postgres";


CREATE TYPE "public"."calendar_reminder_channel" AS ENUM (
    'whatsapp',
    'email',
    'push'
);


ALTER TYPE "public"."calendar_reminder_channel" OWNER TO "postgres";


CREATE TYPE "public"."calendar_reminder_delivery_status" AS ENUM (
    'pending',
    'sent',
    'failed',
    'skipped'
);


ALTER TYPE "public"."calendar_reminder_delivery_status" OWNER TO "postgres";


CREATE TYPE "public"."calendar_reminder_kind" AS ENUM (
    'default',
    'prep',
    'deadline'
);


ALTER TYPE "public"."calendar_reminder_kind" OWNER TO "postgres";


CREATE TYPE "public"."calendar_sync_direction" AS ENUM (
    'outbound',
    'inbound',
    'bidirectional'
);


ALTER TYPE "public"."calendar_sync_direction" OWNER TO "postgres";


CREATE TYPE "public"."calendar_sync_job_status" AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'skipped_unsupported'
);


ALTER TYPE "public"."calendar_sync_job_status" OWNER TO "postgres";


CREATE TYPE "public"."calendar_sync_job_type" AS ENUM (
    'upsert_event',
    'upsert_occurrence_override',
    'cancel_occurrence',
    'delete_event',
    'inbound_upsert',
    'inbound_delete',
    'inbound_financial_routed',
    'conflict_detected'
);


ALTER TYPE "public"."calendar_sync_job_type" OWNER TO "postgres";


CREATE TYPE "public"."conversation_type" AS ENUM (
    'idle',
    'editing_transaction',
    'creating_transaction',
    'confirming_action',
    'multi_step_flow',
    'awaiting_account_type_selection',
    'awaiting_due_day',
    'awaiting_bill_amount',
    'awaiting_duplicate_decision',
    'awaiting_delete_confirmation',
    'awaiting_bill_type',
    'awaiting_bill_description',
    'awaiting_installment_info',
    'awaiting_average_value',
    'awaiting_register_account_type',
    'awaiting_invoice_due_date',
    'awaiting_invoice_amount',
    'awaiting_card_selection',
    'awaiting_card_creation_confirmation',
    'awaiting_card_limit',
    'awaiting_installment_payment_method',
    'awaiting_installment_card_selection',
    'awaiting_payment_value',
    'awaiting_bill_name_for_payment',
    'awaiting_payment_account',
    'credit_card_context',
    'faturas_vencidas_context',
    'transaction_registered',
    'ana_clara_group_session',
    'awaiting_calendar_create_confirm',
    'accounts_diagnostic_context',
    'awaiting_accounts_safe_action_confirm'
);


ALTER TYPE "public"."conversation_type" OWNER TO "postgres";


CREATE TYPE "public"."edit_command_type" AS ENUM (
    'edit_value',
    'edit_description',
    'edit_category',
    'edit_date',
    'edit_account',
    'delete'
);


ALTER TYPE "public"."edit_command_type" OWNER TO "postgres";


CREATE TYPE "public"."http_method" AS ENUM (
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
);


ALTER TYPE "public"."http_method" OWNER TO "postgres";


CREATE TYPE "public"."integration_status" AS ENUM (
    'disconnected',
    'connecting',
    'connected',
    'error'
);


ALTER TYPE "public"."integration_status" OWNER TO "postgres";


CREATE TYPE "public"."integration_type" AS ENUM (
    'whatsapp',
    'google_calendar',
    'ticktick'
);


ALTER TYPE "public"."integration_type" OWNER TO "postgres";


CREATE TYPE "public"."intent_type" AS ENUM (
    'transaction',
    'quick_command',
    'conversation',
    'help',
    'unknown'
);


ALTER TYPE "public"."intent_type" OWNER TO "postgres";


CREATE TYPE "public"."message_direction" AS ENUM (
    'inbound',
    'outbound'
);


ALTER TYPE "public"."message_direction" OWNER TO "postgres";


CREATE TYPE "public"."notification_channel" AS ENUM (
    'push',
    'email',
    'whatsapp'
);


ALTER TYPE "public"."notification_channel" OWNER TO "postgres";


CREATE TYPE "public"."processing_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."processing_status" OWNER TO "postgres";


CREATE TYPE "public"."response_style" AS ENUM (
    'short',
    'medium',
    'long'
);


ALTER TYPE "public"."response_style" OWNER TO "postgres";


CREATE TYPE "public"."response_tone" AS ENUM (
    'formal',
    'friendly',
    'casual'
);


ALTER TYPE "public"."response_tone" OWNER TO "postgres";


CREATE TYPE "public"."summary_frequency" AS ENUM (
    'daily',
    'weekly',
    'monthly'
);


ALTER TYPE "public"."summary_frequency" OWNER TO "postgres";


CREATE TYPE "public"."webhook_log_status" AS ENUM (
    'pending',
    'success',
    'failed',
    'retrying'
);


ALTER TYPE "public"."webhook_log_status" OWNER TO "postgres";


CREATE TYPE "public"."whatsapp_message_type" AS ENUM (
    'text',
    'audio',
    'image',
    'document',
    'video',
    'location',
    'contact'
);


ALTER TYPE "public"."whatsapp_message_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_calendar_recurrence_rule_signature"("p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT md5(
    p_frequency::text || '|' || p_interval_value::text || '|' ||
    coalesce(
      (SELECT string_agg(lower(trim(x)), ',' ORDER BY lower(trim(x)))
       FROM unnest(coalesce(p_by_weekday, array[]::text[])) AS u(x)),
      ''
    ) || '|' ||
    coalesce(
      (SELECT string_agg(x::text, ',' ORDER BY x)
       FROM unnest(coalesce(p_by_monthday, array[]::int[])) AS u2(x)),
      ''
    ) || '|' ||
    coalesce(p_starts_at::text, '') || '|' ||
    coalesce(p_until_at::text, '') || '|' ||
    coalesce(p_count_limit::text, '') || '|' ||
    coalesce(p_timezone, '')
  );
$$;


ALTER FUNCTION "public"."_calendar_recurrence_rule_signature"("p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_xp_to_user"("p_user_id" "uuid", "p_xp_amount" integer) RETURNS TABLE("new_level" integer, "new_xp" integer, "total_xp" integer, "leveled_up" boolean)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_profile RECORD;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
  v_new_current_xp INTEGER;
  v_xp_for_next_level INTEGER;
  v_leveled_up BOOLEAN := false;
BEGIN
  -- Buscar perfil atual
  SELECT * INTO v_profile
  FROM user_gamification
  WHERE user_id = p_user_id;
  
  -- Se não existe, criar perfil inicial
  IF NOT FOUND THEN
    INSERT INTO user_gamification (user_id, xp, total_xp)
    VALUES (p_user_id, 0, 0)
    RETURNING * INTO v_profile;
  END IF;
  
  -- Calcular novo total de XP
  v_new_total_xp := v_profile.total_xp + p_xp_amount;
  v_new_current_xp := v_profile.xp + p_xp_amount;
  v_new_level := v_profile.level;
  
  -- Loop para verificar level ups múltiplos
  LOOP
    v_xp_for_next_level := calculate_xp_for_level(v_new_level);
    
    -- Sair se não tem XP suficiente para próximo nível
    EXIT WHEN v_new_current_xp < v_xp_for_next_level;
    
    -- Subir de nível
    v_new_current_xp := v_new_current_xp - v_xp_for_next_level;
    v_new_level := v_new_level + 1;
    v_leveled_up := true;
  END LOOP;
  
  -- Atualizar perfil no banco
  UPDATE user_gamification
  SET 
    level = v_new_level,
    xp = v_new_current_xp,
    total_xp = v_new_total_xp,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Retornar resultados
  RETURN QUERY SELECT v_new_level, v_new_current_xp, v_new_total_xp, v_leveled_up;
END;
$$;


ALTER FUNCTION "public"."add_xp_to_user"("p_user_id" "uuid", "p_xp_amount" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_xp_to_user"("p_user_id" "uuid", "p_xp_amount" integer) IS 'Adiciona XP ao usuário e atualiza nível automaticamente';



CREATE OR REPLACE FUNCTION "public"."adicionar_memoria_usuario"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text", "p_valor" "jsonb", "p_origem" "text" DEFAULT 'inferido'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_memory (user_id, tipo, chave, valor, origem)
  VALUES (p_user_id, p_tipo, p_chave, p_valor, p_origem)
  ON CONFLICT (user_id, tipo, chave) 
  DO UPDATE SET 
    valor = p_valor,
    frequencia = user_memory.frequencia + 1,
    ultima_vez = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."adicionar_memoria_usuario"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text", "p_valor" "jsonb", "p_origem" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_category_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  matched_category_id UUID;
BEGIN
  -- ✅ SÓ aplicar regra se category_id ainda não foi definido
  -- Isso respeita a categorização do WhatsApp e outras fontes
  IF NEW.category_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar regra que corresponde ao padrão do estabelecimento
  SELECT category_id INTO matched_category_id
  FROM category_rules
  WHERE user_id = NEW.user_id
    AND NEW.description ILIKE merchant_pattern
  ORDER BY LENGTH(merchant_pattern) DESC
  LIMIT 1;

  -- Se encontrou regra, aplicar categoria
  IF matched_category_id IS NOT NULL THEN
    NEW.category_id := matched_category_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."apply_category_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_financial_goal_contribution"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."apply_financial_goal_contribution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_savings_contribution"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE financial_goals
  SET current_amount = current_amount + NEW.amount,
      status = CASE WHEN current_amount + NEW.amount >= target_amount THEN 'completed' ELSE status END,
      updated_at = NOW()
  WHERE id = NEW.goal_id AND goal_type = 'savings';
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."apply_savings_contribution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_categorize_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  detected_category_id UUID;
  transaction_desc TEXT;
BEGIN
  -- Se já tem categoria, não sobrescrever
  IF NEW.category_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Normalizar descrição para busca
  transaction_desc := LOWER(TRIM(COALESCE(NEW.description, '')));
  
  -- Buscar categoria que match com keywords
  SELECT id INTO detected_category_id
  FROM categories
  WHERE (user_id = NEW.user_id OR is_default = true)
    AND keywords IS NOT NULL
    AND array_length(keywords, 1) > 0
    AND EXISTS (
      SELECT 1 FROM unnest(keywords) AS keyword
      WHERE transaction_desc LIKE '%' || LOWER(keyword) || '%'
    )
  ORDER BY is_default ASC, created_at DESC
  LIMIT 1;
  
  -- Se encontrou, atribuir categoria
  IF detected_category_id IS NOT NULL THEN
    NEW.category_id := detected_category_id;
  ELSE
    -- Se não encontrou, atribuir "Outros"
    SELECT id INTO detected_category_id
    FROM categories
    WHERE name = 'Outros' AND is_default = true
    LIMIT 1;
    
    IF detected_category_id IS NOT NULL THEN
      NEW.category_id := detected_category_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_categorize_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_recurring_bills"() RETURNS TABLE("generated_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_bill RECORD;
  v_next_date DATE;
  v_generated INTEGER := 0;
BEGIN
  -- Buscar contas recorrentes que precisam gerar nova ocorrência
  FOR v_bill IN 
    SELECT * FROM payable_bills
    WHERE is_recurring = TRUE
      AND (next_occurrence_date IS NULL OR next_occurrence_date <= CURRENT_DATE + INTERVAL '7 days')
      AND (recurrence_config->>'end_date' IS NULL 
           OR (recurrence_config->>'end_date')::DATE > CURRENT_DATE)
  LOOP
    -- Calcular próxima data
    v_next_date := calculate_next_occurrence(
      COALESCE(v_bill.next_occurrence_date, v_bill.due_date),
      (v_bill.recurrence_config->>'frequency')::TEXT,
      (v_bill.recurrence_config->>'day_of_month')::INTEGER
    );
    
    -- Inserir nova ocorrência
    INSERT INTO payable_bills (
      user_id, description, amount, due_date, bill_type, priority,
      provider_name, payment_method, qr_code_pix, barcode, category_id,
      is_recurring, recurrence_config, parent_recurring_id, status
    ) VALUES (
      v_bill.user_id, v_bill.description, v_bill.amount, v_next_date,
      v_bill.bill_type, v_bill.priority, v_bill.provider_name,
      v_bill.payment_method, v_bill.qr_code_pix, v_bill.barcode, v_bill.category_id,
      FALSE, NULL, v_bill.id, 'pending'
    );
    
    -- Calcular próxima data para o template
    v_next_date := v_next_date + 
      CASE (v_bill.recurrence_config->>'frequency')::TEXT
        WHEN 'monthly' THEN INTERVAL '1 month'
        WHEN 'bimonthly' THEN INTERVAL '2 months'
        WHEN 'quarterly' THEN INTERVAL '3 months'
        WHEN 'semiannual' THEN INTERVAL '6 months'
        WHEN 'yearly' THEN INTERVAL '1 year'
        ELSE INTERVAL '1 month'
      END;
    
    -- Atualizar next_occurrence_date do template
    UPDATE payable_bills
    SET next_occurrence_date = v_next_date
    WHERE id = v_bill.id;
    
    v_generated := v_generated + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_generated;
END;
$$;


ALTER FUNCTION "public"."auto_generate_recurring_bills"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backfill_budgets_into_spending_goals"("p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."backfill_budgets_into_spending_goals"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_budgets_into_spending_goals"("p_user_id" "uuid") IS 'Migra budgets legados para financial_goals.goal_type = spending_limit, evitando duplicidade por usuário/categoria/mês.';



CREATE OR REPLACE FUNCTION "public"."bootstrap_gamification_state"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM public.ensure_user_gamification_profile(p_user_id);
  PERFORM public.migrate_legacy_badges_to_badge_progress(p_user_id);
  PERFORM public.sync_gamification_badges(p_user_id);
END;
$$;


ALTER FUNCTION "public"."bootstrap_gamification_state"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."bootstrap_gamification_state"("p_user_id" "uuid") IS 'Inicializa o perfil canônico, migra badges legados e popula badge_progress do usuário.';



CREATE OR REPLACE FUNCTION "public"."buscar_cartao_por_nome"("p_user_id" "uuid", "p_nome_busca" "text") RETURNS TABLE("id" "uuid", "name" "text", "brand" "text", "due_day" integer, "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."buscar_cartao_por_nome"("p_user_id" "uuid", "p_nome_busca" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."buscar_cartao_por_nome"("p_user_id" "uuid", "p_nome_busca" "text") IS 'Busca cartão de crédito por nome ou banco (case-insensitive)';



CREATE OR REPLACE FUNCTION "public"."calculate_agent_memory_confidence"("p_reinforcement_count" integer) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  IF p_reinforcement_count IS NULL OR p_reinforcement_count <= 1 THEN
    RETURN 0.6;
  ELSIF p_reinforcement_count = 2 THEN
    RETURN 0.72;
  ELSIF p_reinforcement_count = 3 THEN
    RETURN 0.82;
  END IF;

  RETURN 0.9;
END;
$$;


ALTER FUNCTION "public"."calculate_agent_memory_confidence"("p_reinforcement_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_investment_projection"("p_current_amount" numeric, "p_monthly_contribution" numeric, "p_annual_rate" numeric, "p_months" integer) RETURNS TABLE("month" integer, "contribution" numeric, "interest" numeric, "balance" numeric)
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_monthly_rate NUMERIC;
  v_balance NUMERIC;
  v_month INTEGER;
  v_interest NUMERIC;
BEGIN
  v_monthly_rate := p_annual_rate / 12 / 100;
  v_balance := p_current_amount;
  FOR v_month IN 1..p_months LOOP
    v_interest := v_balance * v_monthly_rate;
    v_balance := v_balance + v_interest + p_monthly_contribution;
    RETURN QUERY SELECT v_month, p_monthly_contribution, ROUND(v_interest, 2), ROUND(v_balance, 2);
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."calculate_investment_projection"("p_current_amount" numeric, "p_monthly_contribution" numeric, "p_annual_rate" numeric, "p_months" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_investment_projection"("p_current_amount" numeric, "p_monthly_contribution" numeric, "p_annual_rate" numeric, "p_months" integer) IS 'Calcula projeção mensal de uma meta de investimento';



CREATE OR REPLACE FUNCTION "public"."calculate_investment_returns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Atualizar current_value baseado em current_price
  IF NEW.current_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
    NEW.current_value = NEW.quantity * NEW.current_price;
  END IF;
  
  -- Calcular rentabilidade percentual
  IF NEW.total_invested IS NOT NULL AND NEW.total_invested > 0 AND NEW.current_value IS NOT NULL THEN
    -- Rentabilidade = ((Valor Atual - Investido) / Investido) * 100
    NEW.return_percentage = 
      ((NEW.current_value - NEW.total_invested) / NEW.total_invested) * 100;
  ELSE
    NEW.return_percentage = 0;
  END IF;
  
  -- Atualizar timestamp
  NEW.last_price_update = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_investment_returns"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_investment_returns"() IS 'Calcula automaticamente current_value e return_percentage quando current_price é atualizado';



CREATE OR REPLACE FUNCTION "public"."calculate_invoice_total_on_close"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  -- Se a fatura está sendo fechada, calcular o total
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    -- Somar todas as transações da fatura
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM credit_card_transactions
    WHERE invoice_id = NEW.id;
    
    -- Atualizar total_amount (remaining_amount é calculado automaticamente)
    NEW.total_amount := v_total;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_invoice_total_on_close"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_day_of_month" integer) RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_next_date DATE;
BEGIN
  -- Se não tem data atual, usar hoje
  IF p_current_date IS NULL THEN
    p_current_date := CURRENT_DATE;
  END IF;
  
  -- Calcular próxima data baseado na frequência
  CASE p_frequency
    WHEN 'monthly' THEN
      v_next_date := p_current_date + INTERVAL '1 month';
    WHEN 'bimonthly' THEN
      v_next_date := p_current_date + INTERVAL '2 months';
    WHEN 'quarterly' THEN
      v_next_date := p_current_date + INTERVAL '3 months';
    WHEN 'semiannual' THEN
      v_next_date := p_current_date + INTERVAL '6 months';
    WHEN 'yearly' THEN
      v_next_date := p_current_date + INTERVAL '1 year';
    ELSE
      v_next_date := p_current_date + INTERVAL '1 month';
  END CASE;
  
  -- Ajustar para o dia do mês especificado
  IF p_day_of_month IS NOT NULL AND p_day_of_month BETWEEN 1 AND 28 THEN
    v_next_date := DATE_TRUNC('month', v_next_date) + (p_day_of_month - 1) * INTERVAL '1 day';
  END IF;
  
  RETURN v_next_date;
END;
$$;


ALTER FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_day_of_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_portfolio_metrics"("p_user_id" "uuid") RETURNS TABLE("diversification_score" integer, "portfolio_health_score" integer, "total_dividends" numeric, "rebalancing_needed" boolean, "concentration_risk" "text", "asset_allocation" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total_value NUMERIC;
  v_asset_count INTEGER;
  v_categories_count INTEGER;
  v_max_allocation NUMERIC;
  v_diversification INTEGER;
  v_health INTEGER;
  v_concentration TEXT;
  v_allocation JSONB;
BEGIN
  -- Buscar dados básicos
  SELECT 
    COALESCE(SUM(current_value), 0),
    COUNT(*),
    COUNT(DISTINCT category)
  INTO v_total_value, v_asset_count, v_categories_count
  FROM investments
  WHERE user_id = p_user_id AND is_active = TRUE AND status = 'active';
  
  -- Calcular maior alocação individual
  SELECT COALESCE(MAX(current_value / NULLIF(v_total_value, 0) * 100), 0)
  INTO v_max_allocation
  FROM investments
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Diversification Score
  v_diversification := CASE
    WHEN v_asset_count = 0 THEN 0
    WHEN v_asset_count = 1 THEN 10
    WHEN v_asset_count <= 3 THEN 30
    WHEN v_asset_count <= 5 THEN 50
    WHEN v_asset_count <= 10 THEN 75
    WHEN v_asset_count <= 15 THEN 90
    ELSE 100
  END;
  
  -- Ajustar por categorias
  v_diversification := LEAST((v_diversification * v_categories_count::NUMERIC / 6)::INTEGER, 100);
  
  -- Ajustar por concentração
  IF v_max_allocation > 50 THEN
    v_diversification := (v_diversification * 0.5)::INTEGER;
  ELSIF v_max_allocation > 30 THEN
    v_diversification := (v_diversification * 0.7)::INTEGER;
  END IF;
  
  -- Health Score
  v_health := v_diversification;
  
  -- Risco de concentração
  v_concentration := CASE
    WHEN v_max_allocation > 50 THEN 'ALTO'
    WHEN v_max_allocation > 30 THEN 'MÉDIO'
    ELSE 'BAIXO'
  END;
  
  -- Total de dividendos (12 meses)
  total_dividends := COALESCE((
    SELECT SUM(total_value)
    FROM investment_transactions
    WHERE user_id = p_user_id
      AND transaction_type IN ('dividend', 'interest')
      AND transaction_date >= NOW() - INTERVAL '12 months'
  ), 0);
  
  -- Verificar rebalanceamento
  rebalancing_needed := EXISTS (
    SELECT 1
    FROM investment_allocation_targets t
    LEFT JOIN (
      SELECT 
        category,
        SUM(current_value) / NULLIF(v_total_value, 0) * 100 as current_percentage
      FROM investments
      WHERE user_id = p_user_id AND is_active = TRUE
      GROUP BY category
    ) a ON t.asset_class = a.category
    WHERE t.user_id = p_user_id
      AND ABS(t.target_percentage - COALESCE(a.current_percentage, 0)) > 5
  );
  
  -- Alocação atual
  SELECT COALESCE(jsonb_object_agg(category, percentage), '{}'::jsonb) INTO v_allocation
  FROM (
    SELECT 
      category,
      ROUND((SUM(current_value) / NULLIF(v_total_value, 0) * 100)::NUMERIC, 2) as percentage
    FROM investments
    WHERE user_id = p_user_id AND is_active = TRUE AND category IS NOT NULL
    GROUP BY category
  ) sub;
  
  -- Retornar
  diversification_score := v_diversification;
  portfolio_health_score := v_health;
  concentration_risk := v_concentration;
  asset_allocation := v_allocation;
  
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."calculate_portfolio_metrics"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_portfolio_metrics"("p_user_id" "uuid") IS 'Calcula métricas: diversificação, saúde, dividendos, rebalanceamento';



CREATE OR REPLACE FUNCTION "public"."calculate_spending_streak"("goal_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_spending_streak"("goal_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_spending_streak"("goal_id" "uuid") IS 'Calcula meses consecutivos cumprindo a meta de gasto';



CREATE OR REPLACE FUNCTION "public"."calculate_xp_for_level"("level" integer) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN FLOOR(100 * POWER(level, 1.5))::INTEGER;
END;
$$;


ALTER FUNCTION "public"."calculate_xp_for_level"("level" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_xp_for_level"("level" integer) IS 'Calcula XP necessário para atingir um nível específico';



CREATE OR REPLACE FUNCTION "public"."calendar_occurrence_key"("p_event_id" "uuid", "p_original_start" timestamp with time zone) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT p_event_id::text || ':' || trim(both '"' FROM to_json(p_original_start)::text);
$$;


ALTER FUNCTION "public"."calendar_occurrence_key"("p_event_id" "uuid", "p_original_start" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calendar_occurrence_key"("p_event_id" "uuid", "p_original_start" timestamp with time zone) IS 'Stable occurrence_key: event_id + ISO-like timestamptz string (matches reminder occurrence_key style).';



CREATE OR REPLACE FUNCTION "public"."calendar_populate_recurring_reminder_schedule"("p_event_id" "uuid", "p_owner_uid" "uuid", "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rem RECORD;
  v_occ RECORD;
  v_occ_key text;
  v_effective_start timestamptz;
  v_fire_at timestamptz;
  v_idem text;
BEGIN
  IF p_window_start >= p_window_end THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.calendar_events e
    WHERE e.id = p_event_id
      AND e.user_id = p_owner_uid
      AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  ) THEN
    RETURN;
  END IF;

  DELETE FROM public.calendar_reminder_schedule crs
  USING public.calendar_event_reminders cer
  WHERE crs.reminder_id = cer.id
    AND cer.event_id = p_event_id
    AND crs.delivery_status = 'pending'
    AND crs.fire_at >= clock_timestamp();

  FOR v_rem IN
    SELECT cer.id, cer.remind_offset_minutes
    FROM public.calendar_event_reminders cer
    WHERE cer.event_id = p_event_id
      AND cer.enabled = true
  LOOP
    FOR v_occ IN
      SELECT
        exp.original_start_at,
        coalesce(ov.is_cancelled, false) AS is_cancelled,
        ov.override_start_at
      FROM public.calendar_recurrence_expand_occurrences(
        p_event_id,
        p_window_start,
        p_window_end
      ) AS exp
      LEFT JOIN public.calendar_event_occurrence_overrides ov
        ON ov.event_id = p_event_id
       AND ov.occurrence_key = public.calendar_occurrence_key(
         p_event_id,
         exp.original_start_at
       )
    LOOP
      IF v_occ.is_cancelled THEN
        CONTINUE;
      END IF;

      v_effective_start := coalesce(v_occ.override_start_at, v_occ.original_start_at);

      v_fire_at := v_effective_start - (v_rem.remind_offset_minutes * interval '1 minute');

      IF v_fire_at < clock_timestamp() THEN
        CONTINUE;
      END IF;

      v_occ_key := public.calendar_occurrence_key(p_event_id, v_occ.original_start_at);
      v_idem := v_rem.id::text || ':' || v_occ_key || ':whatsapp';

      INSERT INTO public.calendar_reminder_schedule (
        event_id,
        reminder_id,
        occurrence_key,
        fire_at,
        channel,
        idempotency_key,
        delivery_status
      ) VALUES (
        p_event_id,
        v_rem.id,
        v_occ_key,
        v_fire_at,
        'whatsapp'::calendar_reminder_channel,
        v_idem,
        'pending'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."calendar_populate_recurring_reminder_schedule"("p_event_id" "uuid", "p_owner_uid" "uuid", "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calendar_populate_recurring_reminder_schedule"("p_event_id" "uuid", "p_owner_uid" "uuid", "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone) IS 'Rebuilds future pending schedule rows for recurring events in the window: honours overrides (skip cancelled, fire_at from override_start_at), stable occurrence_key on original instant. Deletes future pending rows for the event first.';



CREATE OR REPLACE FUNCTION "public"."calendar_recurrence_expand_occurrences"("p_event_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) RETURNS TABLE("original_start_at" timestamp with time zone, "original_end_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ce RECORD;
  r RECORD;
  v_tz text;
  v_series_min timestamptz;
  v_dur interval;
  v_local_time time;
  v_anchor_local_date date;
  v_scan_d date;
  v_ts timestamptz;
  v_ts_end timestamptz;
  v_global_n int := 0;
  v_dmax date;
  v_effective_monthday int;
  v_last_dom int;
  v_y int;
  v_m int;
  v_wd int;
  v_allowed int[];
  v_t text;
  v_i int;
  v_months_a int;
  v_months_anchor int;
  v_anchor_month date;
  v_week_anchor_monday date;
  v_week_curr_monday date;
  v_week_diff int;
  v_anchor_year int;
  v_anchor_month_num int;
  v_year_diff int;
BEGIN
  IF p_from >= p_to THEN
    RETURN;
  END IF;

  SELECT * INTO ce FROM public.calendar_events WHERE id = p_event_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO r FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_tz := coalesce(nullif(trim(r.timezone), ''), nullif(trim(ce.timezone), ''), 'America/Sao_Paulo');

  v_series_min := greatest(ce.start_at, r.starts_at);

  IF ce.end_at IS NULL THEN
    v_dur := interval '1 hour';
  ELSE
    v_dur := ce.end_at - ce.start_at;
  END IF;

  IF ce.all_day THEN
    v_local_time := time '00:00:00';
    v_dur := coalesce(nullif(ce.end_at - ce.start_at, interval '0'), interval '1 day');
  ELSE
    v_local_time := ((ce.start_at AT TIME ZONE v_tz)::timestamp)::time;
  END IF;

  v_anchor_local_date := (ce.start_at AT TIME ZONE v_tz)::date;
  v_dmax := ((p_to AT TIME ZONE v_tz)::date) + 1;

  IF r.frequency = 'daily' THEN
    v_scan_d := least(v_anchor_local_date, (p_from AT TIME ZONE v_tz)::date);
    WHILE v_scan_d <= v_dmax LOOP
      IF (v_scan_d - v_anchor_local_date) >= 0
         AND (v_scan_d - v_anchor_local_date) % r.interval_value = 0 THEN
        v_ts := timezone(v_tz, (v_scan_d::timestamp + v_local_time));
        v_ts_end := v_ts + v_dur;
        IF v_ts >= v_series_min
           AND (r.until_at IS NULL OR v_ts <= r.until_at) THEN
          v_global_n := v_global_n + 1;
          IF r.count_limit IS NOT NULL AND v_global_n > r.count_limit THEN
            EXIT;
          END IF;
          IF v_ts >= p_from AND v_ts < p_to THEN
            original_start_at := v_ts;
            original_end_at := v_ts_end;
            RETURN NEXT;
          END IF;
        END IF;
      END IF;
      v_scan_d := v_scan_d + 1;
    END LOOP;
    RETURN;
  END IF;

  IF r.frequency = 'weekly' THEN
    v_allowed := ARRAY[]::int[];
    IF r.by_weekday IS NULL OR array_length(r.by_weekday, 1) IS NULL THEN
      v_allowed := array_append(
        v_allowed,
        EXTRACT(ISODOW FROM ((ce.start_at AT TIME ZONE v_tz)::timestamp))::int
      );
    ELSE
      FOREACH v_t IN ARRAY r.by_weekday LOOP
        v_i := public.calendar_weekday_token_to_isodow(v_t);
        IF v_i IS NOT NULL THEN
          v_allowed := array_append(v_allowed, v_i);
        END IF;
      END LOOP;
      IF array_length(v_allowed, 1) IS NULL THEN
        v_allowed := array_append(
          v_allowed,
          EXTRACT(ISODOW FROM ((ce.start_at AT TIME ZONE v_tz)::timestamp))::int
        );
      END IF;
    END IF;

    v_week_anchor_monday := date_trunc('week', (ce.start_at AT TIME ZONE v_tz)::timestamp)::date;

    v_scan_d := least(v_anchor_local_date, (p_from AT TIME ZONE v_tz)::date) - 7;
    WHILE v_scan_d <= v_dmax LOOP
      v_wd := EXTRACT(ISODOW FROM v_scan_d::timestamp)::int;
      IF v_wd = ANY (v_allowed) THEN
        v_week_curr_monday := date_trunc('week', v_scan_d::timestamp)::date;
        v_week_diff := (v_week_curr_monday - v_week_anchor_monday) / 7;
        IF v_week_diff >= 0 AND v_week_diff % r.interval_value = 0 THEN
          v_ts := timezone(v_tz, (v_scan_d::timestamp + v_local_time));
          v_ts_end := v_ts + v_dur;
          IF v_ts >= v_series_min
             AND (r.until_at IS NULL OR v_ts <= r.until_at) THEN
            v_global_n := v_global_n + 1;
            IF r.count_limit IS NOT NULL AND v_global_n > r.count_limit THEN
              EXIT;
            END IF;
            IF v_ts >= p_from AND v_ts < p_to THEN
              original_start_at := v_ts;
              original_end_at := v_ts_end;
              RETURN NEXT;
            END IF;
          END IF;
        END IF;
      END IF;
      v_scan_d := v_scan_d + 1;
    END LOOP;
    RETURN;
  END IF;

  IF r.frequency = 'monthly' THEN
    IF r.by_monthday IS NOT NULL AND array_length(r.by_monthday, 1) >= 1 THEN
      v_effective_monthday := r.by_monthday[1];
    ELSE
      v_effective_monthday := EXTRACT(DAY FROM (ce.start_at AT TIME ZONE v_tz)::date)::int;
    END IF;

    IF v_effective_monthday < 1 OR v_effective_monthday > 31 THEN
      RETURN;
    END IF;

    v_anchor_month := date_trunc('month', (ce.start_at AT TIME ZONE v_tz)::date)::date;
    v_months_anchor :=
      (EXTRACT(YEAR FROM v_anchor_month)::int * 12 + EXTRACT(MONTH FROM v_anchor_month)::int);

    v_y := EXTRACT(YEAR FROM (p_from AT TIME ZONE v_tz)::date)::int;
    v_m := EXTRACT(MONTH FROM (p_from AT TIME ZONE v_tz)::date)::int;

    WHILE make_date(v_y, v_m, 1) <= v_dmax + 60 LOOP
      v_months_a := v_y * 12 + v_m;
      IF v_months_a >= v_months_anchor
         AND (v_months_a - v_months_anchor) % r.interval_value = 0 THEN
        v_last_dom := EXTRACT(
          DAY FROM ((make_date(v_y, v_m, 1) + interval '1 month - 1 day')::date)
        )::int;
        IF v_effective_monthday <= v_last_dom THEN
          v_ts := timezone(
            v_tz,
            (make_date(v_y, v_m, v_effective_monthday)::timestamp + v_local_time)
          );
          v_ts_end := v_ts + v_dur;
          IF v_ts >= v_series_min
             AND (r.until_at IS NULL OR v_ts <= r.until_at) THEN
            v_global_n := v_global_n + 1;
            IF r.count_limit IS NOT NULL AND v_global_n > r.count_limit THEN
              EXIT;
            END IF;
            IF v_ts >= p_from AND v_ts < p_to THEN
              original_start_at := v_ts;
              original_end_at := v_ts_end;
              RETURN NEXT;
            END IF;
          END IF;
        END IF;
      END IF;
      v_m := v_m + 1;
      IF v_m > 12 THEN
        v_m := 1;
        v_y := v_y + 1;
      END IF;
      IF v_y > 2100 THEN
        EXIT;
      END IF;
    END LOOP;
    RETURN;
  END IF;

  IF r.frequency = 'yearly' THEN
    v_anchor_year := EXTRACT(YEAR FROM v_anchor_local_date)::int;
    v_anchor_month_num := EXTRACT(MONTH FROM v_anchor_local_date)::int;
    v_effective_monthday := EXTRACT(DAY FROM v_anchor_local_date)::int;
    v_y := greatest(v_anchor_year, EXTRACT(YEAR FROM (p_from AT TIME ZONE v_tz)::date)::int);

    WHILE make_date(v_y, v_anchor_month_num, 1) <= v_dmax + 370 LOOP
      v_year_diff := v_y - v_anchor_year;
      IF v_year_diff >= 0 AND v_year_diff % r.interval_value = 0 THEN
        v_last_dom := EXTRACT(
          DAY FROM ((make_date(v_y, v_anchor_month_num, 1) + interval '1 month - 1 day')::date)
        )::int;
        IF v_effective_monthday <= v_last_dom THEN
          v_ts := timezone(
            v_tz,
            (make_date(v_y, v_anchor_month_num, v_effective_monthday)::timestamp + v_local_time)
          );
          v_ts_end := v_ts + v_dur;
          IF v_ts >= v_series_min
             AND (r.until_at IS NULL OR v_ts <= r.until_at) THEN
            v_global_n := v_global_n + 1;
            IF r.count_limit IS NOT NULL AND v_global_n > r.count_limit THEN
              EXIT;
            END IF;
            IF v_ts >= p_from AND v_ts < p_to THEN
              original_start_at := v_ts;
              original_end_at := v_ts_end;
              RETURN NEXT;
            END IF;
          END IF;
        END IF;
      END IF;

      v_y := v_y + 1;
      IF v_y > 2100 THEN
        EXIT;
      END IF;
    END LOOP;
    RETURN;
  END IF;

  RAISE EXCEPTION 'unsupported_recurrence_frequency_v1';
END;
$$;


ALTER FUNCTION "public"."calendar_recurrence_expand_occurrences"("p_event_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calendar_recurrence_expand_occurrences"("p_event_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) IS 'Materialize recurring occurrences for one event within [p_from, p_to). Supports daily, weekly, monthly, and yearly rules.';



CREATE OR REPLACE FUNCTION "public"."calendar_weekday_token_to_isodow"("p_token" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  t text := lower(trim(p_token));
BEGIN
  IF t IN ('mon', 'monday', '1') THEN RETURN 1; END IF;
  IF t IN ('tue', 'tues', 'tuesday', '2') THEN RETURN 2; END IF;
  IF t IN ('wed', 'weds', 'wednesday', '3') THEN RETURN 3; END IF;
  IF t IN ('thu', 'thur', 'thurs', 'thursday', '4') THEN RETURN 4; END IF;
  IF t IN ('fri', 'friday', '5') THEN RETURN 5; END IF;
  IF t IN ('sat', 'saturday', '6') THEN RETURN 6; END IF;
  IF t IN ('sun', 'sunday', '7', '0') THEN RETURN 7; END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."calendar_weekday_token_to_isodow"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_occ_key text;
  v_override_id uuid;
  v_has_rule boolean;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = p_event_id AND e.user_id = v_owner_uid AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  ) INTO v_has_rule;

  IF NOT v_has_rule THEN
    RAISE EXCEPTION 'recurrence_required_for_occurrence_override';
  END IF;

  v_occ_key := public.calendar_occurrence_key(p_event_id, p_original_start_at);

  INSERT INTO public.calendar_event_occurrence_overrides (
    event_id,
    occurrence_key,
    original_start_at,
    override_start_at,
    override_end_at,
    status,
    title_override,
    description_override,
    is_cancelled
  ) VALUES (
    p_event_id,
    v_occ_key,
    p_original_start_at,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    true
  )
  ON CONFLICT (event_id, occurrence_key) DO UPDATE SET
    original_start_at = EXCLUDED.original_start_at,
    is_cancelled = true,
    override_start_at = NULL,
    override_end_at = NULL,
    title_override = NULL,
    description_override = NULL,
    updated_at = now()
  RETURNING id INTO v_override_id;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    occurrence_override_id,
    occurrence_key,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    p_event_id,
    v_override_id,
    v_occ_key,
    'ticktick',
    'cancel_occurrence',
    'occ:cancel:' || p_event_id::text || ':' || v_occ_key,
    'pending'
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    occurrence_override_id = EXCLUDED.occurrence_override_id,
    occurrence_key = EXCLUDED.occurrence_key,
    status = 'pending',
    updated_at = now(),
    last_error = NULL;

  PERFORM public.calendar_populate_recurring_reminder_schedule(
    p_event_id,
    v_owner_uid,
    clock_timestamp(),
    clock_timestamp() + interval '90 days'
  );

  RETURN v_override_id;
END;
$$;


ALTER FUNCTION "public"."cancel_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_user_id" "uuid") IS 'Cancel one occurrence of a recurring series; enqueues TickTick job (V1 worker skips as unsupported). Refreshes recurring reminder schedule.';



CREATE OR REPLACE FUNCTION "public"."categorize_uncategorized_regular_transactions"() RETURNS TABLE("processed_count" integer, "categorized_count" integer, "still_uncategorized_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_processed_count INT := 0;
  v_categorized_count INT := 0;
  v_still_uncategorized_count INT := 0;
  v_transaction_id UUID;
  v_user_id UUID;
  v_description TEXT;
  v_matched_category_id UUID;
BEGIN
  -- Cursor para iterar sobre transações sem categoria
  FOR v_transaction_id, v_user_id, v_description IN
    SELECT id, user_id, description
    FROM transactions
    WHERE category_id IS NULL
      AND description IS NOT NULL
      AND description != ''
    ORDER BY transaction_date DESC
  LOOP
    v_processed_count := v_processed_count + 1;
    
    -- Buscar regra que corresponde ao padrão
    SELECT category_id INTO v_matched_category_id
    FROM category_rules
    WHERE user_id = v_user_id
      AND v_description ILIKE merchant_pattern
    ORDER BY LENGTH(merchant_pattern) DESC
    LIMIT 1;
    
    -- Se encontrou regra, atualizar transação
    IF v_matched_category_id IS NOT NULL THEN
      UPDATE transactions
      SET category_id = v_matched_category_id,
          updated_at = NOW()
      WHERE id = v_transaction_id;
      
      v_categorized_count := v_categorized_count + 1;
    END IF;
  END LOOP;
  
  -- Contar quantas ainda ficaram sem categoria
  SELECT COUNT(*) INTO v_still_uncategorized_count
  FROM transactions
  WHERE category_id IS NULL;
  
  -- Retornar resultados
  RETURN QUERY SELECT v_processed_count, v_categorized_count, v_still_uncategorized_count;
END;
$$;


ALTER FUNCTION "public"."categorize_uncategorized_regular_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."categorize_uncategorized_transactions"() RETURNS TABLE("processed_count" integer, "categorized_count" integer, "still_uncategorized_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_processed_count INT := 0;
  v_categorized_count INT := 0;
  v_still_uncategorized_count INT := 0;
  v_transaction_id UUID;
  v_user_id UUID;
  v_description TEXT;
  v_matched_category_id UUID;
BEGIN
  -- Cursor para iterar sobre transações sem categoria
  FOR v_transaction_id, v_user_id, v_description IN
    SELECT id, user_id, description
    FROM credit_card_transactions
    WHERE category_id IS NULL
      AND description IS NOT NULL
      AND description != ''
    ORDER BY created_at DESC
  LOOP
    v_processed_count := v_processed_count + 1;
    
    -- Buscar regra que corresponde ao padrão
    SELECT category_id INTO v_matched_category_id
    FROM category_rules
    WHERE user_id = v_user_id
      AND v_description ILIKE merchant_pattern
    ORDER BY LENGTH(merchant_pattern) DESC
    LIMIT 1;
    
    -- Se encontrou regra, atualizar transação
    IF v_matched_category_id IS NOT NULL THEN
      UPDATE credit_card_transactions
      SET category_id = v_matched_category_id,
          updated_at = NOW()
      WHERE id = v_transaction_id;
      
      v_categorized_count := v_categorized_count + 1;
    END IF;
  END LOOP;
  
  -- Contar quantas ainda ficaram sem categoria
  SELECT COUNT(*) INTO v_still_uncategorized_count
  FROM credit_card_transactions
  WHERE category_id IS NULL;
  
  -- Retornar resultados
  RETURN QUERY SELECT v_processed_count, v_categorized_count, v_still_uncategorized_count;
END;
$$;


ALTER FUNCTION "public"."categorize_uncategorized_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_allocation_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(target_percentage), 0) INTO v_total
  FROM investment_allocation_targets
  WHERE user_id = NEW.user_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
  
  IF (v_total + NEW.target_percentage) > 100 THEN
    RAISE EXCEPTION 'Total de alocação não pode exceder 100%% (atual: %%%, tentando adicionar: %%%)', v_total, NEW.target_percentage;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_allocation_total"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_badges" IS 'Badges desbloqueados por cada usuário';



CREATE OR REPLACE FUNCTION "public"."check_and_unlock_badges"("p_user_id" "uuid") RETURNS SETOF "public"."user_badges"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_badge RECORD;
  v_unlocked RECORD;
  v_investment_count INT;
  v_category_count INT;
  v_dividend_count INT;
  v_portfolio_value NUMERIC;
  v_oldest_investment_days INT;
  v_consecutive_months INT;
BEGIN
  -- Buscar métricas do usuário
  SELECT COUNT(*) INTO v_investment_count
  FROM investments
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COUNT(DISTINCT category) INTO v_category_count
  FROM investments
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COUNT(*) INTO v_dividend_count
  FROM investment_transactions
  WHERE user_id = p_user_id AND transaction_type = 'dividend';
  
  SELECT COALESCE(SUM(current_value), 0) INTO v_portfolio_value
  FROM investments
  WHERE user_id = p_user_id AND status = 'active';
  
  SELECT COALESCE(MAX(EXTRACT(DAYS FROM NOW() - created_at)), 0) INTO v_oldest_investment_days
  FROM investments
  WHERE user_id = p_user_id;
  
  -- Calcular meses consecutivos (simplificado)
  SELECT COUNT(DISTINCT DATE_TRUNC('month', transaction_date)) INTO v_consecutive_months
  FROM investment_transactions
  WHERE user_id = p_user_id
    AND transaction_type IN ('buy', 'sell')
    AND transaction_date >= NOW() - INTERVAL '6 months';
  
  -- Verificar cada badge
  FOR v_badge IN SELECT * FROM badges LOOP
    -- Verificar se já desbloqueado
    SELECT * INTO v_unlocked
    FROM user_badges
    WHERE user_id = p_user_id AND badge_id = v_badge.id;
    
    IF v_unlocked IS NULL THEN
      -- Badge ainda não desbloqueado, verificar condições
      CASE v_badge.condition_type
        WHEN 'investment_count' THEN
          IF v_investment_count >= (v_badge.condition_value->>'min')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'category_diversity' THEN
          IF v_category_count >= (v_badge.condition_value->>'min_categories')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'dividend_received' THEN
          IF v_dividend_count >= (v_badge.condition_value->>'min_transactions')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'portfolio_value' THEN
          IF v_portfolio_value >= (v_badge.condition_value->>'min_value')::NUMERIC THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'investment_age_days' THEN
          IF v_oldest_investment_days >= (v_badge.condition_value->>'min_days')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        WHEN 'consecutive_months' THEN
          IF v_consecutive_months >= (v_badge.condition_value->>'months')::INT THEN
            INSERT INTO user_badges (user_id, badge_id)
            VALUES (p_user_id, v_badge.id)
            ON CONFLICT DO NOTHING
            RETURNING * INTO v_unlocked;
            
            IF v_unlocked IS NOT NULL THEN
              RETURN NEXT v_unlocked;
            END IF;
          END IF;
          
        -- health_score será verificado por trigger separado
        ELSE
          NULL;
      END CASE;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."check_and_unlock_badges"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_unlock_badges"("p_user_id" "uuid") IS 'Verifica condições e desbloqueia badges para um usuário';



CREATE OR REPLACE FUNCTION "public"."check_expired_challenges"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE challenges
  SET status = 'expired'
  WHERE status = 'active'
    AND deadline < CURRENT_DATE;
  
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;
  
  RETURN v_expired_count;
END;
$$;


ALTER FUNCTION "public"."check_expired_challenges"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_expired_challenges"() IS 'Verifica e marca desafios expirados';



CREATE OR REPLACE FUNCTION "public"."check_overdue_invoices"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Marcar faturas como vencidas
  UPDATE credit_card_invoices
  SET 
    status = 'overdue',
    updated_at = NOW()
  WHERE status IN ('open', 'closed')
    AND due_date < CURRENT_DATE
    AND (paid_amount < total_amount OR paid_amount IS NULL);
    
  RAISE NOTICE 'Faturas vencidas verificadas';
END;
$$;


ALTER FUNCTION "public"."check_overdue_invoices"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_overdue_invoices"() IS 'Verifica e marca faturas vencidas. Execute manualmente com: SELECT check_overdue_invoices();';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_conversation_contexts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_context
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_conversation_contexts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_episodes"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM public.agent_memory_episodes
  WHERE expires_at <= now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_episodes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_invoices_automatically"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Fechar faturas abertas cujo período já terminou
  UPDATE credit_card_invoices
  SET 
    status = 'closed',
    updated_at = NOW()
  WHERE status = 'open'
    AND closing_date < CURRENT_DATE;
    
  RAISE NOTICE 'Faturas fechadas automaticamente';
END;
$$;


ALTER FUNCTION "public"."close_invoices_automatically"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."close_invoices_automatically"() IS 'Fecha automaticamente faturas cujo período de fechamento já passou. Execute manualmente com: SELECT close_invoices_automatically();';



CREATE OR REPLACE FUNCTION "public"."complete_challenge"("p_challenge_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Buscar desafio
  SELECT * INTO v_challenge
  FROM challenges
  WHERE id = p_challenge_id
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Marcar como completado
  UPDATE challenges
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_challenge_id;
  
  -- Adicionar XP de recompensa
  PERFORM add_xp_to_user(v_challenge.user_id, v_challenge.xp_reward);
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."complete_challenge"("p_challenge_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_challenge"("p_challenge_id" "uuid") IS 'Marca um desafio como completado e concede XP';



CREATE OR REPLACE FUNCTION "public"."create_calendar_event"("p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean DEFAULT false, "p_description" "text" DEFAULT NULL::"text", "p_start_time" time without time zone DEFAULT NULL::time without time zone, "p_end_time" time without time zone DEFAULT NULL::time without time zone, "p_location_text" "text" DEFAULT NULL::"text", "p_event_kind" "text" DEFAULT 'personal'::"text", "p_created_by" "public"."calendar_event_created_by" DEFAULT 'user'::"public"."calendar_event_created_by", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
BEGIN
  v_owner_uid := COALESCE(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  v_tz := NULLIF(trim(p_timezone), '');
  IF v_tz IS NULL THEN
    v_tz := 'America/Sao_Paulo';
  END IF;

  IF p_all_day THEN
    v_start := timezone(v_tz, (p_date + time '00:00:00')::timestamp);
    v_end := timezone(v_tz, (p_date + time '23:59:59')::timestamp);
  ELSE
    IF p_start_time IS NULL THEN
      RAISE EXCEPTION 'start_time_required';
    END IF;

    v_start := timezone(v_tz, (p_date + p_start_time)::timestamp);

    IF p_end_time IS NOT NULL THEN
      v_end := timezone(v_tz, (p_date + p_end_time)::timestamp);
    ELSE
      v_end := v_start + interval '1 hour';
    END IF;
  END IF;

  INSERT INTO public.calendar_events (
    user_id,
    title,
    description,
    event_kind,
    domain_type,
    start_at,
    end_at,
    all_day,
    timezone,
    status,
    location_text,
    source,
    created_by,
    sync_eligible,
    metadata
  ) VALUES (
    v_owner_uid,
    p_title,
    p_description,
    COALESCE(NULLIF(trim(p_event_kind), ''), 'personal'),
    NULL,
    v_start,
    v_end,
    p_all_day,
    v_tz,
    'scheduled',
    p_location_text,
    'internal',
    p_created_by,
    true,
    '{}'::jsonb
  )
  RETURNING id INTO v_id;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    v_id,
    'ticktick',
    'upsert_event',
    'sync:' || v_id::text || ':upsert_event:initial',
    'pending'
  );

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."create_calendar_event"("p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_created_by" "public"."calendar_event_created_by", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_calendar_event"("p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_created_by" "public"."calendar_event_created_by", "p_user_id" "uuid") IS 'Creates a canonical calendar event for UI or service_role callers, preserving outbound sync enqueue.';



CREATE OR REPLACE FUNCTION "public"."create_category_rule"("p_user_id" "uuid", "p_merchant_pattern" "text", "p_category_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rule_id UUID;
BEGIN
  -- Inserir ou atualizar regra (upsert)
  INSERT INTO category_rules (user_id, merchant_pattern, category_id)
  VALUES (p_user_id, p_merchant_pattern, p_category_id)
  ON CONFLICT (user_id, merchant_pattern)
  DO UPDATE SET 
    category_id = EXCLUDED.category_id,
    updated_at = NOW()
  RETURNING id INTO rule_id;

  RETURN rule_id;
END;
$$;


ALTER FUNCTION "public"."create_category_rule"("p_user_id" "uuid", "p_merchant_pattern" "text", "p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_opening_transaction_for_investment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."create_opening_transaction_for_investment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."criar_ou_atualizar_fatura"("p_user_id" "uuid", "p_credit_card_id" "uuid", "p_amount" numeric, "p_due_date" "date") RETURNS TABLE("sucesso" boolean, "fatura_id" "uuid", "acao" "text", "mensagem" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."criar_ou_atualizar_fatura"("p_user_id" "uuid", "p_credit_card_id" "uuid", "p_amount" numeric, "p_due_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."criar_ou_atualizar_fatura"("p_user_id" "uuid", "p_credit_card_id" "uuid", "p_amount" numeric, "p_due_date" "date") IS 'Cria nova fatura ou atualiza existente para o mês de referência';



CREATE OR REPLACE FUNCTION "public"."current_date_brasilia"() RETURNS "date"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;


ALTER FUNCTION "public"."current_date_brasilia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_time_brasilia"() RETURNS time without time zone
    LANGUAGE "sql" STABLE
    AS $$
  SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::time;
$$;


ALTER FUNCTION "public"."current_time_brasilia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decay_stale_facts"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE public.agent_memory_entries
  SET
    confidence = GREATEST(0.35, ROUND((confidence - 0.08)::numeric, 3)),
    updated_at = now()
  WHERE memory_type IN ('preference', 'pattern')
    AND last_reinforced_at < now() - INTERVAL '30 days'
    AND confidence > 0.35;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;


ALTER FUNCTION "public"."decay_stale_facts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_calendar_event"("p_event_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_updated int;
BEGIN
  v_owner_uid := COALESCE(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  UPDATE public.calendar_events e
  SET
    status = 'cancelled',
    deleted_at = now(),
    updated_at = now()
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  UPDATE public.calendar_reminder_schedule crs
  SET delivery_status = 'skipped'
  WHERE crs.event_id = p_event_id
    AND crs.delivery_status = 'pending';

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status,
    run_after
  ) VALUES (
    v_owner_uid,
    p_event_id,
    'ticktick',
    'delete_event',
    'sync:' || p_event_id::text || ':delete_event',
    'pending',
    now()
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."delete_calendar_event"("p_event_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_calendar_event"("p_event_id" "uuid", "p_user_id" "uuid") IS 'Soft-deletes a canonical calendar event and enqueues outbound TickTick delete_event.';



CREATE OR REPLACE FUNCTION "public"."delete_calendar_occurrence_overrides_for_event"("p_event_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = p_event_id AND e.user_id = v_owner_uid AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  DELETE FROM public.calendar_event_occurrence_overrides o
  WHERE o.event_id = p_event_id;
END;
$$;


ALTER FUNCTION "public"."delete_calendar_occurrence_overrides_for_event"("p_event_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_calendar_occurrence_overrides_for_event"("p_event_id" "uuid", "p_user_id" "uuid") IS 'Deletes all occurrence overrides for an event (explicit cleanup before structural recurrence changes).';



CREATE OR REPLACE FUNCTION "public"."dismiss_opportunity"("p_opportunity_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE market_opportunities
  SET dismissed = true, dismissed_at = NOW()
  WHERE id = p_opportunity_id;
END;
$$;


ALTER FUNCTION "public"."dismiss_opportunity"("p_opportunity_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."dismiss_opportunity"("p_opportunity_id" "uuid") IS 'Marca uma oportunidade como dismissed (ignorada pelo usuário)';



CREATE OR REPLACE FUNCTION "public"."ensure_agent_identity"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM agent_identity WHERE user_id = p_user_id;
  IF v_id IS NULL THEN
    INSERT INTO agent_identity (user_id)
    VALUES (p_user_id)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."ensure_agent_identity"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_single_default_provider"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.ai_provider_configs
      SET is_default = false
      WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END; $$;


ALTER FUNCTION "public"."ensure_single_default_provider"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_gamification_profile"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."ensure_user_gamification_profile"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_user_gamification_profile"("p_user_id" "uuid") IS 'Garante a existência do perfil canônico de gamificação do usuário.';



CREATE OR REPLACE FUNCTION "public"."expire_old_opportunities"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE market_opportunities
  SET dismissed = true, dismissed_at = NOW()
  WHERE expires_at < NOW() 
    AND dismissed = false;
END;
$$;


ALTER FUNCTION "public"."expire_old_opportunities"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."expire_old_opportunities"() IS 'Expira oportunidades de mercado que passaram da data de validade';



CREATE OR REPLACE FUNCTION "public"."generate_recurring_bills"("p_horizon_days" integer DEFAULT 120) RETURNS TABLE("generated_count" integer, "bills_created" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rec_bill RECORD;
  new_due_date date;
  last_materialized_due_date date;
  bills_array jsonb := '[]'::jsonb;
  total_generated integer := 0;
  new_bill_id uuid;
  config jsonb;
  horizon_date date := current_date + GREATEST(COALESCE(p_horizon_days, 120), 30);
  reminder_payload jsonb;
BEGIN
  FOR rec_bill IN
    SELECT *
    FROM payable_bills
    WHERE is_recurring = true
      AND parent_bill_id IS NULL
      AND status != 'cancelled'
      AND recurrence_config IS NOT NULL
      AND ((recurrence_config->>'end_date') IS NULL OR (recurrence_config->>'end_date')::date >= current_date)
  LOOP
    config := rec_bill.recurrence_config;
    last_materialized_due_date := COALESCE(rec_bill.next_occurrence_date, rec_bill.due_date);

    LOOP
      CASE (config->>'frequency')
        WHEN 'monthly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '1 month')::date;
        WHEN 'bimonthly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '2 months')::date;
        WHEN 'quarterly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '3 months')::date;
        WHEN 'semiannual' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '6 months')::date;
        WHEN 'yearly' THEN
          new_due_date := (last_materialized_due_date + INTERVAL '1 year')::date;
        ELSE
          new_due_date := (last_materialized_due_date + INTERVAL '1 month')::date;
      END CASE;

      IF (config->>'day') IS NOT NULL THEN
        new_due_date := (date_trunc('month', new_due_date)::date + ((config->>'day')::integer - 1))::date;
      END IF;

      EXIT WHEN new_due_date > horizon_date;
      EXIT WHEN (config->>'end_date') IS NOT NULL AND new_due_date > (config->>'end_date')::date;

      IF NOT EXISTS (
        SELECT 1
        FROM payable_bills existing_bill
        WHERE existing_bill.user_id = rec_bill.user_id
          AND existing_bill.parent_bill_id = rec_bill.id
          AND existing_bill.due_date = new_due_date
      ) THEN
        INSERT INTO payable_bills (
          user_id,
          description,
          amount,
          due_date,
          bill_type,
          provider_name,
          category_id,
          is_recurring,
          recurrence_config,
          parent_bill_id,
          reminder_enabled,
          reminder_days_before,
          reminder_channels,
          priority,
          payment_account_id,
          payment_method,
          tags,
          status
        ) VALUES (
          rec_bill.user_id,
          rec_bill.description || ' - ' || TO_CHAR(new_due_date, 'MM/YYYY'),
          rec_bill.amount,
          new_due_date,
          rec_bill.bill_type,
          rec_bill.provider_name,
          rec_bill.category_id,
          false,
          rec_bill.recurrence_config,
          rec_bill.id,
          rec_bill.reminder_enabled,
          rec_bill.reminder_days_before,
          rec_bill.reminder_channels,
          rec_bill.priority,
          rec_bill.payment_account_id,
          rec_bill.payment_method,
          rec_bill.tags,
          'pending'
        ) RETURNING id INTO new_bill_id;

        IF rec_bill.reminder_enabled THEN
          SELECT COALESCE(
            (
              SELECT jsonb_agg(reminder_row.reminder)
              FROM (
                SELECT DISTINCT jsonb_build_object(
                  'days_before', br.days_before,
                  'time', to_char(br.reminder_time, 'HH24:MI:SS'),
                  'channel', br.channel
                ) AS reminder
                FROM bill_reminders br
                WHERE br.bill_id = rec_bill.id
              ) AS reminder_row
            ),
            '[]'::jsonb
          ) INTO reminder_payload;

          IF jsonb_array_length(reminder_payload) = 0 THEN
            SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'days_before', COALESCE(rec_bill.reminder_days_before, 1),
                  'time', '09:00:00',
                  'channel', reminder_channel
                )
              ),
              '[]'::jsonb
            ) INTO reminder_payload
            FROM unnest(COALESCE(rec_bill.reminder_channels, ARRAY['whatsapp'])) AS reminder_channel;
          END IF;

          IF jsonb_array_length(reminder_payload) > 0 THEN
            PERFORM public.schedule_bill_reminders(new_bill_id, rec_bill.user_id, reminder_payload);
          END IF;
        END IF;

        bills_array := bills_array || jsonb_build_object(
          'id', new_bill_id,
          'template_id', rec_bill.id,
          'description', rec_bill.description,
          'provider', rec_bill.provider_name,
          'due_date', new_due_date,
          'amount', rec_bill.amount
        );

        total_generated := total_generated + 1;
      END IF;

      last_materialized_due_date := new_due_date;
    END LOOP;

    UPDATE payable_bills
    SET next_occurrence_date = last_materialized_due_date,
        updated_at = NOW()
    WHERE id = rec_bill.id;
  END LOOP;

  RETURN QUERY
  SELECT total_generated, bills_array;
END;
$$;


ALTER FUNCTION "public"."generate_recurring_bills"("p_horizon_days" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_opportunities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ticker" "text" NOT NULL,
    "opportunity_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "current_price" numeric(18,2),
    "target_price" numeric(18,2),
    "expected_return" numeric(5,2),
    "ana_clara_insight" "text",
    "confidence_score" integer,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "is_dismissed" boolean DEFAULT false,
    "dismissed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "market_opportunities_confidence_score_check" CHECK ((("confidence_score" >= 0) AND ("confidence_score" <= 100))),
    CONSTRAINT "market_opportunities_opportunity_type_check" CHECK (("opportunity_type" = ANY (ARRAY['buy_opportunity'::"text", 'sell_signal'::"text", 'dividend_alert'::"text", 'price_target'::"text", 'sector_rotation'::"text"])))
);


ALTER TABLE "public"."market_opportunities" OWNER TO "postgres";


COMMENT ON TABLE "public"."market_opportunities" IS 'Oportunidades de mercado identificadas pela Ana Clara';



COMMENT ON COLUMN "public"."market_opportunities"."opportunity_type" IS 'buy_opportunity, sell_signal, dividend_alert, price_target, sector_rotation';



COMMENT ON COLUMN "public"."market_opportunities"."confidence_score" IS 'Confiança Ana Clara (0-100)';



CREATE OR REPLACE FUNCTION "public"."get_active_opportunities"("p_user_id" "uuid") RETURNS SETOF "public"."market_opportunities"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM market_opportunities
  WHERE user_id = p_user_id
    AND dismissed = false
    AND expires_at > NOW()
  ORDER BY confidence_score DESC, created_at DESC
  LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."get_active_opportunities"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_opportunities"("p_user_id" "uuid") IS 'Retorna oportunidades ativas para um usuário específico';



CREATE OR REPLACE FUNCTION "public"."get_active_users"() RETURNS TABLE("id" "uuid", "email" "text", "investment_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    i.user_id AS id,
    u.email::TEXT,
    COUNT(i.id) AS investment_count
  FROM investments i
  JOIN auth.users u ON u.id = i.user_id
  WHERE i.status = 'active'
  GROUP BY i.user_id, u.email
  HAVING COUNT(i.id) > 0
  ORDER BY investment_count DESC;
END;
$$;


ALTER FUNCTION "public"."get_active_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_active_users"() IS 'Retorna usuários com investimentos ativos para processamento em lote (cron jobs)';



CREATE OR REPLACE FUNCTION "public"."get_agenda_window"("p_user_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) RETURNS TABLE("agenda_item_type" "text", "origin_type" "text", "origin_id" "uuid", "dedup_key" "text", "display_start_at" timestamp with time zone, "display_end_at" timestamp with time zone, "title" "text", "subtitle" "text", "status" "text", "badge" "text", "edit_route" "text", "is_read_only" boolean, "supports_reschedule" boolean, "supports_complete" boolean, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH external_link_snapshot AS (
    SELECT DISTINCT ON (l.event_id)
      l.event_id,
      l.provider,
      l.sync_status,
      l.last_synced_at,
      l.last_remote_updated_at
    FROM public.calendar_external_event_links l
    WHERE l.event_id IS NOT NULL
    ORDER BY l.event_id, l.updated_at DESC NULLS LAST, l.created_at DESC NULLS LAST
  ),
  canonical_simple AS (
    SELECT
      'canonical_event'::text AS agenda_item_type,
      'calendar_event'::text AS origin_type,
      ce.id AS origin_id,
      ('ce:' || ce.id::text)::text AS dedup_key,
      ce.start_at AS display_start_at,
      ce.end_at AS display_end_at,
      ce.title,
      ce.description AS subtitle,
      ce.status::text AS status,
      ce.event_kind AS badge,
      ('/calendar/events/' || ce.id::text) AS edit_route,
      false AS is_read_only,
      true AS supports_reschedule,
      true AS supports_complete,
      (
        coalesce(ce.metadata, '{}'::jsonb) ||
        jsonb_strip_nulls(
          jsonb_build_object(
            'event_id', ce.id,
            'is_recurring', false,
            'sync_provider', els.provider,
            'sync_status', els.sync_status,
            'sync_last_synced_at', els.last_synced_at,
            'sync_last_remote_updated_at', els.last_remote_updated_at
          )
        )
      ) AS metadata
    FROM public.calendar_events ce
    LEFT JOIN external_link_snapshot els ON els.event_id = ce.id
    WHERE ce.user_id = p_user_id
      AND ce.deleted_at IS NULL
      AND ce.status <> 'cancelled'
      AND ce.start_at < p_to
      AND (ce.end_at IS NULL OR ce.end_at > p_from OR ce.start_at >= p_from)
      AND NOT EXISTS (
        SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = ce.id
      )
  ),
  recurring_core AS (
    SELECT
      ce.id AS event_id,
      ce.title AS base_title,
      ce.description AS base_description,
      ce.event_kind,
      ce.status::text AS ev_status,
      ce.metadata AS base_metadata,
      r.frequency AS series_frequency,
      occ.original_start_at AS o_start,
      occ.original_end_at AS o_end,
      o.id AS ov_id,
      o.is_cancelled AS ov_cancelled,
      o.override_start_at,
      o.override_end_at,
      o.title_override,
      o.description_override,
      els.provider AS sync_provider,
      els.sync_status AS sync_status,
      els.last_synced_at AS sync_last_synced_at,
      els.last_remote_updated_at AS sync_last_remote_updated_at
    FROM public.calendar_events ce
    INNER JOIN public.calendar_event_recurrence_rules r ON r.event_id = ce.id
    INNER JOIN LATERAL public.calendar_recurrence_expand_occurrences(ce.id, p_from, p_to) AS occ
      ON true
    LEFT JOIN public.calendar_event_occurrence_overrides o
      ON o.event_id = ce.id
      AND o.occurrence_key = public.calendar_occurrence_key(ce.id, occ.original_start_at)
    LEFT JOIN external_link_snapshot els ON els.event_id = ce.id
    WHERE ce.user_id = p_user_id
      AND ce.deleted_at IS NULL
      AND ce.status <> 'cancelled'
      AND coalesce(o.is_cancelled, false) = false
  ),
  canonical_recurring AS (
    SELECT
      'canonical_event'::text AS agenda_item_type,
      'calendar_event'::text AS origin_type,
      rc.event_id AS origin_id,
      ('ceo:' || public.calendar_occurrence_key(rc.event_id, rc.o_start))::text AS dedup_key,
      coalesce(rc.override_start_at, rc.o_start) AS display_start_at,
      coalesce(rc.override_end_at, rc.o_end) AS display_end_at,
      coalesce(rc.title_override, rc.base_title) AS title,
      coalesce(rc.description_override, rc.base_description) AS subtitle,
      rc.ev_status AS status,
      rc.event_kind AS badge,
      ('/calendar/events/' || rc.event_id::text) AS edit_route,
      false AS is_read_only,
      true AS supports_reschedule,
      true AS supports_complete,
      (
        coalesce(rc.base_metadata, '{}'::jsonb) ||
        jsonb_strip_nulls(
          jsonb_build_object(
            'event_id', rc.event_id,
            'occurrence_key', public.calendar_occurrence_key(rc.event_id, rc.o_start),
            'is_recurring', true,
            'original_start_at', rc.o_start,
            'override_id', rc.ov_id,
            'series_frequency', rc.series_frequency::text,
            'sync_provider', rc.sync_provider,
            'sync_status', rc.sync_status,
            'sync_last_synced_at', rc.sync_last_synced_at,
            'sync_last_remote_updated_at', rc.sync_last_remote_updated_at
          )
        )
      ) AS metadata
    FROM recurring_core rc
  ),
  payable_bills_projection AS (
    SELECT
      'derived_projection'::text AS agenda_item_type,
      'payable_bill'::text AS origin_type,
      pb.id AS origin_id,
      ('pb:' || pb.id::text || ':' || pb.due_date::text)::text AS dedup_key,
      (pb.due_date::text || 'T00:00:00-03:00')::timestamptz AS display_start_at,
      (pb.due_date::text || 'T23:59:59-03:00')::timestamptz AS display_end_at,
      pb.description AS title,
      CASE
        WHEN pb.status = 'overdue' THEN 'Vencida'
        WHEN pb.status = 'pending' THEN 'Pendente'
        WHEN pb.status = 'paid' THEN 'Paga'
        ELSE pb.status::text
      END AS subtitle,
      pb.status::text AS status,
      'bill'::text AS badge,
      ('/bills/' || pb.id::text) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('amount', pb.amount, 'provider_name', pb.provider_name) AS metadata
    FROM public.payable_bills pb
    WHERE pb.user_id = p_user_id
      AND pb.due_date >= (p_from AT TIME ZONE 'America/Sao_Paulo')::date
      AND pb.due_date <= (p_to AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  bill_reminders_projection AS (
    SELECT
      'derived_projection'::text AS agenda_item_type,
      'bill_reminder'::text AS origin_type,
      br.id AS origin_id,
      ('br:' || br.bill_id::text || ':' || br.reminder_date::text)::text AS dedup_key,
      (br.reminder_date::text || 'T' || br.reminder_time::text || '-03:00')::timestamptz AS display_start_at,
      (br.reminder_date::text || 'T' || br.reminder_time::text || '-03:00')::timestamptz AS display_end_at,
      ('Lembrete: ' || pb.description) AS title,
      br.channel AS subtitle,
      br.status::text AS status,
      'bill_reminder'::text AS badge,
      ('/bills/' || br.bill_id::text) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('days_before', br.days_before, 'bill_amount', pb.amount) AS metadata
    FROM public.bill_reminders br
    JOIN public.payable_bills pb ON pb.id = br.bill_id
    WHERE br.user_id = p_user_id
      AND br.reminder_date >= (p_from AT TIME ZONE 'America/Sao_Paulo')::date
      AND br.reminder_date <= (p_to AT TIME ZONE 'America/Sao_Paulo')::date
      AND NOT EXISTS (
        SELECT 1 FROM public.payable_bills pb2
        WHERE pb2.id = br.bill_id
          AND pb2.user_id = p_user_id
          AND pb2.due_date = br.reminder_date
      )
  ),
  financial_cycles_projection AS (
    SELECT
      'derived_projection'::text AS agenda_item_type,
      'financial_cycle'::text AS origin_type,
      fc.id AS origin_id,
      ('fc:' || fc.id::text || ':' || to_char(
        make_date(
          EXTRACT(YEAR FROM p_from)::int,
          EXTRACT(MONTH FROM p_from)::int,
          LEAST(fc.day, 28)
        ),
        'YYYY-MM-DD'
      ))::text AS dedup_key,
      make_date(
        EXTRACT(YEAR FROM p_from)::int,
        EXTRACT(MONTH FROM p_from)::int,
        LEAST(fc.day, 28)
      )::timestamptz AS display_start_at,
      make_date(
        EXTRACT(YEAR FROM p_from)::int,
        EXTRACT(MONTH FROM p_from)::int,
        LEAST(fc.day, 28)
      )::timestamptz AS display_end_at,
      fc.name AS title,
      fc.type AS subtitle,
      CASE WHEN fc.active THEN 'active' ELSE 'inactive' END AS status,
      'cycle'::text AS badge,
      ('/settings/cycles/' || fc.id::text) AS edit_route,
      true AS is_read_only,
      false AS supports_reschedule,
      false AS supports_complete,
      jsonb_build_object('cycle_type', fc.type, 'icon', fc.icon, 'color', fc.color) AS metadata
    FROM public.financial_cycles fc
    WHERE fc.user_id = p_user_id
      AND fc.active = true
      AND make_date(
        EXTRACT(YEAR FROM p_from)::int,
        EXTRACT(MONTH FROM p_from)::int,
        LEAST(fc.day, 28)
      ) BETWEEN (p_from AT TIME ZONE 'America/Sao_Paulo')::date
            AND (p_to AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  unioned AS (
    SELECT * FROM canonical_simple
    UNION ALL
    SELECT * FROM canonical_recurring
    UNION ALL
    SELECT * FROM payable_bills_projection
    UNION ALL
    SELECT * FROM bill_reminders_projection
    UNION ALL
    SELECT * FROM financial_cycles_projection
  )
  SELECT * FROM unioned u
  ORDER BY u.display_start_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_agenda_window"("p_user_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_agenda_window"("p_user_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) IS 'Unified agenda window: simple canonical events, recurring occurrences (daily/weekly/monthly), financial projections, enriched with latest external sync metadata when available.';



CREATE OR REPLACE FUNCTION "public"."get_agent_memory_context"("p_user_id" "uuid", "p_max_facts" integer DEFAULT 5, "p_max_episodes" integer DEFAULT 5) RETURNS TABLE("user_facts" "jsonb", "recent_episodes" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to read context for another user';
  END IF;

  RETURN QUERY
  WITH fact_rows AS (
    SELECT
      m.id,
      m.memory_type,
      m.content,
      m.confidence,
      m.reinforcement_count,
      m.metadata,
      m.tags,
      m.last_reinforced_at,
      m.updated_at
    FROM public.agent_memory_entries AS m
    WHERE m.user_id = p_user_id
      AND (m.expires_at IS NULL OR m.expires_at > now())
    ORDER BY m.confidence DESC, m.last_reinforced_at DESC, m.updated_at DESC
    LIMIT GREATEST(COALESCE(p_max_facts, 5), 1)
  ),
  episode_rows AS (
    SELECT
      e.id,
      e.summary,
      e.outcome,
      e.importance,
      e.source,
      e.entities,
      e.created_at
    FROM public.agent_memory_episodes AS e
    WHERE e.user_id = p_user_id
      AND e.expires_at > now()
    ORDER BY e.importance DESC, e.created_at DESC
    LIMIT GREATEST(COALESCE(p_max_episodes, 5), 1)
  )
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'memory_type', f.memory_type,
            'content', f.content,
            'confidence', f.confidence,
            'reinforcement_count', f.reinforcement_count,
            'metadata', f.metadata,
            'tags', f.tags
          )
          ORDER BY f.confidence DESC, f.last_reinforced_at DESC, f.updated_at DESC
        )
        FROM fact_rows AS f
      ),
      '[]'::jsonb
    ) AS user_facts,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'summary', e.summary,
            'outcome', e.outcome,
            'importance', e.importance,
            'source', e.source,
            'entities', e.entities,
            'created_at', e.created_at
          )
          ORDER BY e.importance DESC, e.created_at DESC
        )
        FROM episode_rows AS e
      ),
      '[]'::jsonb
    ) AS recent_episodes;
END;
$$;


ALTER FUNCTION "public"."get_agent_memory_context"("p_user_id" "uuid", "p_max_facts" integer, "p_max_episodes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bill_analytics"("p_user_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_prev_start_date DATE;
  v_prev_end_date DATE;
  v_result JSONB;
  v_totals JSONB;
  v_previous_totals JSONB;
  v_performance JSONB;
  v_monthly_totals JSONB;
  v_forecast JSONB;
  v_top_providers JSONB;
  v_by_type JSONB;
  v_comparison JSONB;
  v_top_increases JSONB;
  v_potential_savings JSONB;
  v_biggest_expense JSONB;
  v_total_amount NUMERIC := 0;
  v_prev_total_amount NUMERIC := 0;
  v_paid_on_time INTEGER := 0;
  v_total_paid INTEGER := 0;
  v_total_delay_days INTEGER := 0;
  v_max_delay INTEGER := 0;
  v_overdue_count INTEGER := 0;
  v_estimated_interest NUMERIC := 0;
  v_estimated_fines NUMERIC := 0;
BEGIN
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  v_start_date := COALESCE(p_start_date, v_end_date - INTERVAL '12 months');
  v_prev_end_date := v_start_date - INTERVAL '1 day';
  v_prev_start_date := v_prev_end_date - (v_end_date - v_start_date);

  SELECT COALESCE(jsonb_build_object(
    'total_bills', COUNT(*)::INTEGER,
    'paid_count', COUNT(*) FILTER (WHERE status = 'paid')::INTEGER,
    'overdue_count', COUNT(*) FILTER (WHERE status = 'overdue')::INTEGER,
    'pending_count', COUNT(*) FILTER (WHERE status = 'pending')::INTEGER,
    'total_amount', COALESCE(SUM(amount), 0)::NUMERIC,
    'paid_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC,
    'overdue_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0)::NUMERIC,
    'pending_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::NUMERIC,
    'avg_amount', COALESCE(AVG(amount), 0)::NUMERIC
  ), '{}'::JSONB)
  INTO v_totals
  FROM payable_bills
  WHERE user_id = p_user_id
    AND due_date BETWEEN v_start_date AND v_end_date
    AND is_recurring = FALSE;

  v_total_amount := COALESCE((v_totals->>'total_amount')::NUMERIC, 0);

  SELECT COALESCE(jsonb_build_object(
    'total_bills', COUNT(*)::INTEGER,
    'total_amount', COALESCE(SUM(amount), 0)::NUMERIC,
    'paid_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC
  ), '{}'::JSONB)
  INTO v_previous_totals
  FROM payable_bills
  WHERE user_id = p_user_id
    AND due_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND is_recurring = FALSE;

  v_prev_total_amount := COALESCE((v_previous_totals->>'total_amount')::NUMERIC, 0);

  v_comparison := jsonb_build_object(
    'previous_total', v_prev_total_amount,
    'current_total', v_total_amount,
    'difference', v_total_amount - v_prev_total_amount,
    'variation_percent', CASE 
      WHEN v_prev_total_amount > 0 THEN 
        ROUND(((v_total_amount - v_prev_total_amount) / v_prev_total_amount * 100)::NUMERIC, 1)
      ELSE 0 
    END,
    'trend', CASE 
      WHEN v_total_amount > v_prev_total_amount THEN 'up'
      WHEN v_total_amount < v_prev_total_amount THEN 'down'
      ELSE 'stable'
    END
  );

  SELECT 
    COUNT(*) FILTER (WHERE status = 'paid' AND (paid_at IS NULL OR paid_at::DATE <= due_date)),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at IS NOT NULL AND paid_at::DATE > due_date THEN (paid_at::DATE - due_date) ELSE 0 END), 0),
    COALESCE(MAX(CASE WHEN status = 'paid' AND paid_at IS NOT NULL AND paid_at::DATE > due_date THEN (paid_at::DATE - due_date) ELSE 0 END), 0)
  INTO v_paid_on_time, v_total_paid, v_total_delay_days, v_max_delay
  FROM payable_bills
  WHERE user_id = p_user_id AND due_date BETWEEN v_start_date AND v_end_date AND is_recurring = FALSE;

  v_performance := jsonb_build_object(
    'on_time_payment_rate', CASE WHEN v_total_paid > 0 THEN ROUND((v_paid_on_time::NUMERIC / v_total_paid * 100), 1) ELSE 100 END,
    'avg_delay_days', CASE WHEN v_total_paid - v_paid_on_time > 0 THEN ROUND((v_total_delay_days::NUMERIC / (v_total_paid - v_paid_on_time)), 1) ELSE 0 END,
    'max_delay_days', v_max_delay,
    'paid_on_time_count', v_paid_on_time,
    'paid_late_count', v_total_paid - v_paid_on_time
  );

  SELECT COUNT(*), COALESCE(SUM(amount * 0.02), 0), COALESCE(SUM(amount * 0.01 * GREATEST(1, (CURRENT_DATE - due_date) / 30)), 0)
  INTO v_overdue_count, v_estimated_fines, v_estimated_interest
  FROM payable_bills WHERE user_id = p_user_id AND status = 'overdue' AND is_recurring = FALSE;

  v_potential_savings := jsonb_build_object(
    'overdue_bills_count', v_overdue_count,
    'estimated_fines', ROUND(v_estimated_fines, 2),
    'estimated_interest', ROUND(v_estimated_interest, 2),
    'total_potential_savings', ROUND(v_estimated_fines + v_estimated_interest, 2),
    'message', CASE WHEN v_overdue_count > 0 THEN 'Pagando em dia você economizaria R$ ' || ROUND(v_estimated_fines + v_estimated_interest, 2)::TEXT || '/mês' ELSE 'Parabéns! Você está em dia com todas as contas!' END
  );

  SELECT COALESCE(jsonb_agg(jsonb_build_object('month', TO_CHAR(month_date, 'YYYY-MM'), 'month_name', TO_CHAR(month_date, 'Mon/YY'), 'total', total, 'paid', paid, 'pending', pending, 'count', bill_count) ORDER BY month_date), '[]'::JSONB)
  INTO v_monthly_totals
  FROM (SELECT DATE_TRUNC('month', due_date)::DATE as month_date, COALESCE(SUM(amount), 0) as total, COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paid, COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'overdue')), 0) as pending, COUNT(*) as bill_count FROM payable_bills WHERE user_id = p_user_id AND due_date BETWEEN v_start_date AND v_end_date AND is_recurring = FALSE GROUP BY DATE_TRUNC('month', due_date)) monthly;

  SELECT jsonb_build_object('next_month_prediction', COALESCE(ROUND(AVG(total), 2), 0), 'based_on_months', COUNT(*)::INTEGER)
  INTO v_forecast
  FROM (SELECT SUM(amount) as total FROM payable_bills WHERE user_id = p_user_id AND due_date >= (CURRENT_DATE - INTERVAL '3 months') AND due_date < CURRENT_DATE AND is_recurring = FALSE GROUP BY DATE_TRUNC('month', due_date) ORDER BY DATE_TRUNC('month', due_date) DESC LIMIT 3) recent_months;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('provider', provider_name, 'count', bill_count, 'total', total, 'avg', avg_amount) ORDER BY total DESC), '[]'::JSONB)
  INTO v_top_providers
  FROM (SELECT COALESCE(provider_name, 'Não informado') as provider_name, COUNT(*) as bill_count, SUM(amount) as total, ROUND(AVG(amount), 2) as avg_amount FROM payable_bills WHERE user_id = p_user_id AND due_date BETWEEN v_start_date AND v_end_date AND is_recurring = FALSE GROUP BY provider_name ORDER BY total DESC LIMIT 5) providers;

  SELECT COALESCE(jsonb_object_agg(bill_type, jsonb_build_object('count', bill_count, 'total', total, 'percentage', ROUND((total / NULLIF(v_total_amount, 0) * 100)::NUMERIC, 1))), '{}'::JSONB)
  INTO v_by_type
  FROM (SELECT bill_type, COUNT(*) as bill_count, SUM(amount) as total FROM payable_bills WHERE user_id = p_user_id AND due_date BETWEEN v_start_date AND v_end_date AND is_recurring = FALSE GROUP BY bill_type) types;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('description', description, 'provider', provider_name, 'bill_type', bill_type, 'current_amount', current_amount, 'previous_amount', previous_amount, 'difference', current_amount - previous_amount, 'variation_percent', ROUND(((current_amount - previous_amount) / NULLIF(previous_amount, 0) * 100)::NUMERIC, 1)) ORDER BY (current_amount - previous_amount) DESC), '[]'::JSONB)
  INTO v_top_increases
  FROM (SELECT curr.description, curr.provider_name, curr.bill_type, curr.amount as current_amount, prev.amount as previous_amount FROM payable_bills curr INNER JOIN payable_bills prev ON (curr.user_id = prev.user_id AND curr.description = prev.description AND curr.provider_name IS NOT DISTINCT FROM prev.provider_name AND prev.due_date BETWEEN v_prev_start_date AND v_prev_end_date) WHERE curr.user_id = p_user_id AND curr.due_date BETWEEN v_start_date AND v_end_date AND curr.is_recurring = FALSE AND curr.amount > prev.amount ORDER BY (curr.amount - prev.amount) DESC LIMIT 5) increases;

  SELECT jsonb_build_object('description', description, 'provider', provider_name, 'amount', amount, 'bill_type', bill_type, 'percentage_of_total', ROUND((amount / NULLIF(v_total_amount, 0) * 100)::NUMERIC, 1))
  INTO v_biggest_expense
  FROM payable_bills WHERE user_id = p_user_id AND due_date BETWEEN v_start_date AND v_end_date AND is_recurring = FALSE ORDER BY amount DESC LIMIT 1;

  v_result := jsonb_build_object(
    'period', jsonb_build_object('start_date', v_start_date, 'end_date', v_end_date, 'previous_start_date', v_prev_start_date, 'previous_end_date', v_prev_end_date),
    'totals', v_totals,
    'comparison', v_comparison,
    'performance', v_performance,
    'potential_savings', v_potential_savings,
    'monthly_totals', v_monthly_totals,
    'forecast', v_forecast,
    'top_providers', v_top_providers,
    'by_type', v_by_type,
    'top_increases', v_top_increases,
    'biggest_expense', COALESCE(v_biggest_expense, '{}'::JSONB)
  );

  RETURN v_result;
END;
$_$;


ALTER FUNCTION "public"."get_bill_analytics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_contas_consolidadas"("p_user_id" "uuid", "p_status" "text"[] DEFAULT ARRAY['pending'::"text", 'overdue'::"text", 'open'::"text", 'closed'::"text"], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("id" "uuid", "user_id" "uuid", "description" "text", "amount" numeric, "due_date" "date", "bill_type" "text", "status" "text", "is_recurring" boolean, "is_installment" boolean, "installment_number" integer, "installment_total" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "source_type" "text", "source_id" "uuid", "credit_card_id" "uuid", "credit_card_name" "text", "credit_card_brand" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_contas_consolidadas"("p_user_id" "uuid", "p_status" "text"[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_contas_consolidadas"("p_user_id" "uuid", "p_status" "text"[], "p_start_date" "date", "p_end_date" "date") IS 'Retorna visão consolidada de payable_bills + credit_card_invoices para o usuário';



CREATE OR REPLACE FUNCTION "public"."get_installment_schedule"("p_transaction_id" "uuid") RETURNS TABLE("installment_number" integer, "amount" numeric, "due_date" "date", "status" "text", "invoice_month" "date")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_transaction RECORD;
  v_closing_day INTEGER;
  i INTEGER;
  v_invoice_date DATE;
BEGIN
  -- Buscar transação
  SELECT t.*, cc.closing_day INTO v_transaction
  FROM credit_card_transactions t
  JOIN credit_cards cc ON t.credit_card_id = cc.id
  WHERE t.id = p_transaction_id;
  
  IF NOT FOUND OR NOT v_transaction.is_installment THEN
    RETURN;
  END IF;
  
  v_closing_day := COALESCE(v_transaction.closing_day, 1);
  
  -- Gerar cada parcela
  FOR i IN 1..v_transaction.total_installments LOOP
    -- Calcular mês da fatura (baseado na data de compra + número de meses)
    v_invoice_date := DATE_TRUNC('month', v_transaction.purchase_date) + ((i - 1) || ' months')::INTERVAL;
    
    RETURN QUERY SELECT
      i AS installment_number,
      v_transaction.amount AS amount,
      (v_invoice_date + ((v_closing_day - 1) || ' days')::INTERVAL)::DATE AS due_date,
      CASE 
        WHEN v_invoice_date < DATE_TRUNC('month', CURRENT_DATE) THEN 'paid'
        WHEN v_invoice_date = DATE_TRUNC('month', CURRENT_DATE) THEN 'current'
        ELSE 'future'
      END AS status,
      v_invoice_date AS invoice_month;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_installment_schedule"("p_transaction_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_investment_goal_metrics"("p_goal_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_goal public.investment_goals%ROWTYPE;
  v_months_total INTEGER;
  v_months_elapsed INTEGER;
  v_months_remaining INTEGER;
  v_percentage NUMERIC;
  v_is_on_track BOOLEAN;
  v_final_projection NUMERIC;
  v_total_contributions NUMERIC;
  v_total_interest NUMERIC;
BEGIN
  SELECT * INTO v_goal FROM public.investment_goals WHERE id = p_goal_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v_months_total := EXTRACT(YEAR FROM AGE(v_goal.target_date, v_goal.start_date)) * 12 + EXTRACT(MONTH FROM AGE(v_goal.target_date, v_goal.start_date));
  v_months_elapsed := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_goal.start_date)) * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_goal.start_date));
  v_months_remaining := GREATEST(0, v_months_total - v_months_elapsed);
  v_percentage := CASE WHEN v_goal.target_amount > 0 THEN (v_goal.current_amount / v_goal.target_amount) * 100 ELSE 0 END;
  SELECT balance INTO v_final_projection FROM public.calculate_investment_projection(v_goal.current_amount, v_goal.monthly_contribution, v_goal.expected_return_rate, v_months_remaining) ORDER BY month DESC LIMIT 1;
  v_total_contributions := v_goal.monthly_contribution * v_months_remaining;
  v_total_interest := COALESCE(v_final_projection, v_goal.current_amount) - v_goal.current_amount - v_total_contributions;
  v_is_on_track := COALESCE(v_final_projection, v_goal.current_amount) >= v_goal.target_amount;
  RETURN jsonb_build_object(
    'goal_id', v_goal.id,
    'current_amount', v_goal.current_amount,
    'target_amount', v_goal.target_amount,
    'percentage', ROUND(v_percentage, 2),
    'months_total', v_months_total,
    'months_elapsed', v_months_elapsed,
    'months_remaining', v_months_remaining,
    'final_projection', ROUND(COALESCE(v_final_projection, v_goal.current_amount), 2),
    'total_contributions', ROUND(v_total_contributions, 2),
    'total_interest', ROUND(v_total_interest, 2),
    'is_on_track', v_is_on_track,
    'shortfall', CASE WHEN COALESCE(v_final_projection, v_goal.current_amount) < v_goal.target_amount THEN ROUND(v_goal.target_amount - COALESCE(v_final_projection, v_goal.current_amount), 2) ELSE 0 END
  );
END;
$$;


ALTER FUNCTION "public"."get_investment_goal_metrics"("p_goal_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_investment_goal_metrics"("p_goal_id" "uuid") IS 'Retorna métricas consolidadas de progresso e projeção da meta de investimento';



CREATE OR REPLACE FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "reference_month" "date") RETURNS TABLE("total_income" numeric, "total_expenses" numeric, "balance" numeric, "savings_amount" numeric, "savings_percentage" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) - 
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as savings_amount,
        CASE 
            WHEN SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) > 0 THEN
                ROUND(((SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
                    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) / 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) * 100)::numeric, 2)
            ELSE 0
        END as savings_percentage
    FROM transactions
    WHERE user_id = p_user_id 
        AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', reference_month)
        AND is_paid = TRUE;
END;
$$;


ALTER FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "reference_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "reference_month" "date") IS 'Retorna resumo financeiro (receitas, despesas, economia) de um mês específico';



CREATE OR REPLACE FUNCTION "public"."get_pending_reminders"() RETURNS TABLE("id" "uuid", "bill_id" "uuid", "user_id" "uuid", "reminder_date" "date", "reminder_time" time without time zone, "days_before" integer, "channel" "text", "retry_count" integer, "description" "text", "amount" numeric, "due_date" "date", "provider_name" "text", "phone" "text", "full_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH user_preferences AS (
    -- Buscar preferências de cada usuário
    SELECT 
      np.user_id,
      COALESCE(np.bill_reminders_days_before_array, ARRAY[3]) as days_array,
      COALESCE(np.bill_reminders_time, '09:00:00'::time) as pref_reminder_time,
      COALESCE(np.bill_reminders_enabled, true) as enabled,
      COALESCE(np.whatsapp_enabled, false) as whatsapp_enabled
    FROM notification_preferences np
  ),
  pending_bills AS (
    -- Buscar contas pendentes
    SELECT 
      pb.id as pb_bill_id,
      pb.user_id as pb_user_id,
      pb.description as pb_description,
      pb.amount as pb_amount,
      pb.due_date as pb_due_date,
      pb.provider_name as pb_provider_name
    FROM payable_bills pb
    WHERE pb.status != 'paid'
      AND pb.due_date >= CURRENT_DATE
  )
  SELECT 
    gen_random_uuid() as id,
    pb.pb_bill_id as bill_id,
    pb.pb_user_id as user_id,
    CURRENT_DATE as reminder_date,
    up.pref_reminder_time as reminder_time,
    (pb.pb_due_date - CURRENT_DATE)::integer as days_before,
    'whatsapp'::text as channel,
    0 as retry_count,
    pb.pb_description::text as description,  -- Cast explícito para text
    pb.pb_amount as amount,
    pb.pb_due_date as due_date,
    pb.pb_provider_name::text as provider_name,  -- Cast explícito para text
    u.phone::text as phone,  -- Cast explícito para text
    u.full_name::text as full_name  -- Cast explícito para text
  FROM pending_bills pb
  JOIN user_preferences up ON up.user_id = pb.pb_user_id
  JOIN users u ON u.id = pb.pb_user_id
  WHERE up.enabled = true
    AND up.whatsapp_enabled = true
    -- Verifica se hoje é um dia de lembrete (baseado no array)
    AND (pb.pb_due_date - CURRENT_DATE)::integer = ANY(up.days_array)
    -- Verifica se já passou do horário configurado
    AND up.pref_reminder_time <= CURRENT_TIME
    -- Usuário tem telefone
    AND u.phone IS NOT NULL
  ORDER BY pb.pb_due_date ASC, up.pref_reminder_time ASC
  LIMIT 100;
END;
$$;


ALTER FUNCTION "public"."get_pending_reminders"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pending_reminders"() IS 'Retorna lembretes pendentes de contas a pagar. Corrigido em 06/12/2025 - type mismatch varchar vs text';



CREATE OR REPLACE FUNCTION "public"."get_spending_goal_actual_amount"("p_user_id" "uuid", "p_category_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."get_spending_goal_actual_amount"("p_user_id" "uuid", "p_category_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_spending_goal_actual_amount"("p_user_id" "uuid", "p_category_id" "uuid", "p_period_start" "date", "p_period_end" "date") IS 'Calcula o gasto real de uma meta spending_limit somando transactions e credit_card_transactions.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger function para criar perfil em public.users quando usuário faz signup';



CREATE OR REPLACE FUNCTION "public"."incrementar_frequencia_memoria"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE user_memory 
  SET 
    frequencia = frequencia + 1,
    ultima_vez = NOW()
  WHERE user_id = p_user_id 
    AND tipo = p_tipo 
    AND chave = p_chave;
END;
$$;


ALTER FUNCTION "public"."incrementar_frequencia_memoria"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."learn_or_reinforce_fact"("p_user_id" "uuid", "p_memory_type" "text", "p_content" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_tags" "text"[] DEFAULT '{}'::"text"[], "p_source" "text" DEFAULT 'system'::"text", "p_query_embedding" "public"."vector" DEFAULT NULL::"public"."vector") RETURNS TABLE("id" "uuid", "reinforcement_count" integer, "confidence" numeric, "created_new" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing RECORD;
  v_new_count INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_memory_type IS NULL OR btrim(p_memory_type) = '' THEN
    RAISE EXCEPTION 'p_memory_type is required';
  END IF;

  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'p_content is required';
  END IF;

  IF p_query_embedding IS NOT NULL THEN
    SELECT
      m.id,
      m.content,
      m.metadata,
      m.tags,
      m.reinforcement_count
    INTO v_existing
    FROM public.agent_memory_entries AS m
    WHERE m.user_id = p_user_id
      AND m.memory_type = p_memory_type
      AND m.embedding IS NOT NULL
      AND (m.expires_at IS NULL OR m.expires_at > now())
      AND 1 - (m.embedding <=> p_query_embedding) >= 0.85
    ORDER BY m.embedding <=> p_query_embedding
    LIMIT 1;
  ELSE
    SELECT
      m.id,
      m.content,
      m.metadata,
      m.tags,
      m.reinforcement_count
    INTO v_existing
    FROM public.agent_memory_entries AS m
    WHERE m.user_id = p_user_id
      AND m.memory_type = p_memory_type
      AND lower(trim(m.content)) = lower(trim(p_content))
      AND (m.expires_at IS NULL OR m.expires_at > now())
    ORDER BY m.updated_at DESC
    LIMIT 1;
  END IF;

  IF v_existing.id IS NOT NULL THEN
    v_new_count := COALESCE(v_existing.reinforcement_count, 1) + 1;

    UPDATE public.agent_memory_entries AS m
    SET
      content = CASE
        WHEN char_length(p_content) >= char_length(COALESCE(v_existing.content, '')) THEN p_content
        ELSE v_existing.content
      END,
      metadata = COALESCE(v_existing.metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
      tags = ARRAY(
        SELECT DISTINCT tag
        FROM unnest(COALESCE(v_existing.tags, '{}'::text[]) || COALESCE(p_tags, '{}'::text[])) AS tag
        WHERE tag IS NOT NULL AND btrim(tag) <> ''
      ),
      embedding = COALESCE(p_query_embedding, m.embedding),
      source = COALESCE(NULLIF(p_source, ''), m.source),
      reinforcement_count = v_new_count,
      confidence = public.calculate_agent_memory_confidence(v_new_count),
      last_reinforced_at = now(),
      updated_at = now()
    WHERE m.id = v_existing.id
    RETURNING
      m.id,
      m.reinforcement_count,
      m.confidence
    INTO id, reinforcement_count, confidence;

    created_new := false;
    RETURN NEXT;
    RETURN;
  END IF;

  v_expires_at := CASE
    WHEN p_memory_type = 'pattern' THEN now() + INTERVAL '90 days'
    ELSE NULL
  END;

  INSERT INTO public.agent_memory_entries (
    user_id,
    memory_type,
    content,
    metadata,
    tags,
    embedding,
    source,
    expires_at,
    reinforcement_count,
    confidence,
    last_reinforced_at
  ) VALUES (
    p_user_id,
    p_memory_type,
    p_content,
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_tags, '{}'::text[]),
    p_query_embedding,
    COALESCE(NULLIF(p_source, ''), 'system'),
    v_expires_at,
    1,
    public.calculate_agent_memory_confidence(1),
    now()
  )
  RETURNING
    agent_memory_entries.id,
    agent_memory_entries.reinforcement_count,
    agent_memory_entries.confidence
  INTO id, reinforcement_count, confidence;

  created_new := true;
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."learn_or_reinforce_fact"("p_user_id" "uuid", "p_memory_type" "text", "p_content" "text", "p_metadata" "jsonb", "p_tags" "text"[], "p_source" "text", "p_query_embedding" "public"."vector") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_bill_as_paid"("p_bill_id" "uuid", "p_user_id" "uuid", "p_paid_amount" numeric, "p_payment_method" character varying, "p_account_from_id" "uuid" DEFAULT NULL::"uuid", "p_confirmation_number" character varying DEFAULT NULL::character varying, "p_payment_proof_url" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_bill RECORD;
  v_payment_history_id UUID;
  v_total_paid DECIMAL;
  v_new_status VARCHAR(20);
  result JSONB;
BEGIN
  -- Buscar conta
  SELECT * INTO v_bill FROM payable_bills WHERE id = p_bill_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta não encontrada';
  END IF;
  
  -- Registrar no histórico
  INSERT INTO bill_payment_history (
    bill_id, user_id, payment_date, amount_paid, payment_method,
    account_from_id, confirmation_number, payment_proof_url, notes
  ) VALUES (
    p_bill_id, p_user_id, NOW(), p_paid_amount, p_payment_method,
    p_account_from_id, p_confirmation_number, p_payment_proof_url, p_notes
  ) RETURNING id INTO v_payment_history_id;
  
  -- Calcular total pago
  SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
  FROM bill_payment_history
  WHERE bill_id = p_bill_id;
  
  -- Determinar novo status
  IF v_total_paid >= v_bill.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;
  
  -- Atualizar conta
  UPDATE payable_bills
  SET 
    status = v_new_status,
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END,
    paid_amount = v_total_paid,
    payment_method = p_payment_method,
    payment_account_id = p_account_from_id,
    updated_at = NOW()
  WHERE id = p_bill_id;
  
  -- Retornar resultado
  result := JSONB_BUILD_OBJECT(
    'success', true,
    'payment_history_id', v_payment_history_id,
    'bill_id', p_bill_id,
    'amount_paid', p_paid_amount,
    'total_paid', v_total_paid,
    'status', v_new_status,
    'remaining', v_bill.amount - v_total_paid
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."mark_bill_as_paid"("p_bill_id" "uuid", "p_user_id" "uuid", "p_paid_amount" numeric, "p_payment_method" character varying, "p_account_from_id" "uuid", "p_confirmation_number" character varying, "p_payment_proof_url" "text", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_bill_as_paid"("p_bill_id" "uuid", "p_user_id" "uuid", "p_paid_amount" numeric, "p_payment_method" character varying, "p_account_from_id" "uuid", "p_confirmation_number" character varying, "p_payment_proof_url" "text", "p_notes" "text") IS 'Marca conta como paga (total/parcial) e registra histórico';



CREATE OR REPLACE FUNCTION "public"."mark_reminder_failed"("p_reminder_id" "uuid", "p_error_message" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE bill_reminders
  SET status = 'failed',
      retry_count = LEAST(COALESCE(retry_count,0) + 1, 3),
      error_message = p_error_message
  WHERE id = p_reminder_id;
END;
$$;


ALTER FUNCTION "public"."mark_reminder_failed"("p_reminder_id" "uuid", "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_reminder_sent"("p_reminder_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE bill_reminders
  SET status = 'sent',
      sent_at = now(),
      error_message = NULL
  WHERE id = p_reminder_id;
END;
$$;


ALTER FUNCTION "public"."mark_reminder_sent"("p_reminder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_legacy_badges_to_badge_progress"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."migrate_legacy_badges_to_badge_progress"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."migrate_legacy_badges_to_badge_progress"("p_user_id" "uuid") IS 'Copia badges legados desbloqueados para badge_progress preservando unlocked_at para backfill.';



CREATE OR REPLACE FUNCTION "public"."now_brasilia"() RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    AS $$
  SELECT NOW() AT TIME ZONE 'America/Sao_Paulo';
$$;


ALTER FUNCTION "public"."now_brasilia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_gamification_event"("p_user_id" "uuid", "p_event" "text", "p_activity_date" "date" DEFAULT CURRENT_DATE) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."process_gamification_event"("p_user_id" "uuid", "p_event" "text", "p_activity_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_gamification_event"("p_user_id" "uuid", "p_event" "text", "p_activity_date" "date") IS 'Processa um evento canônico de gamificação: concede XP, atualiza streak diário e sincroniza badge_progress.';



CREATE OR REPLACE FUNCTION "public"."process_whatsapp_command"("p_user_id" "uuid", "p_phone" "text", "p_content" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE
  v_command TEXT;
  v_response TEXT;
  v_total NUMERIC;
  v_count INT;
BEGIN
  -- Extrair comando (primeira palavra)
  v_command := LOWER(SPLIT_PART(p_content, ' ', 1));
  
  -- Processar comando
  CASE v_command
    WHEN 'saldo' THEN
      -- Buscar saldo total
      SELECT COALESCE(SUM(current_balance), 0) INTO v_total
      FROM accounts
      WHERE user_id = p_user_id;
      
      v_response := E'💰 *Seu Saldo Total*\n\nR$ ' || TO_CHAR(v_total, 'FM999G999G990D00') || E'\n\n_Atualizado agora_';
    
    WHEN 'contas' THEN
      -- Contar contas pendentes
      SELECT COUNT(*) INTO v_count
      FROM payable_bills
      WHERE user_id = p_user_id
        AND status = 'pending'
        AND due_date >= CURRENT_DATE;
      
      v_response := E'📋 *Contas a Pagar*\n\nVocê tem ' || v_count || E' conta(s) pendente(s).\n\n_Digite "contas detalhes" para ver a lista completa_';
    
    WHEN 'gastos' THEN
      -- Total de gastos do mês
      SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total
      FROM transactions
      WHERE user_id = p_user_id
        AND type = 'expense'
        AND date >= DATE_TRUNC('month', CURRENT_DATE);
      
      v_response := E'💸 *Gastos do Mês*\n\nTotal: R$ ' || TO_CHAR(v_total, 'FM999G999G990D00') || E'\n\n_Mês atual_';
    
    WHEN 'ajuda', 'help' THEN
      v_response := E'🤖 *Comandos Disponíveis*\n\n' ||
                    E'• *saldo* - Ver saldo total\n' ||
                    E'• *contas* - Contas a pagar\n' ||
                    E'• *gastos* - Gastos do mês\n' ||
                    E'• *ajuda* - Esta mensagem\n\n' ||
                    E'_Mais comandos em breve!_';
    
    ELSE
      v_response := E'❓ Comando não reconhecido: ' || v_command || E'\n\nDigite *ajuda* para ver os comandos disponíveis.';
  END CASE;
  
  -- Enviar resposta via UAZAPI
  PERFORM net.http_post(
    url := 'https://lamusic.uazapi.com/send/text',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'token', '0a5d59d3-f368-419b-b9e8-701375814522'
    ),
    body := jsonb_build_object(
      'number', p_phone,
      'text', v_response
    )
  );
  
  RETURN v_response;
END;
$_$;


ALTER FUNCTION "public"."process_whatsapp_command"("p_user_id" "uuid", "p_phone" "text", "p_content" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_investment_from_ledger"("p_investment_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."recalculate_investment_from_ledger"("p_investment_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_goals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "target_amount" numeric(10,2) NOT NULL,
    "current_amount" numeric(10,2) DEFAULT 0,
    "deadline" "date",
    "category_id" "uuid",
    "period_type" "text",
    "period_start" "date",
    "period_end" "date",
    "status" "text" DEFAULT 'active'::"text",
    "streak_count" integer DEFAULT 0,
    "best_streak" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "priority" "text" DEFAULT 'medium'::"text",
    "start_date" "date" DEFAULT CURRENT_DATE,
    "target_date" "date",
    "target_percent" numeric,
    "contribution_frequency" "text",
    "contribution_day" integer,
    "notify_milestones" boolean DEFAULT true,
    "notify_contribution" boolean DEFAULT false,
    "notify_delay" boolean DEFAULT false,
    "is_completed" boolean DEFAULT false,
    "category" "text",
    CONSTRAINT "financial_goals_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['travel'::"text", 'house'::"text", 'car'::"text", 'emergency'::"text", 'education'::"text", 'retirement'::"text", 'general'::"text"])))),
    CONSTRAINT "financial_goals_check" CHECK (((("goal_type" = 'savings'::"text") AND ("deadline" IS NOT NULL) AND ("category_id" IS NULL)) OR (("goal_type" = 'spending_limit'::"text") AND ("category_id" IS NOT NULL) AND ("period_type" IS NOT NULL)))),
    CONSTRAINT "financial_goals_contribution_day_check" CHECK ((("contribution_day" >= 1) AND ("contribution_day" <= 28))),
    CONSTRAINT "financial_goals_contribution_frequency_check" CHECK (("contribution_frequency" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "financial_goals_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['savings'::"text", 'spending_limit'::"text"]))),
    CONSTRAINT "financial_goals_period_type_check" CHECK (("period_type" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "financial_goals_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "financial_goals_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'exceeded'::"text", 'archived'::"text"]))),
    CONSTRAINT "financial_goals_target_amount_check" CHECK (("target_amount" > (0)::numeric))
);


ALTER TABLE "public"."financial_goals" OWNER TO "postgres";


COMMENT ON TABLE "public"."financial_goals" IS 'Fonte de verdade ÚNICA para metas financeiras (economia e controle de gastos). savings_goals é legado.';



COMMENT ON COLUMN "public"."financial_goals"."goal_type" IS 'Tipo: savings (economia) ou spending_limit (controle gastos)';



COMMENT ON COLUMN "public"."financial_goals"."streak_count" IS 'Meses consecutivos cumprindo a meta';



COMMENT ON COLUMN "public"."financial_goals"."best_streak" IS 'Recorde pessoal de streak';



COMMENT ON COLUMN "public"."financial_goals"."category" IS 'Categoria semântica da meta de economia legada (travel, house, etc).';



CREATE OR REPLACE FUNCTION "public"."refresh_spending_goal"("goal_row" "public"."financial_goals") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_spending_goal"("goal_row" "public"."financial_goals") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_spending_goals_by_category"("p_user_id" "uuid", "p_category_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_spending_goals_by_category"("p_user_id" "uuid", "p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_bill_tags"("p_bill_id" "uuid", "p_tag_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_tag_ids IS NULL THEN
    RAISE EXCEPTION 'tag ids array must not be null'
      USING ERRCODE = '22004';
  END IF;

  PERFORM 1
  FROM public.payable_bills b
  WHERE b.id = p_bill_id
    AND b.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bill not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_tag_ids) AS x(tag_id)
    WHERE x.tag_id IS NULL
  ) THEN
    RAISE EXCEPTION 'tag ids must not be null'
      USING ERRCODE = '23502';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (SELECT DISTINCT unnest(p_tag_ids) AS tag_id) x
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.tags tg
      WHERE tg.id = x.tag_id
        AND tg.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'invalid tag id or access denied'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.bill_tags
  WHERE bill_id = p_bill_id;

  INSERT INTO public.bill_tags (bill_id, tag_id)
  SELECT p_bill_id, x.tag_id
  FROM (SELECT DISTINCT unnest(p_tag_ids) AS tag_id) x
  WHERE x.tag_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."replace_bill_tags"("p_bill_id" "uuid", "p_tag_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_credit_card_transaction_tags"("p_credit_card_transaction_id" "uuid", "p_tag_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_tag_ids IS NULL THEN
    RAISE EXCEPTION 'tag ids array must not be null'
      USING ERRCODE = '22004';
  END IF;

  PERFORM 1
  FROM public.credit_card_transactions cct
  INNER JOIN public.credit_cards cc ON cc.id = cct.credit_card_id
  WHERE cct.id = p_credit_card_transaction_id
    AND cc.user_id = auth.uid()
  FOR UPDATE OF cct;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit card transaction not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_tag_ids) AS x(tag_id)
    WHERE x.tag_id IS NULL
  ) THEN
    RAISE EXCEPTION 'tag ids must not be null'
      USING ERRCODE = '23502';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (SELECT DISTINCT unnest(p_tag_ids) AS tag_id) x
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.tags tg
      WHERE tg.id = x.tag_id
        AND tg.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'invalid tag id or access denied'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.credit_card_transaction_tags
  WHERE credit_card_transaction_id = p_credit_card_transaction_id;

  INSERT INTO public.credit_card_transaction_tags (credit_card_transaction_id, tag_id)
  SELECT p_credit_card_transaction_id, x.tag_id
  FROM (SELECT DISTINCT unnest(p_tag_ids) AS tag_id) x
  WHERE x.tag_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."replace_credit_card_transaction_tags"("p_credit_card_transaction_id" "uuid", "p_tag_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_transaction_tags"("p_transaction_id" "uuid", "p_tag_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF p_tag_ids IS NULL THEN
    RAISE EXCEPTION 'tag ids array must not be null'
      USING ERRCODE = '22004';
  END IF;

  PERFORM 1
  FROM public.transactions t
  WHERE t.id = p_transaction_id
    AND t.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'transaction not found or access denied'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_tag_ids) AS x(tag_id)
    WHERE x.tag_id IS NULL
  ) THEN
    RAISE EXCEPTION 'tag ids must not be null'
      USING ERRCODE = '23502';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (SELECT DISTINCT unnest(p_tag_ids) AS tag_id) x
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.tags tg
      WHERE tg.id = x.tag_id
        AND tg.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'invalid tag id or access denied'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.transaction_tags
  WHERE transaction_id = p_transaction_id;

  INSERT INTO public.transaction_tags (transaction_id, tag_id)
  SELECT p_transaction_id, x.tag_id
  FROM (SELECT DISTINCT unnest(p_tag_ids) AS tag_id) x
  WHERE x.tag_id IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."replace_transaction_tags"("p_transaction_id" "uuid", "p_tag_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reschedule_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_override_start_at" timestamp with time zone, "p_override_end_at" timestamp with time zone, "p_title_override" "text" DEFAULT NULL::"text", "p_description_override" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_occ_key text;
  v_override_id uuid;
  v_has_rule boolean;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_events e
    WHERE e.id = p_event_id AND e.user_id = v_owner_uid AND e.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  ) INTO v_has_rule;

  IF NOT v_has_rule THEN
    RAISE EXCEPTION 'recurrence_required_for_occurrence_override';
  END IF;

  v_occ_key := public.calendar_occurrence_key(p_event_id, p_original_start_at);

  INSERT INTO public.calendar_event_occurrence_overrides (
    event_id,
    occurrence_key,
    original_start_at,
    override_start_at,
    override_end_at,
    status,
    title_override,
    description_override,
    is_cancelled
  ) VALUES (
    p_event_id,
    v_occ_key,
    p_original_start_at,
    p_override_start_at,
    p_override_end_at,
    NULL,
    p_title_override,
    p_description_override,
    false
  )
  ON CONFLICT (event_id, occurrence_key) DO UPDATE SET
    original_start_at = EXCLUDED.original_start_at,
    override_start_at = EXCLUDED.override_start_at,
    override_end_at = EXCLUDED.override_end_at,
    title_override = EXCLUDED.title_override,
    description_override = EXCLUDED.description_override,
    is_cancelled = false,
    updated_at = now()
  RETURNING id INTO v_override_id;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    occurrence_override_id,
    occurrence_key,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    p_event_id,
    v_override_id,
    v_occ_key,
    'ticktick',
    'upsert_occurrence_override',
    'occ:upsert:' || p_event_id::text || ':' || v_occ_key,
    'pending'
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    occurrence_override_id = EXCLUDED.occurrence_override_id,
    occurrence_key = EXCLUDED.occurrence_key,
    status = 'pending',
    updated_at = now(),
    last_error = NULL;

  PERFORM public.calendar_populate_recurring_reminder_schedule(
    p_event_id,
    v_owner_uid,
    clock_timestamp(),
    clock_timestamp() + interval '90 days'
  );

  RETURN v_override_id;
END;
$$;


ALTER FUNCTION "public"."reschedule_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_override_start_at" timestamp with time zone, "p_override_end_at" timestamp with time zone, "p_title_override" "text", "p_description_override" "text", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reschedule_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_override_start_at" timestamp with time zone, "p_override_end_at" timestamp with time zone, "p_title_override" "text", "p_description_override" "text", "p_user_id" "uuid") IS 'Persist reschedule for one recurring occurrence; enqueues TickTick job (V1 worker skips as unsupported). Refreshes recurring reminder schedule.';



CREATE OR REPLACE FUNCTION "public"."save_memory_episode"("p_user_id" "uuid", "p_summary" "text", "p_importance" numeric DEFAULT 0.20, "p_source" "text" DEFAULT 'system'::"text", "p_outcome" "text" DEFAULT NULL::"text", "p_entities" "jsonb" DEFAULT '{}'::"jsonb", "p_context_window_hours" integer DEFAULT 48, "p_expires_in_hours" integer DEFAULT 168) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id UUID;
  v_importance NUMERIC(3, 2);
  v_context_window_hours INTEGER;
  v_expires_in_hours INTEGER;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'not allowed to write episodes for another user';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_summary IS NULL OR btrim(p_summary) = '' THEN
    RAISE EXCEPTION 'p_summary is required';
  END IF;

  v_importance := LEAST(1.0, GREATEST(0.0, COALESCE(p_importance, 0.20)));
  v_context_window_hours := GREATEST(1, COALESCE(p_context_window_hours, 48));
  v_expires_in_hours := GREATEST(1, COALESCE(p_expires_in_hours, 168));

  INSERT INTO public.agent_memory_episodes (
    user_id,
    summary,
    importance,
    source,
    outcome,
    entities,
    context_window_hours,
    expires_at
  ) VALUES (
    p_user_id,
    btrim(p_summary),
    v_importance,
    COALESCE(NULLIF(btrim(p_source), ''), 'system'),
    NULLIF(btrim(COALESCE(p_outcome, '')), ''),
    COALESCE(p_entities, '{}'::jsonb),
    v_context_window_hours,
    now() + make_interval(hours => v_expires_in_hours)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."save_memory_episode"("p_user_id" "uuid", "p_summary" "text", "p_importance" numeric, "p_source" "text", "p_outcome" "text", "p_entities" "jsonb", "p_context_window_hours" integer, "p_expires_in_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_bill_reminders"("p_bill_id" "uuid", "p_user_id" "uuid", "p_reminders" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_reminder jsonb;
  v_days_before integer;
  v_time time;
  v_channel text;
  v_reminder_type text;
  v_reminder_date date;
  v_bill_due_date date;
BEGIN
  SELECT due_date INTO v_bill_due_date
  FROM payable_bills
  WHERE id = p_bill_id AND user_id = p_user_id;

  IF v_bill_due_date IS NULL THEN
    RAISE EXCEPTION 'Conta não encontrada ou não pertence ao usuário';
  END IF;

  DELETE FROM bill_reminders
  WHERE bill_id = p_bill_id AND status = 'pending';

  FOR v_reminder IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_reminders, '[]'::jsonb))
  LOOP
    v_days_before := COALESCE((v_reminder->>'days_before')::integer, 0);
    v_time := COALESCE((v_reminder->>'time')::time, '09:00:00'::time);
    v_channel := COALESCE(NULLIF(v_reminder->>'channel', ''), 'whatsapp');
    v_reminder_type := CASE
      WHEN v_channel IN ('whatsapp', 'email', 'push', 'sms') THEN v_channel
      ELSE 'push'
    END;
    v_reminder_date := (v_bill_due_date - (v_days_before || ' days')::interval)::date;

    IF v_reminder_date > current_date_brasilia()
       OR (v_reminder_date = current_date_brasilia() AND v_time > current_time_brasilia()) THEN
      IF NOT EXISTS (
        SELECT 1
        FROM bill_reminders existing_reminder
        WHERE existing_reminder.bill_id = p_bill_id
          AND existing_reminder.reminder_date = v_reminder_date
          AND existing_reminder.reminder_time = v_time
          AND existing_reminder.channel = v_channel
      ) THEN
        INSERT INTO bill_reminders (
          bill_id,
          user_id,
          reminder_date,
          reminder_time,
          reminder_type,
          sent_at,
          status,
          error_message,
          channel,
          retry_count,
          metadata,
          days_before,
          scheduled_time
        ) VALUES (
          p_bill_id,
          p_user_id,
          v_reminder_date,
          v_time,
          v_reminder_type,
          NULL,
          'pending',
          NULL,
          v_channel,
          0,
          jsonb_build_object('source', 'schedule_bill_reminders'),
          v_days_before,
          v_time
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."schedule_bill_reminders"("p_bill_id" "uuid", "p_user_id" "uuid", "p_reminders" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_agent_memories"("p_user_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision DEFAULT 0.5, "p_match_count" integer DEFAULT 5, "p_memory_types" "text"[] DEFAULT NULL::"text"[]) RETURNS TABLE("id" "uuid", "memory_type" "text", "content" "text", "metadata" "jsonb", "tags" "text"[], "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT
    m.id, m.memory_type, m.content, m.metadata, m.tags,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM agent_memory_entries m
  WHERE m.user_id = p_user_id
    AND m.embedding IS NOT NULL
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND (p_memory_types IS NULL OR m.memory_type = ANY(p_memory_types))
    AND 1 - (m.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;


ALTER FUNCTION "public"."search_agent_memories"("p_user_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer, "p_memory_types" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_proactive_whatsapp_notifications"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_connection RECORD;
  v_reminder RECORD;
  v_message text;
  v_phone text;
  v_request_id bigint;
  v_connections_scanned integer := 0;
  v_connections_skipped_missing_phone integer := 0;
  v_connections_skipped_missing_token integer := 0;
  v_reminders_seen integer := 0;
  v_sent integer := 0;
  v_failed integer := 0;
BEGIN
  FOR v_connection IN
    SELECT
      wc.user_id,
      wc.phone_number,
      wc.instance_token
    FROM public.whatsapp_connections wc
    WHERE wc.connected = true
      AND wc.status = 'connected'
  LOOP
    v_connections_scanned := v_connections_scanned + 1;

    IF v_connection.instance_token IS NULL OR btrim(v_connection.instance_token) = '' THEN
      v_connections_skipped_missing_token := v_connections_skipped_missing_token + 1;
      CONTINUE;
    END IF;

    v_phone := regexp_replace(coalesce(v_connection.phone_number, ''), '\D', '', 'g');
    IF v_phone = '' THEN
      v_connections_skipped_missing_phone := v_connections_skipped_missing_phone + 1;
      CONTINUE;
    ELSIF length(v_phone) = 11 THEN
      v_phone := '55' || v_phone;
    ELSIF length(v_phone) = 12 AND left(v_phone, 1) = '0' THEN
      v_phone := '55' || substring(v_phone FROM 2);
    END IF;

    FOR v_reminder IN
      SELECT *
      FROM public.get_pending_reminders() pr
      WHERE pr.user_id = v_connection.user_id
    LOOP
      v_reminders_seen := v_reminders_seen + 1;

      v_message := concat_ws(
        E'\n',
        '━━━━━━━━━━━━━━━━━━━',
        '🔔 *Lembrete Ana Clara*',
        '',
        format('Olá %s! 👋', coalesce(nullif(btrim(v_reminder.full_name), ''), '')),
        '',
        CASE
          WHEN v_reminder.days_before = 0 THEN '🔴 HOJE você tem uma conta a pagar:'
          WHEN v_reminder.days_before = 1 THEN '🟡 Amanhã você tem uma conta a pagar:'
          ELSE format('🟢 Daqui %s dias você tem uma conta a pagar:', v_reminder.days_before)
        END,
        '',
        format('📄 *%s*', coalesce(v_reminder.description, 'Conta a pagar')),
        format(
          '💰 Valor: *R$ %s*',
          trim(to_char(coalesce(v_reminder.amount, 0)::numeric, 'FM999G999G999G990D00'))
        ),
        format('📅 Vencimento: *%s*', to_char(v_reminder.due_date, 'DD/MM/YYYY')),
        CASE
          WHEN v_reminder.provider_name IS NOT NULL AND btrim(v_reminder.provider_name) <> ''
            THEN format('🏢 Fornecedor: %s', v_reminder.provider_name)
          ELSE NULL
        END,
        '',
        '⏰ *Não esqueça!*',
        '━━━━━━━━━━━━━━━━━━━',
        '💡 _Responda "pago" para marcar como paga_',
        '━━━━━━━━━━━━━━━━━━━'
      );

      BEGIN
        SELECT net.http_post(
          url := 'https://lamusic.uazapi.com/send/text',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'token', v_connection.instance_token
          ),
          body := jsonb_build_object(
            'number', v_phone,
            'text', v_message
          )
        )
        INTO v_request_id;

        PERFORM public.mark_reminder_sent(p_reminder_id := v_reminder.id);
        v_sent := v_sent + 1;
      EXCEPTION
        WHEN OTHERS THEN
          PERFORM public.mark_reminder_failed(
            p_reminder_id := v_reminder.id,
            p_error_message := SQLERRM
          );
          v_failed := v_failed + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'connections_scanned', v_connections_scanned,
    'connections_skipped_missing_phone', v_connections_skipped_missing_phone,
    'connections_skipped_missing_token', v_connections_skipped_missing_token,
    'reminders_seen', v_reminders_seen,
    'sent', v_sent,
    'failed', v_failed
  );
END;
$_$;


ALTER FUNCTION "public"."send_proactive_whatsapp_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."send_proactive_whatsapp_notifications"() IS 'Cron entrypoint for direct SQL WhatsApp bill reminders. Iterates only canonical whatsapp_connections rows where connected = true and status = connected, skips blank phone/token rows, uses only row instance_token, sends directly via net.http_post, and does not reference whatsapp_connection_status.';



CREATE OR REPLACE FUNCTION "public"."set_calendar_event_recurrence"("p_event_id" "uuid", "p_remove_recurrence" boolean DEFAULT false, "p_frequency" "public"."calendar_recurrence_frequency" DEFAULT NULL::"public"."calendar_recurrence_frequency", "p_interval_value" integer DEFAULT 1, "p_by_weekday" "text"[] DEFAULT NULL::"text"[], "p_by_monthday" integer[] DEFAULT NULL::integer[], "p_starts_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_until_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_count_limit" integer DEFAULT NULL::integer, "p_timezone" "text" DEFAULT NULL::"text", "p_confirm_drop_overrides" boolean DEFAULT false, "p_confirm_drop_reminders" boolean DEFAULT false, "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  ce RECORD;
  r_existing RECORD;
  v_rule_exists boolean := false;
  v_has_overrides boolean;
  v_has_reminders boolean;
  v_tz text;
  v_starts timestamptz;
  v_sig_new text;
  v_sig_old text;
  v_sync_idempotency_key text;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  SELECT * INTO ce
  FROM public.calendar_events e
  WHERE e.id = p_event_id AND e.user_id = v_owner_uid AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_occurrence_overrides o WHERE o.event_id = p_event_id
  ) INTO v_has_overrides;

  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_reminders cr WHERE cr.event_id = p_event_id
  ) OR EXISTS (
    SELECT 1 FROM public.calendar_reminder_schedule s WHERE s.event_id = p_event_id
  ) INTO v_has_reminders;

  SELECT * INTO r_existing FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id;
  v_rule_exists := FOUND;

  IF p_remove_recurrence THEN
    v_sig_old := CASE
      WHEN v_rule_exists THEN public._calendar_recurrence_rule_signature(
        r_existing.frequency,
        r_existing.interval_value,
        r_existing.by_weekday,
        r_existing.by_monthday,
        r_existing.starts_at,
        r_existing.until_at,
        r_existing.count_limit,
        r_existing.timezone
      )
      ELSE 'clear'
    END;

    IF v_has_overrides AND NOT p_confirm_drop_overrides THEN
      RAISE EXCEPTION 'occurrence_overrides_block_structural_change';
    END IF;
    IF v_has_overrides AND p_confirm_drop_overrides THEN
      DELETE FROM public.calendar_event_occurrence_overrides WHERE event_id = p_event_id;
    END IF;
    DELETE FROM public.calendar_event_recurrence_rules WHERE event_id = p_event_id;

    v_sync_idempotency_key := 'sync:' || p_event_id::text || ':upsert_event:recurrence:clear:' || v_sig_old;
    INSERT INTO public.calendar_sync_jobs (
      user_id,
      event_id,
      provider,
      job_type,
      idempotency_key,
      status
    ) VALUES (
      v_owner_uid,
      p_event_id,
      'ticktick',
      'upsert_event',
      v_sync_idempotency_key,
      'pending'
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      status = 'pending',
      updated_at = now(),
      last_error = NULL;
    RETURN;
  END IF;

  IF p_frequency IS NULL THEN
    RAISE EXCEPTION 'frequency_required';
  END IF;

  IF p_interval_value IS NULL OR p_interval_value < 1 THEN
    RAISE EXCEPTION 'invalid_interval_value';
  END IF;

  v_tz := coalesce(nullif(trim(p_timezone), ''), nullif(trim(ce.timezone), ''), 'America/Sao_Paulo');
  v_starts := coalesce(p_starts_at, ce.start_at);

  v_sig_new := public._calendar_recurrence_rule_signature(
    p_frequency,
    p_interval_value,
    p_by_weekday,
    p_by_monthday,
    v_starts,
    p_until_at,
    p_count_limit,
    v_tz
  );

  IF v_rule_exists THEN
    v_sig_old := public._calendar_recurrence_rule_signature(
      r_existing.frequency,
      r_existing.interval_value,
      r_existing.by_weekday,
      r_existing.by_monthday,
      r_existing.starts_at,
      r_existing.until_at,
      r_existing.count_limit,
      r_existing.timezone
    );
    IF v_sig_old = v_sig_new THEN
      RETURN;
    END IF;
  END IF;

  IF NOT v_rule_exists AND v_has_reminders AND NOT p_confirm_drop_reminders THEN
    RAISE EXCEPTION 'reminders_block_recurrence_until_cleared';
  END IF;

  IF NOT v_rule_exists AND v_has_reminders AND p_confirm_drop_reminders THEN
    DELETE FROM public.calendar_reminder_schedule WHERE event_id = p_event_id;
    DELETE FROM public.calendar_event_reminders WHERE event_id = p_event_id;
  END IF;

  IF v_rule_exists AND v_has_overrides AND NOT p_confirm_drop_overrides THEN
    RAISE EXCEPTION 'occurrence_overrides_block_structural_change';
  END IF;

  IF v_rule_exists AND v_has_overrides AND p_confirm_drop_overrides THEN
    DELETE FROM public.calendar_event_occurrence_overrides WHERE event_id = p_event_id;
  END IF;

  INSERT INTO public.calendar_event_recurrence_rules (
    event_id,
    frequency,
    interval_value,
    by_weekday,
    by_monthday,
    starts_at,
    until_at,
    count_limit,
    timezone
  ) VALUES (
    p_event_id,
    p_frequency,
    p_interval_value,
    p_by_weekday,
    p_by_monthday,
    v_starts,
    p_until_at,
    p_count_limit,
    v_tz
  )
  ON CONFLICT (event_id) DO UPDATE SET
    frequency = EXCLUDED.frequency,
    interval_value = EXCLUDED.interval_value,
    by_weekday = EXCLUDED.by_weekday,
    by_monthday = EXCLUDED.by_monthday,
    starts_at = EXCLUDED.starts_at,
    until_at = EXCLUDED.until_at,
    count_limit = EXCLUDED.count_limit,
    timezone = EXCLUDED.timezone,
    updated_at = now();

  v_sync_idempotency_key := 'sync:' || p_event_id::text || ':upsert_event:recurrence:' || v_sig_new;
  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status
  ) VALUES (
    v_owner_uid,
    p_event_id,
    'ticktick',
    'upsert_event',
    v_sync_idempotency_key,
    'pending'
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    status = 'pending',
    updated_at = now(),
    last_error = NULL;
END;
$$;


ALTER FUNCTION "public"."set_calendar_event_recurrence"("p_event_id" "uuid", "p_remove_recurrence" boolean, "p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text", "p_confirm_drop_overrides" boolean, "p_confirm_drop_reminders" boolean, "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_calendar_event_recurrence"("p_event_id" "uuid", "p_remove_recurrence" boolean, "p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text", "p_confirm_drop_overrides" boolean, "p_confirm_drop_reminders" boolean, "p_user_id" "uuid") IS 'Upsert or remove recurrence rule; conservative blocks when overrides/reminders exist unless explicit confirm flags. Supports daily, weekly, monthly, and yearly.';



CREATE OR REPLACE FUNCTION "public"."set_calendar_event_reminders"("p_event_id" "uuid", "p_reminders" "jsonb" DEFAULT '[]'::"jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  e RECORD;
  v_existing_sig text;
  v_desired_sig text;
  v_elem jsonb;
  v_offset int;
  v_enabled boolean;
  v_kind calendar_reminder_kind;
  v_seen jsonb := '{}'::jsonb;
  v_key text;
  v_start_iso text;
  v_occ_key text;
  v_reminder_id uuid;
  v_fire_at timestamptz;
  v_parts text[] := ARRAY[]::text[];
  v_sorted text;
  v_sorted_parts text[];
  v_has_recurrence boolean;
BEGIN
  v_owner_uid := coalesce(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF p_reminders IS NULL OR jsonb_typeof(p_reminders) <> 'array' THEN
    RAISE EXCEPTION 'invalid_reminders_payload';
  END IF;

  SELECT ce.id, ce.start_at, ce.timezone, ce.deleted_at
  INTO e
  FROM public.calendar_events ce
  WHERE ce.id = p_event_id
    AND ce.user_id = v_owner_uid;

  IF NOT FOUND OR e.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  v_has_recurrence := EXISTS (
    SELECT 1 FROM public.calendar_event_recurrence_rules r WHERE r.event_id = p_event_id
  );

  v_start_iso := trim(both '"' FROM to_json(e.start_at)::text);
  v_occ_key := e.id::text || ':' || v_start_iso;

  SELECT coalesce(
    string_agg(
      cer.reminder_kind::text || ':' || cer.remind_offset_minutes::text,
      '|' ORDER BY cer.reminder_kind::text, cer.remind_offset_minutes
    ),
    ''
  )
  INTO v_existing_sig
  FROM public.calendar_event_reminders cer
  WHERE cer.event_id = p_event_id
    AND cer.enabled = true;

  v_parts := ARRAY[]::text[];
  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_reminders)
  LOOP
    IF jsonb_typeof(v_elem) <> 'object' THEN
      RAISE EXCEPTION 'invalid_reminders_item';
    END IF;

    v_enabled := coalesce((v_elem->>'enabled')::boolean, true);
    IF NOT v_enabled THEN
      CONTINUE;
    END IF;

    IF v_elem->'remind_offset_minutes' IS NULL
      OR jsonb_typeof(v_elem->'remind_offset_minutes') <> 'number' THEN
      RAISE EXCEPTION 'remind_offset_minutes_required';
    END IF;

    v_offset := (v_elem->>'remind_offset_minutes')::int;
    IF v_offset < 0 THEN
      RAISE EXCEPTION 'invalid_remind_offset';
    END IF;

    BEGIN
      v_kind := coalesce(
        nullif(trim(v_elem->>'reminder_kind'), ''),
        'default'
      )::calendar_reminder_kind;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'invalid_reminder_kind';
    END;

    v_key := v_kind::text || ':' || v_offset::text;
    IF v_seen ? v_key THEN
      CONTINUE;
    END IF;
    v_seen := v_seen || jsonb_build_object(v_key, true);
    v_parts := array_append(v_parts, v_key);
  END LOOP;

  SELECT coalesce(string_agg(p, '|' ORDER BY p), '')
  INTO v_desired_sig
  FROM unnest(v_parts) AS u(p);

  IF v_existing_sig = v_desired_sig THEN
    IF v_has_recurrence THEN
      PERFORM public.calendar_populate_recurring_reminder_schedule(
        p_event_id,
        v_owner_uid,
        clock_timestamp(),
        clock_timestamp() + interval '90 days'
      );
    END IF;
    RETURN;
  END IF;

  DELETE FROM public.calendar_event_reminders cer
  WHERE cer.event_id = p_event_id;

  IF v_desired_sig = '' THEN
    RETURN;
  END IF;

  SELECT array_agg(x ORDER BY x)
  INTO v_sorted_parts
  FROM unnest(v_parts) AS t(x);

  FOREACH v_sorted IN ARRAY v_sorted_parts
  LOOP
    v_kind := split_part(v_sorted, ':', 1)::calendar_reminder_kind;
    v_offset := split_part(v_sorted, ':', 2)::int;

    INSERT INTO public.calendar_event_reminders (
      event_id,
      reminder_kind,
      remind_offset_minutes,
      channel_policy,
      enabled
    ) VALUES (
      p_event_id,
      v_kind,
      v_offset,
      'user_preference',
      true
    )
    RETURNING id INTO v_reminder_id;

    IF NOT v_has_recurrence THEN
      v_fire_at := e.start_at - (v_offset * interval '1 minute');

      INSERT INTO public.calendar_reminder_schedule (
        event_id,
        reminder_id,
        occurrence_key,
        fire_at,
        channel,
        idempotency_key,
        delivery_status
      ) VALUES (
        p_event_id,
        v_reminder_id,
        v_occ_key,
        v_fire_at,
        'whatsapp'::calendar_reminder_channel,
        v_reminder_id::text || ':' || v_occ_key || ':whatsapp',
        'pending'
      );
    END IF;
  END LOOP;

  IF v_has_recurrence THEN
    PERFORM public.calendar_populate_recurring_reminder_schedule(
      p_event_id,
      v_owner_uid,
      clock_timestamp(),
      clock_timestamp() + interval '90 days'
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."set_calendar_event_reminders"("p_event_id" "uuid", "p_reminders" "jsonb", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_calendar_event_reminders"("p_event_id" "uuid", "p_reminders" "jsonb", "p_user_id" "uuid") IS 'V1 semantic replace for event reminders (whatsapp schedule rows). Recurring events: reminder rows + sliding-window schedule via calendar_populate_recurring_reminder_schedule (~90d), override-aware. Idempotent when enabled reminder multiset unchanged (recurring still refreshes schedule window).';



CREATE OR REPLACE FUNCTION "public"."set_calendar_event_status"("p_event_id" "uuid", "p_new_status" "public"."calendar_event_status", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_updated int;
  v_old_status calendar_event_status;
BEGIN
  v_owner_uid := COALESCE(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  IF p_new_status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_status_for_client_transition';
  END IF;

  SELECT e.status INTO v_old_status
  FROM public.calendar_events e
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  IF v_old_status = p_new_status THEN
    RETURN;
  END IF;

  UPDATE public.calendar_events e
  SET
    status = p_new_status,
    updated_at = now()
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  UPDATE public.calendar_reminder_schedule crs
  SET delivery_status = 'skipped'
  WHERE crs.event_id = p_event_id
    AND crs.delivery_status = 'pending';

  IF p_new_status = 'cancelled' THEN
    INSERT INTO public.calendar_sync_jobs (
      user_id,
      event_id,
      provider,
      job_type,
      idempotency_key,
      status,
      run_after
    ) VALUES (
      v_owner_uid,
      p_event_id,
      'ticktick',
      'delete_event',
      'sync:' || p_event_id::text || ':delete_event',
      'pending',
      now()
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
END;
$$;


ALTER FUNCTION "public"."set_calendar_event_status"("p_event_id" "uuid", "p_new_status" "public"."calendar_event_status", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_calendar_event_status"("p_event_id" "uuid", "p_new_status" "public"."calendar_event_status", "p_user_id" "uuid") IS 'Sets event status (completed/cancelled), skips pending reminders, enqueues TickTick delete_event on cancel (idempotent job key).';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_badge_tiers"("p_user_id" "uuid", "p_badge_id" "text", "p_progress" numeric, "p_bronze_target" numeric, "p_silver_target" numeric, "p_gold_target" numeric, "p_bronze_xp" integer, "p_silver_xp" integer, "p_gold_xp" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."sync_badge_tiers"("p_user_id" "uuid", "p_badge_id" "text", "p_progress" numeric, "p_bronze_target" numeric, "p_silver_target" numeric, "p_gold_target" numeric, "p_bronze_xp" integer, "p_silver_xp" integer, "p_gold_xp" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_financial_goal_savings_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_financial_goal_savings_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_gamification_badges"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."sync_gamification_badges"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_gamification_badges"("p_user_id" "uuid") IS 'Sincroniza badge_progress com as 15 conquistas oficiais do produto a partir de dados reais.';



CREATE OR REPLACE FUNCTION "public"."sync_investment_after_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.recalculate_investment_from_ledger(COALESCE(NEW.investment_id, OLD.investment_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."sync_investment_after_transaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_investment_prices"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Sync via Edge Function (Sprint 2)',
    'updated_count', 0,
    'timestamp', NOW()
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."sync_investment_prices"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_investment_prices"() IS 'Sincroniza preços. Implementação completa no Sprint 2.';



CREATE OR REPLACE FUNCTION "public"."sync_spending_goal_before_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."sync_spending_goal_before_write"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_user_activity_streak"("p_user_id" "uuid", "p_activity_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("current_streak" integer, "best_streak" integer, "last_activity_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."track_user_activity_streak"("p_user_id" "uuid", "p_activity_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."track_user_activity_streak"("p_user_id" "uuid", "p_activity_date" "date") IS 'Atualiza o streak global diário do usuário com base na última atividade registrada.';



CREATE OR REPLACE FUNCTION "public"."trigger_check_badges"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verificar badges de forma assíncrona (não bloqueia a transação)
  PERFORM check_and_unlock_badges(NEW.user_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_check_badges"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_xp_reward" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_already_unlocked BOOLEAN;
BEGIN
  -- Verificar se já está desbloqueada
  SELECT unlocked INTO v_already_unlocked
  FROM user_achievements
  WHERE user_id = p_user_id 
    AND achievement_id = p_achievement_id 
    AND tier = p_tier;
  
  -- Se já desbloqueada, retornar false
  IF v_already_unlocked THEN
    RETURN false;
  END IF;
  
  -- Desbloquear conquista
  UPDATE user_achievements
  SET 
    unlocked = true,
    unlocked_at = NOW(),
    xp_reward = p_xp_reward
  WHERE user_id = p_user_id 
    AND achievement_id = p_achievement_id 
    AND tier = p_tier;
  
  -- Se não existia, criar
  IF NOT FOUND THEN
    INSERT INTO user_achievements (
      user_id, achievement_id, tier, unlocked, unlocked_at, xp_reward
    ) VALUES (
      p_user_id, p_achievement_id, p_tier, true, NOW(), p_xp_reward
    );
  END IF;
  
  -- Adicionar XP de recompensa
  PERFORM add_xp_to_user(p_user_id, p_xp_reward);
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_xp_reward" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_xp_reward" integer) IS 'Desbloqueia uma conquista e concede XP de recompensa';



CREATE OR REPLACE FUNCTION "public"."unlock_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_xp_reward" integer) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_already_unlocked BOOLEAN;
BEGIN
  -- Verificar se já está desbloqueado
  SELECT unlocked INTO v_already_unlocked
  FROM badge_progress
  WHERE user_id = p_user_id 
    AND badge_id = p_badge_id 
    AND tier = p_tier;
  
  -- Se já desbloqueado, retornar false
  IF v_already_unlocked THEN
    RETURN false;
  END IF;
  
  -- Desbloquear badge
  UPDATE badge_progress
  SET 
    unlocked = true,
    unlocked_at = NOW(),
    xp_reward = p_xp_reward
  WHERE user_id = p_user_id 
    AND badge_id = p_badge_id 
    AND tier = p_tier;
  
  -- Se não existia, criar
  IF NOT FOUND THEN
    INSERT INTO badge_progress (
      user_id, badge_id, tier, unlocked, unlocked_at, xp_reward
    ) VALUES (
      p_user_id, p_badge_id, p_tier, true, NOW(), p_xp_reward
    );
  END IF;
  
  -- Adicionar XP de recompensa
  PERFORM add_xp_to_user(p_user_id, p_xp_reward);
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."unlock_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_xp_reward" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unlock_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_xp_reward" integer) IS 'Desbloqueia um badge e concede XP de recompensa';



CREATE OR REPLACE FUNCTION "public"."update_account_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- INSERT: Adiciona transação
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_paid = TRUE THEN
            IF NEW.type = 'income' THEN
                UPDATE accounts 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.account_id;
            ELSIF NEW.type = 'expense' THEN
                UPDATE accounts 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.account_id;
            ELSIF NEW.type = 'transfer' THEN
                -- Debita da conta origem
                UPDATE accounts 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.account_id;
                -- Credita na conta destino
                UPDATE accounts 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.transfer_to_account_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- UPDATE: Reverte antiga e aplica nova
    IF TG_OP = 'UPDATE' THEN
        -- Reverter transação antiga
        IF OLD.is_paid = TRUE THEN
            IF OLD.type = 'income' THEN
                UPDATE accounts 
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.account_id;
            ELSIF OLD.type = 'expense' THEN
                UPDATE accounts 
                SET current_balance = current_balance + OLD.amount
                WHERE id = OLD.account_id;
            ELSIF OLD.type = 'transfer' THEN
                UPDATE accounts 
                SET current_balance = current_balance + OLD.amount
                WHERE id = OLD.account_id;
                UPDATE accounts 
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.transfer_to_account_id;
            END IF;
        END IF;

        -- Aplicar transação nova
        IF NEW.is_paid = TRUE THEN
            IF NEW.type = 'income' THEN
                UPDATE accounts 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.account_id;
            ELSIF NEW.type = 'expense' THEN
                UPDATE accounts 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.account_id;
            ELSIF NEW.type = 'transfer' THEN
                UPDATE accounts 
                SET current_balance = current_balance - NEW.amount
                WHERE id = NEW.account_id;
                UPDATE accounts 
                SET current_balance = current_balance + NEW.amount
                WHERE id = NEW.transfer_to_account_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- DELETE: Reverte transação
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_paid = TRUE THEN
            IF OLD.type = 'income' THEN
                UPDATE accounts 
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.account_id;
            ELSIF OLD.type = 'expense' THEN
                UPDATE accounts 
                SET current_balance = current_balance + OLD.amount
                WHERE id = OLD.account_id;
            ELSIF OLD.type = 'transfer' THEN
                UPDATE accounts 
                SET current_balance = current_balance + OLD.amount
                WHERE id = OLD.account_id;
                UPDATE accounts 
                SET current_balance = current_balance - OLD.amount
                WHERE id = OLD.transfer_to_account_id;
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_account_balance"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_account_balance"() IS 'Trigger function para manter saldo das contas sincronizado com transações';



CREATE OR REPLACE FUNCTION "public"."update_achievement_progress"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Inserir ou atualizar progresso
  INSERT INTO user_achievements (
    user_id, achievement_id, tier, progress, target
  ) VALUES (
    p_user_id, p_achievement_id, p_tier, p_progress, p_target
  )
  ON CONFLICT (user_id, achievement_id, tier) 
  DO UPDATE SET 
    progress = EXCLUDED.progress,
    target = EXCLUDED.target,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_achievement_progress"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_achievement_progress"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) IS 'Atualiza o progresso de uma conquista';



CREATE OR REPLACE FUNCTION "public"."update_available_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_card_id UUID;
BEGIN
  -- Determinar o card_id
  IF TG_OP = 'DELETE' THEN
    v_card_id := OLD.credit_card_id;
  ELSE
    v_card_id := NEW.credit_card_id;
  END IF;
  
  -- Atualizar limite disponível
  UPDATE credit_cards
  SET available_limit = credit_limit - (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM credit_card_invoices
    WHERE credit_card_id = v_card_id
      AND status IN ('open', 'closed')
  )
  WHERE id = v_card_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_available_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_badge_progress"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Inserir ou atualizar progresso
  INSERT INTO badge_progress (
    user_id, badge_id, tier, progress, target
  ) VALUES (
    p_user_id, p_badge_id, p_tier, p_progress, p_target
  )
  ON CONFLICT (user_id, badge_id, tier) 
  DO UPDATE SET 
    progress = EXCLUDED.progress,
    target = EXCLUDED.target,
    updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."update_badge_progress"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_badge_progress"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) IS 'Atualiza o progresso de um badge';



CREATE OR REPLACE FUNCTION "public"."update_best_streak"("goal_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_best_streak"("goal_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_best_streak"("goal_id" "uuid") IS 'Atualiza streak_count e best_streak de uma meta';



CREATE OR REPLACE FUNCTION "public"."update_budget_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.budget_summaries (user_id, month, total_planned)
  values (new.user_id, new.month, new.planned_amount)
  on conflict (user_id, month)
  do update set 
    total_planned = public.budget_summaries.total_planned 
                    + excluded.total_planned 
                    - coalesce((case when TG_OP = 'UPDATE' then old.planned_amount else 0 end), 0),
    updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_budget_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calendar_event"("p_event_id" "uuid", "p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean DEFAULT false, "p_description" "text" DEFAULT NULL::"text", "p_start_time" time without time zone DEFAULT NULL::time without time zone, "p_end_time" time without time zone DEFAULT NULL::time without time zone, "p_location_text" "text" DEFAULT NULL::"text", "p_event_kind" "text" DEFAULT 'personal'::"text", "p_priority" "text" DEFAULT NULL::"text", "p_ticktick_tags" "text"[] DEFAULT NULL::"text"[], "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_uid uuid := auth.uid();
  v_owner_uid uuid;
  v_tz text;
  v_start timestamptz;
  v_end timestamptz;
  v_metadata jsonb;
  v_updated int;
  v_clean_tags text[];
BEGIN
  v_owner_uid := COALESCE(v_actor_uid, p_user_id);

  IF v_owner_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_actor_uid IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> v_actor_uid THEN
    RAISE EXCEPTION 'forbidden_user_override';
  END IF;

  v_tz := NULLIF(trim(p_timezone), '');
  IF v_tz IS NULL THEN
    v_tz := 'America/Sao_Paulo';
  END IF;

  IF p_all_day THEN
    v_start := timezone(v_tz, (p_date + time '00:00:00')::timestamp);
    v_end := timezone(v_tz, (p_date + time '23:59:59')::timestamp);
  ELSE
    IF p_start_time IS NULL THEN
      RAISE EXCEPTION 'start_time_required';
    END IF;

    v_start := timezone(v_tz, (p_date + p_start_time)::timestamp);
    IF p_end_time IS NOT NULL THEN
      v_end := timezone(v_tz, (p_date + p_end_time)::timestamp);
    ELSE
      v_end := v_start + interval '1 hour';
    END IF;
  END IF;

  SELECT COALESCE(e.metadata, '{}'::jsonb)
    INTO v_metadata
  FROM public.calendar_events e
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  v_metadata := v_metadata - 'priority' - 'ticktick_tags';

  IF NULLIF(trim(COALESCE(p_priority, '')), '') IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object('priority', trim(p_priority));
  END IF;

  SELECT COALESCE(array_agg(trim(tag)), ARRAY[]::text[])
    INTO v_clean_tags
  FROM unnest(COALESCE(p_ticktick_tags, ARRAY[]::text[])) AS tag
  WHERE NULLIF(trim(tag), '') IS NOT NULL;

  IF COALESCE(array_length(v_clean_tags, 1), 0) > 0 THEN
    v_metadata := v_metadata || jsonb_build_object('ticktick_tags', to_jsonb(v_clean_tags));
  END IF;

  UPDATE public.calendar_events e
  SET
    title = trim(p_title),
    description = NULLIF(trim(COALESCE(p_description, '')), ''),
    event_kind = COALESCE(NULLIF(trim(p_event_kind), ''), 'personal'),
    start_at = v_start,
    end_at = v_end,
    all_day = p_all_day,
    timezone = v_tz,
    location_text = NULLIF(trim(COALESCE(p_location_text, '')), ''),
    metadata = v_metadata,
    updated_at = now()
  WHERE e.id = p_event_id
    AND e.user_id = v_owner_uid
    AND e.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'event_not_found_or_forbidden';
  END IF;

  INSERT INTO public.calendar_sync_jobs (
    user_id,
    event_id,
    provider,
    job_type,
    idempotency_key,
    status,
    run_after
  ) VALUES (
    v_owner_uid,
    p_event_id,
    'ticktick',
    'upsert_event',
    'sync:' || p_event_id::text || ':upsert_event:edit:' || gen_random_uuid()::text,
    'pending',
    now()
  );
END;
$$;


ALTER FUNCTION "public"."update_calendar_event"("p_event_id" "uuid", "p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_priority" "text", "p_ticktick_tags" "text"[], "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_calendar_event"("p_event_id" "uuid", "p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_priority" "text", "p_ticktick_tags" "text"[], "p_user_id" "uuid") IS 'Updates canonical calendar event fields + priority/ticktick tags, then enqueues outbound TickTick upsert_event.';



CREATE OR REPLACE FUNCTION "public"."update_card_limit_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Devolver ao limite disponível
  UPDATE credit_cards
  SET 
    available_limit = available_limit + OLD.amount,
    updated_at = NOW()
  WHERE id = OLD.credit_card_id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_card_limit_on_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_card_limit_on_delete"() IS 'Devolve o valor ao limite disponível ao deletar uma transação';



CREATE OR REPLACE FUNCTION "public"."update_card_limit_on_purchase"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Deduzir do limite disponível
  UPDATE credit_cards
  SET 
    available_limit = available_limit - NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.credit_card_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_card_limit_on_purchase"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_card_limit_on_purchase"() IS 'Atualiza o saldo e limite disponível do cartão ao criar uma transação';



CREATE OR REPLACE FUNCTION "public"."update_gamification_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_gamification_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_goal_amount_on_contribution"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE savings_goals
  SET current_amount = current_amount + NEW.amount,
      updated_at = NOW()
  WHERE id = NEW.goal_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_goal_amount_on_contribution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_goal_contributions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_goal_contributions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_investment_after_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_investment RECORD;
  v_existing_transactions INTEGER;
BEGIN
  SELECT * INTO v_investment FROM investments WHERE id = NEW.investment_id;
  
  -- Contar transações existentes ANTES desta (excluindo a atual)
  SELECT COUNT(*) INTO v_existing_transactions
  FROM investment_transactions
  WHERE investment_id = NEW.investment_id
    AND transaction_type = 'buy'
    AND id != NEW.id;
  
  IF NEW.transaction_type = 'buy' THEN
    -- Se já existe quantity no investment E é a primeira transação de compra,
    -- significa que o investimento foi criado com valores iniciais.
    -- Neste caso, NÃO somar novamente.
    IF v_investment.quantity > 0 AND v_existing_transactions = 0 THEN
      -- Investimento já tem valores iniciais, apenas atualizar timestamp
      UPDATE investments
      SET updated_at = NOW()
      WHERE id = NEW.investment_id;
      
    ELSE
      -- Compra adicional: recalcular preço médio e somar
      UPDATE investments
      SET 
        quantity = v_investment.quantity + NEW.quantity,
        purchase_price = (
          (v_investment.quantity * v_investment.purchase_price) + 
          (NEW.quantity * NEW.price)
        ) / (v_investment.quantity + NEW.quantity),
        total_invested = COALESCE(total_invested, 0) + NEW.total_value + NEW.fees,
        updated_at = NOW()
      WHERE id = NEW.investment_id;
    END IF;
    
  ELSIF NEW.transaction_type = 'sell' THEN
    -- Venda: sempre processar
    UPDATE investments
    SET 
      quantity = v_investment.quantity - NEW.quantity,
      status = CASE 
        WHEN (v_investment.quantity - NEW.quantity) <= 0 THEN 'sold'::TEXT
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
    
  ELSIF NEW.transaction_type = 'split' THEN
    -- Desdobramento: sempre processar
    UPDATE investments
    SET 
      quantity = v_investment.quantity * NEW.quantity,
      purchase_price = v_investment.purchase_price / NEW.quantity,
      current_price = CASE 
        WHEN current_price IS NOT NULL THEN current_price / NEW.quantity
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = NEW.investment_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_investment_after_transaction"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_investment_after_transaction"() IS 'Trigger inteligente que detecta se é transação inicial (dados já no investment) 
ou transação adicional (precisa somar). Evita duplicação de valores.';



CREATE OR REPLACE FUNCTION "public"."update_investment_alerts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_investment_alerts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_investment_goal_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.investment_goals
    SET current_amount = current_amount + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.investment_goals
    SET current_amount = current_amount - OLD.amount,
        updated_at = NOW()
    WHERE id = OLD.goal_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_investment_goal_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_remaining_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- remaining_amount é calculado automaticamente (GENERATED ALWAYS)
  -- Apenas atualizar status baseado no pagamento
  
  IF (NEW.total_amount - COALESCE(NEW.paid_amount, 0)) <= 0 THEN
    NEW.status := 'paid';
  ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
    NEW.status := 'partial';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoice_remaining_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  -- Determinar o invoice_id (INSERT, UPDATE ou DELETE)
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;
  
  -- Atualizar total da fatura
  IF v_invoice_id IS NOT NULL THEN
    UPDATE credit_card_invoices
    SET total_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM credit_card_transactions
      WHERE invoice_id = v_invoice_id
    )
    WHERE id = v_invoice_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_invoice_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_total_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Subtrair do total da fatura (remaining_amount é calculado automaticamente)
  UPDATE credit_card_invoices
  SET 
    total_amount = COALESCE(total_amount, 0) - OLD.amount,
    updated_at = NOW()
  WHERE id = OLD.invoice_id;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."update_invoice_total_on_delete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_invoice_total_on_delete"() IS 'Subtrai o valor do total da fatura ao deletar uma transação';



CREATE OR REPLACE FUNCTION "public"."update_invoice_total_on_transaction"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Somar ao total da fatura (remaining_amount é calculado automaticamente)
  UPDATE credit_card_invoices
  SET 
    total_amount = COALESCE(total_amount, 0) + NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invoice_total_on_transaction"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_invoice_total_on_transaction"() IS 'Atualiza o total e valor restante da fatura ao adicionar uma transação';



CREATE OR REPLACE FUNCTION "public"."update_overdue_bills"() RETURNS TABLE("updated_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  total_updated INTEGER;
BEGIN
  UPDATE payable_bills
  SET status = 'overdue', updated_at = NOW()
  WHERE status = 'pending' AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS total_updated = ROW_COUNT;
  
  RETURN QUERY SELECT total_updated;
END;
$$;


ALTER FUNCTION "public"."update_overdue_bills"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_overdue_bills"() IS 'Atualiza status pending → overdue quando vencidas';



CREATE OR REPLACE FUNCTION "public"."update_spending_goals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_spending_goals"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_spending_goals"() IS 'Atualiza current_amount e status das metas de gasto quando transações mudam';



CREATE OR REPLACE FUNCTION "public"."update_spending_goals_from_transactions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_spending_goals_from_transactions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Função trigger para atualizar automaticamente a coluna updated_at';



CREATE OR REPLACE FUNCTION "public"."update_webhook_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE public.webhook_endpoints
    SET 
      total_calls = total_calls + 1,
      success_calls = success_calls + 1,
      last_triggered_at = NEW.triggered_at,
      last_status_code = NEW.response_status_code
    WHERE id = NEW.webhook_id;
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.webhook_endpoints
    SET 
      total_calls = total_calls + 1,
      failed_calls = failed_calls + 1,
      last_triggered_at = NEW.triggered_at,
      last_status_code = NEW.response_status_code
    WHERE id = NEW.webhook_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_webhook_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_whatsapp_connections_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_whatsapp_connections_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying NOT NULL,
    "type" character varying NOT NULL,
    "bank_name" character varying,
    "initial_balance" numeric(10,2) DEFAULT 0,
    "current_balance" numeric(10,2) DEFAULT 0,
    "color" character varying DEFAULT '#6366f1'::character varying,
    "icon" character varying DEFAULT 'Wallet'::character varying,
    "is_shared" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "include_in_total" boolean DEFAULT true NOT NULL,
    CONSTRAINT "accounts_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['checking'::character varying, 'savings'::character varying, 'cash'::character varying, 'investment'::character varying, 'credit_card'::character varying])::"text"[])))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."accounts" IS 'Contas bancárias, carteiras e investimentos dos usuários';



COMMENT ON COLUMN "public"."accounts"."type" IS 'Tipo: checking (corrente), savings (poupança), cash (carteira), investment (investimento), credit_card (cartão)';



COMMENT ON COLUMN "public"."accounts"."initial_balance" IS 'Saldo inicial da conta';



COMMENT ON COLUMN "public"."accounts"."current_balance" IS 'Saldo atual (atualizado por transações)';



COMMENT ON COLUMN "public"."accounts"."icon" IS 'Nome do ícone Lucide React (ex: Wallet, PiggyBank, TrendingUp)';



COMMENT ON COLUMN "public"."accounts"."is_shared" IS 'Indica se é uma conta compartilhada (modo casal)';



COMMENT ON COLUMN "public"."accounts"."is_active" IS 'Indica se a conta está ativa';



COMMENT ON COLUMN "public"."accounts"."include_in_total" IS 'Define se a conta participa dos totais consolidados patrimoniais';



CREATE TABLE IF NOT EXISTS "public"."agent_action_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_action_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_daily_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_date" "date" NOT NULL,
    "summary" "text",
    "highlights" "jsonb" DEFAULT '[]'::"jsonb",
    "decisions_made" "jsonb" DEFAULT '[]'::"jsonb",
    "pending_items" "jsonb" DEFAULT '[]'::"jsonb",
    "financial_snapshot" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_daily_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_identity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "soul_config" "jsonb" DEFAULT '{"name": "Ana Clara", "role": "Personal Finance Copilot", "emoji": "🙋🏻‍♀️", "personality": {"tone": "amiga próxima que entende de finanças e não tem medo de falar a verdade", "traits": ["direta", "proativa", "desafiadora", "empática", "persistente"], "anti_patterns": ["nunca dizer ótima pergunta ou com certeza", "nunca concordar por educação quando discorda", "nunca dar resposta genérica que serve pra qualquer um", "nunca desistir de entender o que o usuário quis dizer", "nunca usar linguagem corporativa ou formal demais"]}}'::"jsonb" NOT NULL,
    "user_context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "autonomy_rules" "jsonb" DEFAULT '{"auto_execute": ["register_transaction_high_confidence", "categorize_automatically", "assign_single_account", "generate_insights", "send_proactive_notifications", "update_memory", "read_agenda"], "soft_confirmation": ["change_category"], "require_confirmation": ["delete_any_data", "mark_bill_as_paid", "edit_transaction_amount", "create_recurring_bill", "any_money_movement", "share_data_externally"]}'::"jsonb" NOT NULL,
    "notification_preferences" "jsonb" DEFAULT '{"daily_summary": "20:00", "tips_per_week": 2, "anomaly_alerts": true, "goal_reminders": true, "morning_briefing": "08:00", "weekly_summary_day": "sunday", "weekly_summary_time": "09:00", "bill_alert_days_before": 3}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_identity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_memory_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "memory_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "embedding" "public"."vector"(1536),
    "source" "text" DEFAULT 'system'::"text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reinforcement_count" integer DEFAULT 1 NOT NULL,
    "confidence" numeric(4,3) DEFAULT 0.6 NOT NULL,
    "last_reinforced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_memory_entries_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "agent_memory_entries_memory_type_check" CHECK (("memory_type" = ANY (ARRAY['decision'::"text", 'lesson'::"text", 'preference'::"text", 'pattern'::"text", 'note'::"text", 'feedback'::"text"]))),
    CONSTRAINT "agent_memory_entries_source_check" CHECK (("source" = ANY (ARRAY['conversation'::"text", 'system'::"text", 'user_explicit'::"text"])))
);


ALTER TABLE "public"."agent_memory_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_memory_episodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "summary" "text" NOT NULL,
    "importance" numeric(3,2) DEFAULT 0.20 NOT NULL,
    "source" "text" DEFAULT 'system'::"text" NOT NULL,
    "outcome" "text",
    "entities" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "context_window_hours" integer DEFAULT 48 NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agent_memory_episodes_importance_check" CHECK ((("importance" >= (0)::numeric) AND ("importance" <= (1)::numeric)))
);


ALTER TABLE "public"."agent_memory_episodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_pending_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "task_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "due_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "agent_pending_tasks_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'done'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."agent_pending_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_provider_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "public"."ai_provider_type" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "api_key_encrypted" "text",
    "api_key_last_4" character varying(4),
    "model_name" character varying(100) NOT NULL,
    "temperature" numeric(3,2) DEFAULT 0.70,
    "max_tokens" integer DEFAULT 1000,
    "response_style" "public"."response_style" DEFAULT 'medium'::"public"."response_style",
    "response_tone" "public"."response_tone" DEFAULT 'friendly'::"public"."response_tone",
    "system_prompt" "text" DEFAULT 'Você é Ana Clara, uma assistente financeira virtual especializada em educação financeira pessoal. Seu objetivo é ajudar usuários a organizarem suas finanças, aprenderem sobre investimentos e alcançarem suas metas financeiras de forma simples e amigável.'::"text",
    "is_validated" boolean DEFAULT false,
    "last_validated_at" timestamp with time zone,
    "validation_error" "text",
    "plan_type" character varying(20) DEFAULT 'free'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_provider_configs_max_tokens_check" CHECK ((("max_tokens" >= 100) AND ("max_tokens" <= 4000))),
    CONSTRAINT "ai_provider_configs_temperature_check" CHECK ((("temperature" >= (0)::numeric) AND ("temperature" <= (2)::numeric)))
);


ALTER TABLE "public"."ai_provider_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ana_clara_config" (
    "user_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ana_clara_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."ana_clara_config" IS 'Configuração runtime da Ana Clara (grupo WhatsApp e futuros canais).';



CREATE TABLE IF NOT EXISTS "public"."ana_clara_group_message_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_jid" "text" NOT NULL,
    "participant_phone" character varying(32),
    "participant_name" "text",
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "content" "text",
    "media_summary" "text",
    "trigger_detected" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval) NOT NULL
);


ALTER TABLE "public"."ana_clara_group_message_memory" OWNER TO "postgres";


COMMENT ON TABLE "public"."ana_clara_group_message_memory" IS 'Memória passiva recente de grupos WhatsApp (curta duração, para contexto de sessão).';



CREATE TABLE IF NOT EXISTS "public"."ana_insights_cache" (
    "user_id" "uuid" NOT NULL,
    "insights" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "insight_type" "text" DEFAULT 'dashboard'::"text" NOT NULL
);


ALTER TABLE "public"."ana_insights_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."ana_insights_cache" IS 'Cache de insights da Ana Clara com TTL de 24h';



COMMENT ON COLUMN "public"."ana_insights_cache"."user_id" IS 'ID do usuário';



COMMENT ON COLUMN "public"."ana_insights_cache"."insights" IS 'Payload JSON dos insights gerados';



COMMENT ON COLUMN "public"."ana_insights_cache"."generated_at" IS 'Timestamp de quando foi gerado';



COMMENT ON COLUMN "public"."ana_insights_cache"."expires_at" IS 'Timestamp de quando expira (24h)';



COMMENT ON COLUMN "public"."ana_insights_cache"."insight_type" IS 'Tipo de insight: dashboard ou investment';



CREATE TABLE IF NOT EXISTS "public"."badge_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "badge_id" "text" NOT NULL,
    "tier" "text" DEFAULT 'bronze'::"text" NOT NULL,
    "progress" numeric(10,2) DEFAULT 0 NOT NULL,
    "target" numeric(10,2) DEFAULT 0 NOT NULL,
    "unlocked" boolean DEFAULT false NOT NULL,
    "unlocked_at" timestamp with time zone,
    "xp_reward" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."badge_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."badge_progress" IS 'Progresso das conquistas (badges) por usuário';



CREATE TABLE IF NOT EXISTS "public"."badges" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "category" "text" NOT NULL,
    "condition_type" "text" NOT NULL,
    "condition_value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


COMMENT ON TABLE "public"."badges" IS 'Definição de todos os badges disponíveis no sistema';



CREATE TABLE IF NOT EXISTS "public"."bill_payment_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "bill_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "payment_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_paid" numeric(12,2) NOT NULL,
    "payment_method" character varying(50) NOT NULL,
    "account_from_id" "uuid",
    "confirmation_number" character varying(100),
    "payment_proof_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bill_payment_history_amount_paid_check" CHECK (("amount_paid" > (0)::numeric)),
    CONSTRAINT "bill_payment_history_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['pix'::character varying, 'bank_transfer'::character varying, 'debit_card'::character varying, 'credit_card'::character varying, 'cash'::character varying, 'automatic_debit'::character varying, 'bank_slip'::character varying, 'other'::character varying])::"text"[])))
);


ALTER TABLE "public"."bill_payment_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."bill_payment_history" IS 'Histórico de pagamentos (permite pagamentos parciais)';



CREATE TABLE IF NOT EXISTS "public"."bill_reminders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "bill_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reminder_date" "date" NOT NULL,
    "reminder_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "reminder_type" character varying(20) NOT NULL,
    "sent_at" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "channel" "text" DEFAULT 'email'::"text",
    "retry_count" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "days_before" integer DEFAULT 1,
    "scheduled_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    CONSTRAINT "bill_reminders_channel_check" CHECK (("channel" = ANY (ARRAY['push'::"text", 'email'::"text", 'whatsapp'::"text"]))),
    CONSTRAINT "bill_reminders_reminder_type_check" CHECK ((("reminder_type")::"text" = ANY ((ARRAY['app'::character varying, 'email'::character varying, 'whatsapp'::character varying, 'push'::character varying, 'sms'::character varying])::"text"[]))),
    CONSTRAINT "bill_reminders_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."bill_reminders" OWNER TO "postgres";


COMMENT ON TABLE "public"."bill_reminders" IS 'Lembretes agendados com rastreamento de entrega';



COMMENT ON COLUMN "public"."bill_reminders"."channel" IS 'Canal de envio: push (notificação app), email, ou whatsapp';



COMMENT ON COLUMN "public"."bill_reminders"."retry_count" IS 'Número de tentativas de reenvio (máx 3)';



COMMENT ON COLUMN "public"."bill_reminders"."metadata" IS 'Dados adicionais (ex: email_id, push_receipt, message_id)';



COMMENT ON COLUMN "public"."bill_reminders"."days_before" IS 'Quantos dias antes do vencimento enviar (0 = no dia)';



COMMENT ON COLUMN "public"."bill_reminders"."scheduled_time" IS 'Horário do dia para envio do lembrete (formato 24h)';



CREATE TABLE IF NOT EXISTS "public"."bill_tags" (
    "bill_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bill_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."bill_tags" IS 'Tag assignments for public.payable_bills; one row per (bill_id, tag_id).';



COMMENT ON COLUMN "public"."bill_tags"."bill_id" IS 'ID da conta a pagar';



COMMENT ON COLUMN "public"."bill_tags"."tag_id" IS 'ID da tag';



COMMENT ON COLUMN "public"."bill_tags"."created_at" IS 'Data de criação do relacionamento';



CREATE TABLE IF NOT EXISTS "public"."budget_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "month" character varying(7) NOT NULL,
    "planned_income" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_planned" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_actual" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_summaries_month_check" CHECK ((("month")::"text" ~ '^[0-9]{4}-[0-9]{2}$'::"text"))
);


ALTER TABLE "public"."budget_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "month" character varying(7) NOT NULL,
    "planned_amount" numeric(10,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budgets_month_check" CHECK ((("month")::"text" ~ '^[0-9]{4}-[0-9]{2}$'::"text")),
    CONSTRAINT "budgets_planned_amount_check" CHECK (("planned_amount" >= (0)::numeric))
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


COMMENT ON TABLE "public"."budgets" IS 'DEPRECATED: legado temporário. O conceito canônico de planejamento mensal por categoria está em financial_goals com goal_type = spending_limit.';



CREATE TABLE IF NOT EXISTS "public"."calendar_event_occurrence_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "occurrence_key" "text" NOT NULL,
    "original_start_at" timestamp with time zone NOT NULL,
    "override_start_at" timestamp with time zone,
    "override_end_at" timestamp with time zone,
    "status" "public"."calendar_event_status",
    "title_override" "text",
    "description_override" "text",
    "is_cancelled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendar_event_occurrence_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_event_occurrence_overrides" IS 'Persisted exceptions for recurring event occurrences';



COMMENT ON COLUMN "public"."calendar_event_occurrence_overrides"."occurrence_key" IS 'Stable identity: event_id:original_start_at_iso';



CREATE TABLE IF NOT EXISTS "public"."calendar_event_recurrence_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "frequency" "public"."calendar_recurrence_frequency" NOT NULL,
    "interval_value" integer DEFAULT 1 NOT NULL,
    "by_weekday" "text"[],
    "by_monthday" integer[],
    "starts_at" timestamp with time zone NOT NULL,
    "until_at" timestamp with time zone,
    "count_limit" integer,
    "timezone" "text" DEFAULT 'America/Sao_Paulo'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "calendar_event_recurrence_rules_count_limit_check" CHECK ((("count_limit" IS NULL) OR ("count_limit" >= 1))),
    CONSTRAINT "calendar_event_recurrence_rules_interval_value_check" CHECK (("interval_value" >= 1))
);


ALTER TABLE "public"."calendar_event_recurrence_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_event_recurrence_rules" IS 'Recurrence rules for recurring calendar events (one per event)';



CREATE TABLE IF NOT EXISTS "public"."calendar_event_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "reminder_kind" "public"."calendar_reminder_kind" DEFAULT 'default'::"public"."calendar_reminder_kind" NOT NULL,
    "remind_offset_minutes" integer NOT NULL,
    "channel_policy" "text" DEFAULT 'user_preference'::"text",
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "calendar_event_reminders_remind_offset_minutes_check" CHECK (("remind_offset_minutes" >= 0))
);


ALTER TABLE "public"."calendar_event_reminders" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_event_reminders" IS 'Reminder intent for calendar events (not delivery)';



COMMENT ON COLUMN "public"."calendar_event_reminders"."remind_offset_minutes" IS 'Minutes before event start to fire the reminder';



CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_kind" "text" DEFAULT 'personal'::"text" NOT NULL,
    "domain_type" "text",
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone,
    "all_day" boolean DEFAULT false NOT NULL,
    "timezone" "text" DEFAULT 'America/Sao_Paulo'::"text" NOT NULL,
    "status" "public"."calendar_event_status" DEFAULT 'scheduled'::"public"."calendar_event_status" NOT NULL,
    "location_text" "text",
    "source" "public"."calendar_event_source" DEFAULT 'internal'::"public"."calendar_event_source" NOT NULL,
    "created_by" "public"."calendar_event_created_by" DEFAULT 'user'::"public"."calendar_event_created_by" NOT NULL,
    "sync_eligible" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_events" IS 'Canonical calendar events owned by the calendar domain';



COMMENT ON COLUMN "public"."calendar_events"."event_kind" IS 'Classification: personal, task_like, financial_manual';



COMMENT ON COLUMN "public"."calendar_events"."domain_type" IS 'Optional domain classification for filtering';



COMMENT ON COLUMN "public"."calendar_events"."sync_eligible" IS 'Whether this event is eligible for outbound sync to external providers';



CREATE TABLE IF NOT EXISTS "public"."calendar_external_event_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "provider" "text" NOT NULL,
    "provider_account_id" "text",
    "external_object_id" "text" NOT NULL,
    "external_list_id" "text",
    "external_parent_id" "text",
    "external_series_id" "text",
    "sync_direction" "public"."calendar_sync_direction" DEFAULT 'outbound'::"public"."calendar_sync_direction" NOT NULL,
    "sync_status" "text" DEFAULT 'synced'::"text" NOT NULL,
    "last_synced_at" timestamp with time zone,
    "last_error" "text",
    "external_payload_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_remote_updated_at" timestamp with time zone,
    "origin_type" "text",
    "origin_id" "uuid",
    CONSTRAINT "calendar_external_event_links_event_xor_origin_chk" CHECK (((("event_id" IS NOT NULL) AND ("origin_id" IS NULL)) OR (("event_id" IS NULL) AND ("origin_id" IS NOT NULL))))
);


ALTER TABLE "public"."calendar_external_event_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_external_event_links" IS 'External mirror links for synced calendar events';



CREATE TABLE IF NOT EXISTS "public"."calendar_reminder_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "reminder_id" "uuid" NOT NULL,
    "occurrence_key" "text" NOT NULL,
    "fire_at" timestamp with time zone NOT NULL,
    "delivery_status" "public"."calendar_reminder_delivery_status" DEFAULT 'pending'::"public"."calendar_reminder_delivery_status" NOT NULL,
    "delivered_at" timestamp with time zone,
    "channel" "public"."calendar_reminder_channel" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "provider_message_id" "text"
);


ALTER TABLE "public"."calendar_reminder_schedule" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_reminder_schedule" IS 'Pre-computed next-fire tracking for efficient reminder dispatch';



COMMENT ON COLUMN "public"."calendar_reminder_schedule"."fire_at" IS 'When the reminder should be delivered (event start minus offset)';



COMMENT ON COLUMN "public"."calendar_reminder_schedule"."attempt_count" IS 'Delivery attempts for this scheduled reminder row.';



COMMENT ON COLUMN "public"."calendar_reminder_schedule"."last_error" IS 'Last delivery error observed by calendar-dispatch-reminders.';



COMMENT ON COLUMN "public"."calendar_reminder_schedule"."provider_message_id" IS 'Message identifier returned by the outbound provider (e.g. UAZAPI/WhatsApp).';



CREATE TABLE IF NOT EXISTS "public"."calendar_sync_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "occurrence_override_id" "uuid",
    "occurrence_key" "text",
    "provider" "text" NOT NULL,
    "job_type" "public"."calendar_sync_job_type" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "payload_hash" "text",
    "status" "public"."calendar_sync_job_status" DEFAULT 'pending'::"public"."calendar_sync_job_status" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "run_after" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."calendar_sync_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."calendar_sync_jobs" IS 'Outbound sync queue for external provider sync (TickTick, etc.)';



COMMENT ON COLUMN "public"."calendar_sync_jobs"."event_id" IS 'Canonical calendar event when applicable; NULL for audit-only inbound jobs (financial routing, origin-only deletes, etc.). FK still enforces referential integrity when set.';



COMMENT ON COLUMN "public"."calendar_sync_jobs"."occurrence_override_id" IS 'References override when syncing a single occurrence exception';



COMMENT ON COLUMN "public"."calendar_sync_jobs"."occurrence_key" IS 'Stable occurrence identity for external provider mapping';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "name" character varying NOT NULL,
    "type" character varying NOT NULL,
    "parent_id" "uuid",
    "color" character varying DEFAULT '#6366f1'::character varying,
    "icon" character varying DEFAULT 'FolderOpen'::character varying,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "keywords" "text"[],
    CONSTRAINT "categories_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['income'::character varying, 'expense'::character varying])::"text"[])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Canonical per-user (and system) transaction taxonomy. Runtime source of truth for category_id on transactions, credit_card_transactions, payable_bills, financial_goals, and related rules; app and edge functions must resolve category_id against this table.';



COMMENT ON COLUMN "public"."categories"."user_id" IS 'NULL para categorias padrão do sistema, UUID para categorias personalizadas';



COMMENT ON COLUMN "public"."categories"."parent_id" IS 'ID da categoria pai para criar hierarquia (subcategorias)';



COMMENT ON COLUMN "public"."categories"."icon" IS 'Nome do ícone Lucide React (ex: Home, ShoppingCart, Car)';



COMMENT ON COLUMN "public"."categories"."is_default" IS 'TRUE para categorias padrão do sistema';



CREATE TABLE IF NOT EXISTS "public"."category_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "merchant_pattern" "text" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."category_rules" REPLICA IDENTITY FULL;


ALTER TABLE "public"."category_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."category_rules" IS 'Regras automáticas de categorização por estabelecimento';



COMMENT ON COLUMN "public"."category_rules"."merchant_pattern" IS 'Padrão de busca (ex: UBER%, %IFOOD%, AMAZON*)';



CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "target_value" numeric(10,2) DEFAULT 0 NOT NULL,
    "current_value" numeric(10,2) DEFAULT 0 NOT NULL,
    "deadline" "date",
    "xp_reward" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


COMMENT ON TABLE "public"."challenges" IS 'Desafios personalizados criados pelo usuário';



CREATE TABLE IF NOT EXISTS "public"."conversation_context" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "phone" character varying(128) NOT NULL,
    "context_type" "public"."conversation_type" DEFAULT 'idle'::"public"."conversation_type" NOT NULL,
    "context_data" "jsonb" DEFAULT '{}'::"jsonb",
    "last_interaction" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:05:00'::interval),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_context" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversation_context" IS 'Armazena contexto de conversação multi-turno para interações inteligentes via WhatsApp';



COMMENT ON COLUMN "public"."conversation_context"."context_type" IS 'Tipo de fluxo conversacional ativo';



COMMENT ON COLUMN "public"."conversation_context"."context_data" IS 'Dados do contexto (transaction_id, step, etc)';



COMMENT ON COLUMN "public"."conversation_context"."expires_at" IS 'Contexto expira após 5 minutos de inatividade';



CREATE TABLE IF NOT EXISTS "public"."credit_card_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credit_card_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reference_month" "date" NOT NULL,
    "closing_date" "date" NOT NULL,
    "due_date" "date" NOT NULL,
    "total_amount" numeric(12,2) DEFAULT 0 NOT NULL,
    "paid_amount" numeric(12,2) DEFAULT 0,
    "remaining_amount" numeric(12,2) GENERATED ALWAYS AS (("total_amount" - "paid_amount")) STORED,
    "status" character varying(20) DEFAULT 'open'::character varying NOT NULL,
    "payment_date" timestamp with time zone,
    "payment_account_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "credit_card_invoices_check" CHECK (("paid_amount" <= "total_amount")),
    CONSTRAINT "credit_card_invoices_check1" CHECK (("closing_date" < "due_date")),
    CONSTRAINT "credit_card_invoices_paid_amount_check" CHECK (("paid_amount" >= (0)::numeric)),
    CONSTRAINT "credit_card_invoices_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'closed'::character varying, 'paid'::character varying, 'overdue'::character varying, 'partial'::character varying])::"text"[]))),
    CONSTRAINT "credit_card_invoices_total_amount_check" CHECK (("total_amount" >= (0)::numeric))
);

ALTER TABLE ONLY "public"."credit_card_invoices" REPLICA IDENTITY FULL;


ALTER TABLE "public"."credit_card_invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_card_invoices" IS 'Tabela de faturas de cartão com Realtime habilitado';



COMMENT ON COLUMN "public"."credit_card_invoices"."reference_month" IS 'Mês de referência da fatura (sempre dia 1)';



COMMENT ON COLUMN "public"."credit_card_invoices"."status" IS 'open=aberta, closed=fechada, paid=paga, overdue=vencida, partial=parcialmente paga';



CREATE TABLE IF NOT EXISTS "public"."credit_card_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_date" "date" DEFAULT "now"() NOT NULL,
    "payment_type" character varying(20) DEFAULT 'full'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "credit_card_payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "credit_card_payments_payment_type_check" CHECK ((("payment_type")::"text" = ANY ((ARRAY['total'::character varying, 'minimum'::character varying, 'partial'::character varying])::"text"[])))
);


ALTER TABLE "public"."credit_card_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_card_payments" IS 'Histórico de pagamentos de faturas';



COMMENT ON COLUMN "public"."credit_card_payments"."payment_type" IS 'full=total, minimum=mínimo, partial=parcial, other=outro';



CREATE TABLE IF NOT EXISTS "public"."credit_card_transaction_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credit_card_transaction_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."credit_card_transaction_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_card_transaction_tags" IS 'Tag assignments for public.credit_card_transactions; one row per (credit_card_transaction_id, tag_id).';



CREATE TABLE IF NOT EXISTS "public"."credit_card_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credit_card_id" "uuid" NOT NULL,
    "invoice_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "description" character varying(255) NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "purchase_date" "date" NOT NULL,
    "is_installment" boolean DEFAULT false,
    "installment_number" integer,
    "total_installments" integer,
    "installment_group_id" "uuid",
    "establishment" character varying(255),
    "notes" "text",
    "attachment_url" "text",
    "source" character varying(20) DEFAULT 'manual'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "total_amount" numeric(12,2),
    "is_parent_installment" boolean DEFAULT false,
    CONSTRAINT "credit_card_transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "credit_card_transactions_check" CHECK ((("is_installment" = false) OR (("is_installment" = true) AND ("installment_number" IS NOT NULL) AND ("total_installments" IS NOT NULL)))),
    CONSTRAINT "credit_card_transactions_check1" CHECK (("installment_number" <= "total_installments")),
    CONSTRAINT "credit_card_transactions_installment_number_check" CHECK (("installment_number" > 0)),
    CONSTRAINT "credit_card_transactions_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['manual'::character varying, 'whatsapp'::character varying, 'import'::character varying, 'open_finance'::character varying])::"text"[]))),
    CONSTRAINT "credit_card_transactions_total_installments_check" CHECK (("total_installments" > 0))
);


ALTER TABLE "public"."credit_card_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_card_transactions" IS 'Tabela de transações de cartão com Realtime habilitado';



COMMENT ON COLUMN "public"."credit_card_transactions"."installment_group_id" IS 'UUID que agrupa todas as parcelas de uma mesma compra';



COMMENT ON COLUMN "public"."credit_card_transactions"."source" IS 'Origem: manual, whatsapp, import, open_finance';



COMMENT ON COLUMN "public"."credit_card_transactions"."total_amount" IS 'Valor total da compra parcelada (amount = valor da parcela)';



COMMENT ON COLUMN "public"."credit_card_transactions"."is_parent_installment" IS 'True se for o registro pai de um parcelamento (as parcelas são calculadas dinamicamente)';



CREATE TABLE IF NOT EXISTS "public"."credit_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "name" character varying(100) NOT NULL,
    "brand" character varying(50) NOT NULL,
    "last_four_digits" character varying(4),
    "credit_limit" numeric(12,2) DEFAULT 0 NOT NULL,
    "available_limit" numeric(12,2) DEFAULT 0 NOT NULL,
    "closing_day" integer NOT NULL,
    "due_day" integer NOT NULL,
    "color" character varying(7) DEFAULT '#8B10AE'::character varying,
    "icon" character varying(50) DEFAULT 'CreditCard'::character varying,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "issuing_bank" "text",
    CONSTRAINT "credit_cards_available_limit_check" CHECK (("available_limit" >= (0)::numeric)),
    CONSTRAINT "credit_cards_brand_check" CHECK ((("brand")::"text" = ANY ((ARRAY['visa'::character varying, 'mastercard'::character varying, 'elo'::character varying, 'amex'::character varying, 'hipercard'::character varying, 'diners'::character varying])::"text"[]))),
    CONSTRAINT "credit_cards_check" CHECK (("available_limit" <= "credit_limit")),
    CONSTRAINT "credit_cards_closing_day_check" CHECK ((("closing_day" >= 1) AND ("closing_day" <= 31))),
    CONSTRAINT "credit_cards_credit_limit_check" CHECK (("credit_limit" >= (0)::numeric)),
    CONSTRAINT "credit_cards_due_day_check" CHECK ((("due_day" >= 1) AND ("due_day" <= 31)))
);

ALTER TABLE ONLY "public"."credit_cards" REPLICA IDENTITY FULL;


ALTER TABLE "public"."credit_cards" OWNER TO "postgres";


COMMENT ON TABLE "public"."credit_cards" IS 'Tabela de cartões de crédito com Realtime habilitado';



COMMENT ON COLUMN "public"."credit_cards"."available_limit" IS 'Limite disponível = credit_limit - soma das faturas abertas';



COMMENT ON COLUMN "public"."credit_cards"."closing_day" IS 'Dia do mês em que a fatura fecha (1-31)';



COMMENT ON COLUMN "public"."credit_cards"."due_day" IS 'Dia do mês em que a fatura vence (1-31)';



CREATE TABLE IF NOT EXISTS "public"."education_daily_tips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "dedupe_key" "text" NOT NULL,
    "deterministic_reason" "text" NOT NULL,
    "narrative_text" "text" NOT NULL,
    "channel" "text" DEFAULT 'in_app'::"text" NOT NULL,
    "track_slug" "text",
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "education_daily_tips_channel_check" CHECK (("channel" = ANY (ARRAY['in_app'::"text", 'whatsapp'::"text", 'push'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."education_daily_tips" OWNER TO "postgres";


COMMENT ON TABLE "public"."education_daily_tips" IS 'Dicas entregues ao usuário com razão determinística auditável.';



CREATE TABLE IF NOT EXISTS "public"."education_glossary_terms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "term" "text" NOT NULL,
    "short_definition" "text" NOT NULL,
    "extended_text" "text",
    "example" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."education_glossary_terms" OWNER TO "postgres";


COMMENT ON TABLE "public"."education_glossary_terms" IS 'Glossário financeiro para educação in-app e contexto da Ana Clara.';



CREATE TABLE IF NOT EXISTS "public"."education_lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text",
    "content_type" "text" NOT NULL,
    "learning_objective" "text",
    "estimated_minutes" integer,
    "prerequisite_lesson_slugs" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "cta" "jsonb",
    "difficulty" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content_blocks" "jsonb",
    CONSTRAINT "education_lessons_content_type_check" CHECK (("content_type" = ANY (ARRAY['article'::"text", 'video'::"text", 'exercise'::"text", 'quiz'::"text", 'checklist'::"text"]))),
    CONSTRAINT "education_lessons_cta_check" CHECK ((("cta" IS NULL) OR ("jsonb_typeof"("cta") = 'object'::"text"))),
    CONSTRAINT "education_lessons_difficulty_check" CHECK ((("difficulty" IS NULL) OR ("difficulty" = ANY (ARRAY['beginner'::"text", 'intermediate'::"text", 'advanced'::"text"]))))
);


ALTER TABLE "public"."education_lessons" OWNER TO "postgres";


COMMENT ON TABLE "public"."education_lessons" IS 'Lições atômicas com objetivo de aprendizagem e metadados de UX.';



COMMENT ON COLUMN "public"."education_lessons"."content_blocks" IS 'Structured lesson body as typed ContentBlock[] array. NULL means content not yet authored.';



CREATE TABLE IF NOT EXISTS "public"."education_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "track_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "estimated_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."education_modules" OWNER TO "postgres";


COMMENT ON TABLE "public"."education_modules" IS 'Módulos ordenados dentro de cada trilha.';



CREATE TABLE IF NOT EXISTS "public"."education_tracks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."education_tracks" OWNER TO "postgres";


COMMENT ON TABLE "public"."education_tracks" IS 'Trilhas de aprendizado (catálogo global).';



CREATE TABLE IF NOT EXISTS "public"."education_user_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_stage" "text",
    "learning_gaps" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "preferred_tone" "text",
    "profile_completeness" numeric(4,3) DEFAULT 0 NOT NULL,
    "first_run_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "education_user_profile_profile_completeness_check" CHECK ((("profile_completeness" >= (0)::numeric) AND ("profile_completeness" <= (1)::numeric)))
);


ALTER TABLE "public"."education_user_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."education_user_profile" IS 'Perfil educacional derivado e preferências de jornada.';



CREATE TABLE IF NOT EXISTS "public"."education_user_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_viewed_at" timestamp with time zone,
    "confidence_rating" smallint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "education_user_progress_active_requires_started_at" CHECK ((("status" <> ALL (ARRAY['in_progress'::"text", 'completed'::"text"])) OR ("started_at" IS NOT NULL))),
    CONSTRAINT "education_user_progress_completed_requires_completed_at" CHECK (((("status" = 'completed'::"text") AND ("completed_at" IS NOT NULL)) OR (("status" <> 'completed'::"text") AND ("completed_at" IS NULL)))),
    CONSTRAINT "education_user_progress_confidence_rating_check" CHECK ((("confidence_rating" IS NULL) OR (("confidence_rating" >= 1) AND ("confidence_rating" <= 5)))),
    CONSTRAINT "education_user_progress_not_started_has_no_activity" CHECK ((("status" <> 'not_started'::"text") OR (("started_at" IS NULL) AND ("completed_at" IS NULL) AND ("last_viewed_at" IS NULL)))),
    CONSTRAINT "education_user_progress_skipped_has_started_without_completion" CHECK ((("status" <> 'skipped'::"text") OR (("started_at" IS NOT NULL) AND ("completed_at" IS NULL)))),
    CONSTRAINT "education_user_progress_started_before_completed" CHECK ((("started_at" IS NULL) OR ("completed_at" IS NULL) OR ("started_at" <= "completed_at"))),
    CONSTRAINT "education_user_progress_started_before_last_viewed" CHECK ((("started_at" IS NULL) OR ("last_viewed_at" IS NULL) OR ("started_at" <= "last_viewed_at"))),
    CONSTRAINT "education_user_progress_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."education_user_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."education_user_progress" IS 'Progresso por lição e usuário.';



CREATE TABLE IF NOT EXISTS "public"."financial_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "day" integer NOT NULL,
    "name" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "description" "text",
    "color" "text",
    "icon" "text",
    "notify_start" boolean DEFAULT false,
    "notify_days_before" integer,
    "linked_goals" "text"[],
    "auto_actions" "jsonb",
    CONSTRAINT "financial_cycles_day_check" CHECK ((("day" >= 1) AND ("day" <= 28))),
    CONSTRAINT "financial_cycles_notify_days_before_check" CHECK ((("notify_days_before" IS NULL) OR (("notify_days_before" >= 1) AND ("notify_days_before" <= 7)))),
    CONSTRAINT "financial_cycles_type_check" CHECK (("type" = ANY (ARRAY['salary'::"text", 'credit_card'::"text", 'rent'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."financial_cycles" OWNER TO "postgres";


COMMENT ON TABLE "public"."financial_cycles" IS 'Ciclos financeiros pessoais usados em planejamento, insights da Ana Clara e notificacoes proativas.';



COMMENT ON COLUMN "public"."financial_cycles"."type" IS 'Tipos canonicos da UI: salary, credit_card, rent e custom.';



COMMENT ON COLUMN "public"."financial_cycles"."linked_goals" IS 'Reservado para relacionamento futuro com metas e automacoes.';



COMMENT ON COLUMN "public"."financial_cycles"."auto_actions" IS 'Reservado para automacoes futuras disparadas no inicio de ciclo.';



CREATE TABLE IF NOT EXISTS "public"."financial_goal_contributions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_goal_contributions_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."financial_goal_contributions" OWNER TO "postgres";


COMMENT ON TABLE "public"."financial_goal_contributions" IS 'Histórico canônico de aportes em financial_goals.';



COMMENT ON COLUMN "public"."financial_goal_contributions"."date" IS 'Data efetiva do aporte.';



CREATE TABLE IF NOT EXISTS "public"."goal_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "goal_contributions_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."goal_contributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "integration_type" "public"."integration_type" NOT NULL,
    "status" "public"."integration_status" DEFAULT 'disconnected'::"public"."integration_status" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "access_token_encrypted" "text",
    "refresh_token_encrypted" "text",
    "whatsapp_instance_id" character varying(100),
    "whatsapp_phone_number" character varying(20),
    "whatsapp_qr_code" "text",
    "google_calendar_id" character varying(200),
    "google_sync_frequency_minutes" integer DEFAULT 30,
    "ticktick_api_key_encrypted" "text",
    "ticktick_default_project_id" character varying(100),
    "last_connected_at" timestamp with time zone,
    "last_sync_at" timestamp with time zone,
    "last_error" "text",
    "error_count" integer DEFAULT 0,
    "extra_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_inbound_sync_at" timestamp with time zone,
    "inbound_sync_cursor" "text",
    "ticktick_default_list_mappings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."integration_configs" OWNER TO "postgres";


COMMENT ON TABLE "public"."integration_configs" IS 'Configurações de integrações externas (WhatsApp, Google Calendar, Tick Tick)';



COMMENT ON COLUMN "public"."integration_configs"."whatsapp_qr_code" IS 'QR Code base64 para conexão WhatsApp';



COMMENT ON COLUMN "public"."integration_configs"."google_sync_frequency_minutes" IS 'Frequência de sincronização com Google Calendar (minutos)';



COMMENT ON COLUMN "public"."integration_configs"."ticktick_api_key_encrypted" IS 'Token TickTick: legado em texto operacional, ou prefixo enc1: (AES-256-GCM) quando INTEGRATION_SECRETS_KEY está definida na Edge Function calendar-sync-ticktick.';



CREATE TABLE IF NOT EXISTS "public"."investment_accounts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "institution_name" "text",
    "account_type" "text" NOT NULL,
    "currency" "text" DEFAULT 'BRL'::"text",
    "account_number" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "investment_accounts_account_type_check" CHECK (("account_type" = ANY (ARRAY['brokerage'::"text", 'bank'::"text", 'crypto_exchange'::"text", 'other'::"text"]))),
    CONSTRAINT "investment_accounts_currency_check" CHECK (("currency" = ANY (ARRAY['BRL'::"text", 'USD'::"text", 'EUR'::"text"])))
);


ALTER TABLE "public"."investment_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_accounts" IS 'Contas de investimento (corretoras, bancos, exchanges)';



COMMENT ON COLUMN "public"."investment_accounts"."account_type" IS 'Tipo: brokerage, bank, crypto_exchange, other';



CREATE TABLE IF NOT EXISTS "public"."investment_alerts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "investment_id" "uuid",
    "ticker" "text" NOT NULL,
    "alert_type" "text" NOT NULL,
    "target_value" numeric NOT NULL,
    "current_value" numeric,
    "is_active" boolean DEFAULT true,
    "last_checked" timestamp with time zone,
    "triggered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "investment_alerts_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['price_above'::"text", 'price_below'::"text", 'percent_change'::"text"])))
);


ALTER TABLE "public"."investment_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_alerts" IS 'Alertas de preço para investimentos';



COMMENT ON COLUMN "public"."investment_alerts"."alert_type" IS 'Tipo: price_above, price_below, percent_change';



COMMENT ON COLUMN "public"."investment_alerts"."target_value" IS 'Valor alvo para disparar alerta';



COMMENT ON COLUMN "public"."investment_alerts"."current_value" IS 'Último valor verificado';



COMMENT ON COLUMN "public"."investment_alerts"."is_active" IS 'Se alerta está ativo';



COMMENT ON COLUMN "public"."investment_alerts"."triggered_at" IS 'Data/hora que alerta foi disparado';



CREATE TABLE IF NOT EXISTS "public"."investment_allocation_targets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset_class" "text" NOT NULL,
    "target_percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "investment_allocation_targets_target_percentage_check" CHECK ((("target_percentage" >= (0)::numeric) AND ("target_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."investment_allocation_targets" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_allocation_targets" IS 'Metas de alocação por classe de ativo';



COMMENT ON COLUMN "public"."investment_allocation_targets"."asset_class" IS 'Classe: fixed_income, stock, reit, fund, crypto, international';



COMMENT ON COLUMN "public"."investment_allocation_targets"."target_percentage" IS 'Percentual alvo (0-100)';



CREATE TABLE IF NOT EXISTS "public"."investment_goal_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "goal_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "investment_goal_contributions_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."investment_goal_contributions" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_goal_contributions" IS 'Histórico de aportes/contribuições em metas de investimento';



COMMENT ON COLUMN "public"."investment_goal_contributions"."amount" IS 'Valor do aporte';



COMMENT ON COLUMN "public"."investment_goal_contributions"."date" IS 'Data em que o aporte foi realizado';



COMMENT ON COLUMN "public"."investment_goal_contributions"."note" IS 'Observação opcional sobre o aporte';



CREATE TABLE IF NOT EXISTS "public"."investment_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "target_amount" numeric NOT NULL,
    "current_amount" numeric DEFAULT 0,
    "start_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "target_date" "date" NOT NULL,
    "expected_return_rate" numeric NOT NULL,
    "monthly_contribution" numeric DEFAULT 0,
    "contribution_day" integer,
    "linked_investments" "uuid"[] DEFAULT '{}'::"uuid"[],
    "auto_invest" boolean DEFAULT false,
    "status" "text" DEFAULT 'active'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "notify_milestones" boolean DEFAULT true,
    "notify_contribution" boolean DEFAULT false,
    "notify_rebalancing" boolean DEFAULT false,
    "icon" "text",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "investment_goals_category_check" CHECK (("category" = ANY (ARRAY['retirement'::"text", 'financial_freedom'::"text", 'education'::"text", 'real_estate'::"text", 'general'::"text"]))),
    CONSTRAINT "investment_goals_contribution_day_check" CHECK ((("contribution_day" >= 1) AND ("contribution_day" <= 28))),
    CONSTRAINT "investment_goals_current_amount_check" CHECK (("current_amount" >= (0)::numeric)),
    CONSTRAINT "investment_goals_expected_return_rate_check" CHECK ((("expected_return_rate" >= (0)::numeric) AND ("expected_return_rate" <= (100)::numeric))),
    CONSTRAINT "investment_goals_monthly_contribution_check" CHECK (("monthly_contribution" >= (0)::numeric)),
    CONSTRAINT "investment_goals_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "investment_goals_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'paused'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "investment_goals_target_amount_check" CHECK (("target_amount" > (0)::numeric))
);


ALTER TABLE "public"."investment_goals" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_goals" IS 'Metas de investimento com juros compostos e projeções';



COMMENT ON COLUMN "public"."investment_goals"."expected_return_rate" IS 'Taxa de retorno anual esperada (%)';



COMMENT ON COLUMN "public"."investment_goals"."monthly_contribution" IS 'Aporte mensal fixo';



COMMENT ON COLUMN "public"."investment_goals"."linked_investments" IS 'Array de IDs de investments vinculados';



COMMENT ON COLUMN "public"."investment_goals"."auto_invest" IS 'Se true, cria aportes automáticos nos investimentos vinculados';



CREATE TABLE IF NOT EXISTS "public"."investment_quotes_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "symbol" "text" NOT NULL,
    "price" numeric(18,2) NOT NULL,
    "variation" numeric(5,2),
    "volume" numeric(30,2),
    "source" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    CONSTRAINT "investment_quotes_history_source_check" CHECK (("source" = ANY (ARRAY['brapi'::"text", 'coingecko'::"text", 'tesouro'::"text", 'bcb'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."investment_quotes_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_quotes_history" IS 'Cache de cotações históricas';



COMMENT ON COLUMN "public"."investment_quotes_history"."source" IS 'Fonte: brapi (B3), coingecko (crypto), tesouro, bcb (câmbio), manual';



COMMENT ON COLUMN "public"."investment_quotes_history"."metadata" IS 'Dados adicionais da API (bid, ask, high, low)';



CREATE TABLE IF NOT EXISTS "public"."investment_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "investment_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "quantity" numeric(18,8),
    "price" numeric(18,2),
    "total_value" numeric(18,2) NOT NULL,
    "fees" numeric(18,2) DEFAULT 0,
    "tax" numeric(18,2) DEFAULT 0,
    "transaction_date" timestamp with time zone NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_quantity_required" CHECK (((("transaction_type" = ANY (ARRAY['buy'::"text", 'sell'::"text"])) AND ("quantity" IS NOT NULL)) OR ("transaction_type" <> ALL (ARRAY['buy'::"text", 'sell'::"text"])))),
    CONSTRAINT "investment_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['buy'::"text", 'sell'::"text", 'dividend'::"text", 'interest'::"text", 'fee'::"text", 'split'::"text", 'bonus'::"text"])))
);


ALTER TABLE "public"."investment_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."investment_transactions" IS 'Histórico completo de transações';



COMMENT ON COLUMN "public"."investment_transactions"."transaction_type" IS 'buy, sell, dividend, interest, fee, split, bonus';



CREATE TABLE IF NOT EXISTS "public"."investments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "ticker" "text",
    "quantity" numeric(18,8) DEFAULT 0 NOT NULL,
    "purchase_price" numeric(18,2) DEFAULT 0 NOT NULL,
    "current_price" numeric(18,2),
    "total_invested" numeric(18,2),
    "current_value" numeric(18,2),
    "purchase_date" "date",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text",
    "subcategory" "text",
    "dividend_yield" numeric(5,2),
    "maturity_date" "date",
    "annual_rate" numeric(5,2),
    "last_price_update" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text",
    "account_id" "uuid",
    CONSTRAINT "chk_investments_category" CHECK (("category" = ANY (ARRAY['fixed_income'::"text", 'stock'::"text", 'reit'::"text", 'fund'::"text", 'crypto'::"text", 'international'::"text"]))),
    CONSTRAINT "chk_investments_status" CHECK (("status" = ANY (ARRAY['active'::"text", 'sold'::"text", 'matured'::"text"]))),
    CONSTRAINT "investments_type_check" CHECK (("type" = ANY (ARRAY['stock'::"text", 'fund'::"text", 'treasury'::"text", 'crypto'::"text", 'real_estate'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."investments" OWNER TO "postgres";


COMMENT ON TABLE "public"."investments" IS 'Portfólio de investimentos dos usuários';



COMMENT ON COLUMN "public"."investments"."type" IS 'stock, fund, treasury, crypto, real_estate, other';



COMMENT ON COLUMN "public"."investments"."category" IS 'Categoria: fixed_income, stock, reit, fund, crypto, international';



COMMENT ON COLUMN "public"."investments"."subcategory" IS 'Subcategoria específica (ex: CDB, LCI, Tesouro IPCA)';



COMMENT ON COLUMN "public"."investments"."dividend_yield" IS 'Dividend Yield % anual';



COMMENT ON COLUMN "public"."investments"."maturity_date" IS 'Data de vencimento (Renda Fixa)';



COMMENT ON COLUMN "public"."investments"."annual_rate" IS 'Taxa anual % (Renda Fixa)';



COMMENT ON COLUMN "public"."investments"."last_price_update" IS 'Última atualização de cotação';



COMMENT ON COLUMN "public"."investments"."status" IS 'Status: active, sold, matured';



COMMENT ON COLUMN "public"."investments"."account_id" IS 'FK para investment_accounts';



CREATE TABLE IF NOT EXISTS "public"."investor_profile_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "profile_key" "text",
    "confidence" numeric(4,3),
    "effective_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "explanation" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "questionnaire_version" integer,
    CONSTRAINT "investor_profile_assessments_confidence_check" CHECK ((("confidence" IS NULL) OR (("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric)))),
    CONSTRAINT "investor_profile_assessments_profile_key_check" CHECK ((("profile_key" IS NULL) OR ("profile_key" = ANY (ARRAY['conservative'::"text", 'moderate'::"text", 'balanced'::"text", 'growth'::"text", 'aggressive'::"text"]))))
);


ALTER TABLE "public"."investor_profile_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."investor_profile_assessments" IS 'Histórico de questionários de suitability / perfil de investidor.';



COMMENT ON COLUMN "public"."investor_profile_assessments"."questionnaire_version" IS 'Explicit questionnaire/scoring schema version recorded at assessment time. Preserve history; do not reinterpret silently.';



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "uuid",
    "category_id" "uuid",
    "type" character varying NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "description" character varying,
    "transaction_date" "date" NOT NULL,
    "is_paid" boolean DEFAULT true,
    "is_recurring" boolean DEFAULT false,
    "recurrence_type" character varying,
    "recurrence_end_date" "date",
    "attachment_url" character varying,
    "notes" "text",
    "source" character varying DEFAULT 'manual'::character varying,
    "whatsapp_message_id" character varying,
    "transfer_to_account_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'completed'::"text",
    "temp_id" "text",
    "confirmed_at" timestamp with time zone,
    "payment_method" character varying(20),
    CONSTRAINT "transactions_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "transactions_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['pix'::character varying, 'credit'::character varying, 'debit'::character varying, 'cash'::character varying, 'boleto'::character varying, 'transfer'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "transactions_recurrence_type_check" CHECK ((("recurrence_type")::"text" = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying, 'yearly'::character varying])::"text"[]))),
    CONSTRAINT "transactions_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['manual'::character varying, 'whatsapp'::character varying, 'import'::character varying, 'open_finance'::character varying])::"text"[]))),
    CONSTRAINT "transactions_status_check" CHECK (("status" = ANY (ARRAY['pending_confirmation'::"text", 'completed'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "transactions_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['income'::character varying, 'expense'::character varying, 'transfer'::character varying])::"text"[])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."transactions" IS 'Todas as transações financeiras (receitas, despesas, transferências)';



COMMENT ON COLUMN "public"."transactions"."type" IS 'income (receita), expense (despesa), transfer (transferência)';



COMMENT ON COLUMN "public"."transactions"."is_paid" IS 'TRUE = paga/recebida, FALSE = pendente';



COMMENT ON COLUMN "public"."transactions"."source" IS 'manual, whatsapp (via Ana Clara), import (CSV), open_finance';



COMMENT ON COLUMN "public"."transactions"."transfer_to_account_id" IS 'Conta destino quando type = transfer';



COMMENT ON COLUMN "public"."transactions"."payment_method" IS 'Método de pagamento: pix, credit, debit, cash, boleto, transfer, other';



CREATE OR REPLACE VIEW "public"."monthly_expenses_by_category" AS
 SELECT "t"."user_id",
    "date_trunc"('month'::"text", ("t"."transaction_date")::timestamp with time zone) AS "month",
    "c"."name" AS "category_name",
    "c"."icon" AS "category_icon",
    "c"."color" AS "category_color",
    "sum"("t"."amount") AS "total_amount",
    "count"(*) AS "transaction_count"
   FROM ("public"."transactions" "t"
     LEFT JOIN "public"."categories" "c" ON (("t"."category_id" = "c"."id")))
  WHERE ((("t"."type")::"text" = 'expense'::"text") AND ("t"."is_paid" = true))
  GROUP BY "t"."user_id", ("date_trunc"('month'::"text", ("t"."transaction_date")::timestamp with time zone)), "c"."name", "c"."icon", "c"."color";


ALTER VIEW "public"."monthly_expenses_by_category" OWNER TO "postgres";


COMMENT ON VIEW "public"."monthly_expenses_by_category" IS 'Agrupa despesas por categoria e mês';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "push_enabled" boolean DEFAULT true NOT NULL,
    "email_enabled" boolean DEFAULT true NOT NULL,
    "whatsapp_enabled" boolean DEFAULT false NOT NULL,
    "do_not_disturb_enabled" boolean DEFAULT false,
    "do_not_disturb_start_time" time without time zone,
    "do_not_disturb_end_time" time without time zone,
    "allowed_hours_start" time without time zone DEFAULT '08:00:00'::time without time zone,
    "allowed_hours_end" time without time zone DEFAULT '22:00:00'::time without time zone,
    "daily_summary_enabled" boolean DEFAULT true,
    "daily_summary_time" time without time zone DEFAULT '20:00:00'::time without time zone,
    "weekly_summary_enabled" boolean DEFAULT true,
    "weekly_summary_day_of_week" integer DEFAULT 0,
    "weekly_summary_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "monthly_summary_enabled" boolean DEFAULT true,
    "monthly_summary_day_of_month" integer DEFAULT 1,
    "monthly_summary_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "bill_reminders_enabled" boolean DEFAULT true,
    "bill_reminders_days_before" integer DEFAULT 3,
    "budget_alerts_enabled" boolean DEFAULT true,
    "budget_alert_threshold_percentage" integer DEFAULT 90,
    "goal_milestones_enabled" boolean DEFAULT true,
    "achievements_enabled" boolean DEFAULT true,
    "ana_tips_enabled" boolean DEFAULT true,
    "ana_tips_frequency" "public"."summary_frequency" DEFAULT 'daily'::"public"."summary_frequency",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "do_not_disturb_days_of_week" integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
    "daily_summary_days_of_week" integer[] DEFAULT '{1,2,3,4,5}'::integer[],
    "weekly_summary_days_of_week" integer[] DEFAULT '{0}'::integer[],
    "monthly_summary_days_of_month" integer[] DEFAULT '{1}'::integer[],
    "bill_reminders_days_before_array" integer[] DEFAULT '{3,1,0}'::integer[],
    "bill_reminders_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "budget_alert_thresholds" integer[] DEFAULT '{80,100}'::integer[],
    "budget_alert_cooldown_hours" integer DEFAULT 24,
    "goal_milestone_percentages" integer[] DEFAULT '{25,50,75,100}'::integer[],
    "ana_tips_time" time without time zone DEFAULT '10:00:00'::time without time zone,
    "ana_tips_day_of_week" integer DEFAULT 1,
    "ana_tips_day_of_month" integer DEFAULT 1,
    "overdue_bill_alerts_enabled" boolean DEFAULT true,
    "overdue_bill_alert_days" integer[] DEFAULT '{1,3,7}'::integer[],
    "low_balance_alerts_enabled" boolean DEFAULT false,
    "low_balance_threshold" numeric DEFAULT 100.00,
    "large_transaction_alerts_enabled" boolean DEFAULT false,
    "large_transaction_threshold" numeric DEFAULT 1000.00,
    "investment_summary_enabled" boolean DEFAULT false,
    "investment_summary_frequency" "text" DEFAULT 'weekly'::"text",
    "investment_summary_day_of_week" integer DEFAULT 5,
    "investment_summary_time" time without time zone DEFAULT '18:00:00'::time without time zone,
    CONSTRAINT "notification_preferences_budget_alert_threshold_percentag_check" CHECK ((("budget_alert_threshold_percentage" >= 50) AND ("budget_alert_threshold_percentage" <= 100))),
    CONSTRAINT "notification_preferences_monthly_summary_day_of_month_check" CHECK ((("monthly_summary_day_of_month" >= 1) AND ("monthly_summary_day_of_month" <= 28)))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'Preferências de notificações do usuário (canais, horários, frequência)';



COMMENT ON COLUMN "public"."notification_preferences"."do_not_disturb_start_time" IS 'Hora de início do modo Não Perturbe (ex: 22:00)';



COMMENT ON COLUMN "public"."notification_preferences"."budget_alert_threshold_percentage" IS 'Notificar quando gasto atingir X% do orçamento';



CREATE TABLE IF NOT EXISTS "public"."notifications_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "channel" character varying(20) DEFAULT 'whatsapp'::character varying,
    "status" character varying(20) DEFAULT 'sent'::character varying,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications_log" IS 'Log de notificações enviadas para controle de cooldown';



COMMENT ON COLUMN "public"."notifications_log"."type" IS 'Tipo: budget_alert, upcoming_bills, goals_achieved, dividends_received';



COMMENT ON COLUMN "public"."notifications_log"."metadata" IS 'Dados adicionais (threshold, percentage, etc)';



CREATE TABLE IF NOT EXISTS "public"."payable_bills" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" character varying(255) NOT NULL,
    "amount" numeric(12,2),
    "due_date" "date" NOT NULL,
    "bill_type" character varying(50) NOT NULL,
    "provider_name" character varying(255),
    "category_id" "uuid",
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "paid_at" timestamp with time zone,
    "paid_amount" numeric(12,2),
    "payment_account_id" "uuid",
    "payment_method" character varying(50),
    "barcode" character varying(48),
    "qr_code_pix" "text",
    "reference_number" character varying(100),
    "bill_document_url" "text",
    "payment_proof_url" "text",
    "is_recurring" boolean DEFAULT false,
    "recurrence_config" "jsonb",
    "parent_bill_id" "uuid",
    "next_occurrence_date" "date",
    "is_installment" boolean DEFAULT false,
    "installment_number" integer,
    "installment_total" integer,
    "installment_group_id" "uuid",
    "original_purchase_amount" numeric(12,2),
    "reminder_enabled" boolean DEFAULT true,
    "reminder_days_before" integer DEFAULT 3,
    "reminder_channels" "text"[] DEFAULT ARRAY['app'::"text"],
    "last_reminder_sent_at" timestamp with time zone,
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "tags" "text"[],
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_recurring_id" "uuid",
    "credit_card_id" "uuid",
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    CONSTRAINT "payable_bills_amount_check" CHECK ((("amount" IS NULL) OR ("amount" > (0)::numeric))),
    CONSTRAINT "payable_bills_bill_type_check" CHECK ((("bill_type")::"text" = ANY ((ARRAY['service'::character varying, 'telecom'::character varying, 'subscription'::character varying, 'housing'::character varying, 'education'::character varying, 'healthcare'::character varying, 'insurance'::character varying, 'loan'::character varying, 'installment'::character varying, 'credit_card'::character varying, 'tax'::character varying, 'food'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "payable_bills_installment_number_check" CHECK (("installment_number" >= 1)),
    CONSTRAINT "payable_bills_installment_total_check" CHECK (("installment_total" >= 1)),
    CONSTRAINT "payable_bills_payment_method_check" CHECK ((("payment_method")::"text" = ANY ((ARRAY['pix'::character varying, 'bank_transfer'::character varying, 'debit_card'::character varying, 'credit_card'::character varying, 'cash'::character varying, 'automatic_debit'::character varying, 'bank_slip'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "payable_bills_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "payable_bills_reminder_days_before_check" CHECK ((("reminder_days_before" >= 0) AND ("reminder_days_before" <= 30))),
    CONSTRAINT "payable_bills_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'overdue'::character varying, 'paid'::character varying, 'partial'::character varying, 'cancelled'::character varying, 'scheduled'::character varying])::"text"[]))),
    CONSTRAINT "valid_due_date" CHECK (("due_date" >= '2020-01-01'::"date")),
    CONSTRAINT "valid_installment" CHECK (((NOT "is_installment") OR ("is_installment" AND ("installment_number" > 0) AND ("installment_total" > 0) AND ("installment_number" <= "installment_total") AND ("installment_group_id" IS NOT NULL)))),
    CONSTRAINT "valid_paid_status" CHECK (((("status")::"text" <> 'paid'::"text") OR ((("status")::"text" = 'paid'::"text") AND ("paid_at" IS NOT NULL) AND (("amount" IS NULL) OR ("paid_amount" >= "amount"))))),
    CONSTRAINT "valid_payment" CHECK (((("status")::"text" <> ALL ((ARRAY['paid'::character varying, 'partial'::character varying])::"text"[])) OR ((("status")::"text" = ANY ((ARRAY['paid'::character varying, 'partial'::character varying])::"text"[])) AND ((("paid_amount" IS NOT NULL) AND ("paid_amount" > (0)::numeric)) OR (("amount" IS NULL) AND ("paid_amount" IS NULL)))))),
    CONSTRAINT "valid_recurrence" CHECK (((NOT "is_recurring") OR ("is_recurring" AND ("recurrence_config" IS NOT NULL))))
);

ALTER TABLE ONLY "public"."payable_bills" REPLICA IDENTITY FULL;


ALTER TABLE "public"."payable_bills" OWNER TO "postgres";


COMMENT ON TABLE "public"."payable_bills" IS 'Contas a pagar com recorrência, parcelamento e lembretes';



COMMENT ON COLUMN "public"."payable_bills"."due_date" IS 'Data de vencimento (diferente de transaction_date)';



COMMENT ON COLUMN "public"."payable_bills"."barcode" IS 'Código de barras boleto (48 dígitos)';



COMMENT ON COLUMN "public"."payable_bills"."qr_code_pix" IS 'Chave PIX copia-e-cola';



COMMENT ON COLUMN "public"."payable_bills"."recurrence_config" IS 'Config JSON: {frequency, day, end_date}';



COMMENT ON COLUMN "public"."payable_bills"."parent_recurring_id" IS 'ID do template recorrente que gerou esta ocorrência';



COMMENT ON COLUMN "public"."payable_bills"."credit_card_id" IS 'ID do cartão de crédito (para parcelamentos no cartão)';



COMMENT ON COLUMN "public"."payable_bills"."source" IS 'Origin of the bill row: manual (UI entry), whatsapp (assistant), external_import (inbound sync or external calendar/finance import).';



CREATE TABLE IF NOT EXISTS "public"."portfolio_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "total_invested" numeric NOT NULL,
    "current_value" numeric NOT NULL,
    "return_amount" numeric,
    "return_percentage" numeric,
    "allocation" "jsonb",
    "top_performers" "jsonb",
    "dividends_ytd" numeric DEFAULT 0,
    "dividend_yield" numeric DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "total_assets" numeric,
    "total_liabilities" numeric,
    "net_worth" numeric,
    "asset_breakdown" "jsonb",
    "liability_breakdown" "jsonb"
);


ALTER TABLE "public"."portfolio_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."portfolio_snapshots" IS 'Snapshots diários do portfólio de investimentos para análise histórica';



COMMENT ON COLUMN "public"."portfolio_snapshots"."total_assets" IS 'Ativos totais consolidados no snapshot diário';



COMMENT ON COLUMN "public"."portfolio_snapshots"."total_liabilities" IS 'Passivos totais consolidados no snapshot diário';



COMMENT ON COLUMN "public"."portfolio_snapshots"."net_worth" IS 'Patrimônio líquido consolidado no snapshot diário';



COMMENT ON COLUMN "public"."portfolio_snapshots"."asset_breakdown" IS 'Composição resumida dos ativos no snapshot diário';



COMMENT ON COLUMN "public"."portfolio_snapshots"."liability_breakdown" IS 'Composição resumida dos passivos no snapshot diário';



CREATE TABLE IF NOT EXISTS "public"."push_tokens" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_tokens" IS 'Armazena tokens de push notification (Web Push API) dos usuários';



COMMENT ON COLUMN "public"."push_tokens"."endpoint" IS 'Endpoint único do push subscription';



COMMENT ON COLUMN "public"."push_tokens"."p256dh" IS 'Chave pública P-256 (ECDH) para criptografia';



COMMENT ON COLUMN "public"."push_tokens"."auth" IS 'Chave de autenticação para criptografia';



CREATE TABLE IF NOT EXISTS "public"."saved_filters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "filter_config" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_filters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."savings_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "target_amount" numeric(14,2),
    "target_percent" numeric(5,2),
    "current_amount" numeric(14,2) DEFAULT 0,
    "deadline" "date",
    "is_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "icon" "text",
    "notify_milestones" boolean DEFAULT true,
    "notify_contribution" boolean DEFAULT false,
    "contribution_frequency" "text",
    "contribution_day" integer,
    "notify_delay" boolean DEFAULT false,
    "start_date" "date" DEFAULT CURRENT_DATE,
    "target_date" "date",
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "savings_goals_contribution_day_check" CHECK ((("contribution_day" >= 1) AND ("contribution_day" <= 28))),
    CONSTRAINT "savings_goals_contribution_frequency_check" CHECK (("contribution_frequency" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "savings_goals_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "savings_goals_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'paused'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "savings_goals_target_check" CHECK ((("target_amount" IS NOT NULL) OR ("target_percent" IS NOT NULL)))
);


ALTER TABLE "public"."savings_goals" OWNER TO "postgres";


COMMENT ON TABLE "public"."savings_goals" IS 'LEGADO - NÃO USAR. Migrado para financial_goals. Manter temporariamente para compatibilidade.';



COMMENT ON COLUMN "public"."savings_goals"."start_date" IS 'Data de início da meta';



COMMENT ON COLUMN "public"."savings_goals"."target_date" IS 'Data alvo para conclusão da meta';



COMMENT ON COLUMN "public"."savings_goals"."priority" IS 'Prioridade da meta: low, medium, high, critical';



COMMENT ON COLUMN "public"."savings_goals"."status" IS 'Status da meta: active, completed, paused, cancelled';



CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6B7280'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."tags" IS 'Canonical per-user tag catalog. Runtime source of truth for tag definitions; assignments are stored only in entity-specific junction tables (transaction_tags, credit_card_transaction_tags, bill_tags).';



CREATE TABLE IF NOT EXISTS "public"."transaction_edits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "edit_type" "public"."edit_command_type" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "edited_at" timestamp with time zone DEFAULT "now"(),
    "edited_via" "text" DEFAULT 'whatsapp'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transaction_edits" OWNER TO "postgres";


COMMENT ON TABLE "public"."transaction_edits" IS 'Histórico de edições de transações via WhatsApp';



COMMENT ON COLUMN "public"."transaction_edits"."edit_type" IS 'Tipo de edição realizada';



COMMENT ON COLUMN "public"."transaction_edits"."old_value" IS 'Valor anterior';



COMMENT ON COLUMN "public"."transaction_edits"."new_value" IS 'Novo valor';



COMMENT ON COLUMN "public"."transaction_edits"."edited_via" IS 'Canal de edição (whatsapp, web, mobile)';



CREATE TABLE IF NOT EXISTS "public"."transaction_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transaction_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."transaction_tags" IS 'Tag assignments for public.transactions; one row per (transaction_id, tag_id).';



CREATE TABLE IF NOT EXISTS "public"."user_achievements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "achievement_id" "text" NOT NULL,
    "tier" "text" DEFAULT 'bronze'::"text" NOT NULL,
    "progress" numeric(10,2) DEFAULT 0 NOT NULL,
    "target" numeric(10,2) DEFAULT 0 NOT NULL,
    "unlocked" boolean DEFAULT false NOT NULL,
    "unlocked_at" timestamp with time zone,
    "xp_reward" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_achievements" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_achievements" IS 'Conquistas desbloqueadas e progresso por usuário';



CREATE OR REPLACE VIEW "public"."user_badges_detailed" AS
 SELECT "ub"."id",
    "ub"."user_id",
    "ub"."badge_id",
    "b"."name",
    "b"."description",
    "b"."icon",
    "b"."category",
    "ub"."unlocked_at",
    "ub"."created_at"
   FROM ("public"."user_badges" "ub"
     JOIN "public"."badges" "b" ON (("b"."id" = "ub"."badge_id")))
  ORDER BY "ub"."unlocked_at" DESC;


ALTER VIEW "public"."user_badges_detailed" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_gamification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "level" integer DEFAULT 1 NOT NULL,
    "xp" integer DEFAULT 0 NOT NULL,
    "total_xp" integer DEFAULT 0 NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "best_streak" integer DEFAULT 0 NOT NULL,
    "last_activity_date" "date",
    "animations_enabled" boolean DEFAULT true NOT NULL,
    "sounds_enabled" boolean DEFAULT true NOT NULL,
    "notifications_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_gamification" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_gamification" IS 'Perfil de gamificação do usuário com XP, níveis e preferências';



CREATE TABLE IF NOT EXISTS "public"."user_gamification_profile" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "current_level" integer DEFAULT 1 NOT NULL,
    "current_xp" integer DEFAULT 0 NOT NULL,
    "total_xp" integer DEFAULT 0 NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "best_streak" integer DEFAULT 0 NOT NULL,
    "last_activity_date" "date",
    "animations_enabled" boolean DEFAULT true NOT NULL,
    "sounds_enabled" boolean DEFAULT true NOT NULL,
    "notifications_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_gamification_profile" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_gamification_profile" IS 'Perfil de gamificação do usuário com XP, níveis e preferências';



CREATE TABLE IF NOT EXISTS "public"."user_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "tipo" "text" NOT NULL,
    "chave" "text" NOT NULL,
    "valor" "jsonb" NOT NULL,
    "categoria" "text",
    "confianca" numeric(3,2) DEFAULT 0.50,
    "frequencia" integer DEFAULT 1,
    "origem" "text" DEFAULT 'inferido'::"text",
    "ultima_vez" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_memory" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_memory" IS 'Memória do usuário: gírias, preferências, apelidos, locais frequentes';



COMMENT ON COLUMN "public"."user_memory"."tipo" IS 'Tipo: giria, preferencia, local_frequente, apelido, conta_padrao';



COMMENT ON COLUMN "public"."user_memory"."confianca" IS 'Nível de confiança (0.00 a 1.00)';



COMMENT ON COLUMN "public"."user_memory"."frequencia" IS 'Quantas vezes foi usado';



COMMENT ON COLUMN "public"."user_memory"."origem" IS 'Como foi aprendido: inferido, explicito, correcao, sistema';



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" character varying(200),
    "avatar_url" "text",
    "language" character varying(10) DEFAULT 'pt-BR'::character varying NOT NULL,
    "timezone" character varying(50) DEFAULT 'America/Sao_Paulo'::character varying NOT NULL,
    "currency" character varying(3) DEFAULT 'BRL'::character varying NOT NULL,
    "date_format" character varying(20) DEFAULT 'DD/MM/YYYY'::character varying NOT NULL,
    "number_format" character varying(20) DEFAULT 'pt-BR'::character varying NOT NULL,
    "theme" character varying(20) DEFAULT 'auto'::character varying NOT NULL,
    "monthly_savings_goal_percentage" integer DEFAULT 20,
    "monthly_closing_day" integer DEFAULT 1,
    "default_bill_reminder_days" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "budget_allocation" "jsonb" DEFAULT '{"others": 10, "leisure": 20, "essentials": 50, "investments": 20}'::"jsonb",
    "budget_alert_threshold" integer DEFAULT 80,
    CONSTRAINT "user_settings_budget_alert_threshold_check" CHECK ((("budget_alert_threshold" >= 50) AND ("budget_alert_threshold" <= 100))),
    CONSTRAINT "user_settings_default_bill_reminder_days_check" CHECK (("default_bill_reminder_days" >= 0)),
    CONSTRAINT "user_settings_monthly_closing_day_check" CHECK ((("monthly_closing_day" >= 1) AND ("monthly_closing_day" <= 28))),
    CONSTRAINT "user_settings_monthly_savings_goal_percentage_check" CHECK ((("monthly_savings_goal_percentage" >= 0) AND ("monthly_savings_goal_percentage" <= 100))),
    CONSTRAINT "user_settings_theme_check" CHECK ((("theme")::"text" = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'auto'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_settings" IS 'Configurações gerais do usuário (tema, idioma, preferências financeiras)';



COMMENT ON COLUMN "public"."user_settings"."monthly_savings_goal_percentage" IS 'Meta de economia mensal em % da renda';



COMMENT ON COLUMN "public"."user_settings"."monthly_closing_day" IS 'Dia do mês para fechamento mensal (1-28)';



COMMENT ON COLUMN "public"."user_settings"."budget_allocation" IS 'Distribuicao planejada de renda/gastos por buckets para dashboard e insights da Ana Clara.';



COMMENT ON COLUMN "public"."user_settings"."budget_alert_threshold" IS 'LEGADO: limiar simples de alerta. O contrato canonico de alertas proativos vive em notification_preferences.';



CREATE OR REPLACE VIEW "public"."user_total_balance" AS
 SELECT "user_id",
    "sum"("current_balance") AS "total_balance",
    "sum"(
        CASE
            WHEN (("type")::"text" = ANY ((ARRAY['checking'::character varying, 'savings'::character varying, 'cash'::character varying])::"text"[])) THEN "current_balance"
            ELSE (0)::numeric
        END) AS "liquid_balance",
    "sum"(
        CASE
            WHEN (("type")::"text" = 'investment'::"text") THEN "current_balance"
            ELSE (0)::numeric
        END) AS "invested_balance"
   FROM "public"."accounts"
  WHERE ("is_active" = true)
  GROUP BY "user_id";


ALTER VIEW "public"."user_total_balance" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_total_balance" IS 'View para calcular saldo total do usuário por tipo de conta';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" character varying NOT NULL,
    "full_name" character varying,
    "avatar_url" character varying,
    "phone" character varying,
    "whatsapp_connected" boolean DEFAULT false,
    "couple_mode" boolean DEFAULT false,
    "partner_id" "uuid",
    "monthly_savings_goal" numeric(10,2),
    "closing_day" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nickname" character varying(100),
    CONSTRAINT "users_closing_day_check" CHECK ((("closing_day" >= 1) AND ("closing_day" <= 31)))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Usuários da plataforma Personal Finance LA';



COMMENT ON COLUMN "public"."users"."couple_mode" IS 'Indica se o usuário está usando o modo casal';



COMMENT ON COLUMN "public"."users"."partner_id" IS 'ID do parceiro(a) quando em modo casal';



COMMENT ON COLUMN "public"."users"."monthly_savings_goal" IS 'Meta percentual de economia mensal';



COMMENT ON COLUMN "public"."users"."closing_day" IS 'Dia do mês para fechamento do ciclo financeiro';



COMMENT ON COLUMN "public"."users"."nickname" IS 'Apelido do usuário para uso em mensagens personalizadas';



CREATE OR REPLACE VIEW "public"."v_all_transactions" AS
 SELECT "t"."id",
    "t"."user_id",
    "t"."account_id",
    "t"."category_id",
    "t"."type",
    "t"."amount",
    "t"."description",
    "t"."transaction_date",
    "t"."is_paid",
    "t"."payment_method",
    "t"."created_at",
    'transaction'::"text" AS "source_type",
    NULL::"uuid" AS "credit_card_id",
    NULL::"text" AS "credit_card_name",
    "c"."name" AS "category_name",
    "c"."icon" AS "category_icon",
    "c"."color" AS "category_color",
    "a"."name" AS "account_name"
   FROM (("public"."transactions" "t"
     LEFT JOIN "public"."categories" "c" ON (("t"."category_id" = "c"."id")))
     LEFT JOIN "public"."accounts" "a" ON (("t"."account_id" = "a"."id")))
UNION ALL
 SELECT "cct"."id",
    "cct"."user_id",
    NULL::"uuid" AS "account_id",
    "cct"."category_id",
    'expense'::"text" AS "type",
    "cct"."amount",
    "cct"."description",
    "cct"."purchase_date" AS "transaction_date",
    false AS "is_paid",
    'credit'::"text" AS "payment_method",
    "cct"."created_at",
    'credit_card'::"text" AS "source_type",
    "cct"."credit_card_id",
    "cc"."name" AS "credit_card_name",
    "c"."name" AS "category_name",
    "c"."icon" AS "category_icon",
    "c"."color" AS "category_color",
    "cc"."name" AS "account_name"
   FROM (("public"."credit_card_transactions" "cct"
     LEFT JOIN "public"."categories" "c" ON (("cct"."category_id" = "c"."id")))
     LEFT JOIN "public"."credit_cards" "cc" ON (("cct"."credit_card_id" = "cc"."id")));


ALTER VIEW "public"."v_all_transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_bills_summary" AS
 SELECT "user_id",
    ("date_trunc"('month'::"text", ("due_date")::timestamp with time zone))::"date" AS "month_date",
    "count"(*) AS "total_bills",
    "count"(*) FILTER (WHERE (("status")::"text" = 'pending'::"text")) AS "pending_count",
    "count"(*) FILTER (WHERE (("status")::"text" = 'overdue'::"text")) AS "overdue_count",
    "count"(*) FILTER (WHERE (("status")::"text" = 'paid'::"text")) AS "paid_count",
    "count"(*) FILTER (WHERE (("status")::"text" = 'partial'::"text")) AS "partial_count",
    COALESCE("sum"("amount"), (0)::numeric) AS "total_amount",
    COALESCE("sum"("amount") FILTER (WHERE (("status")::"text" = 'pending'::"text")), (0)::numeric) AS "pending_amount",
    COALESCE("sum"("amount") FILTER (WHERE (("status")::"text" = 'overdue'::"text")), (0)::numeric) AS "overdue_amount",
    COALESCE("sum"("amount") FILTER (WHERE (("status")::"text" = 'paid'::"text")), (0)::numeric) AS "paid_amount",
    COALESCE("sum"(("amount" - COALESCE("paid_amount", (0)::numeric))) FILTER (WHERE (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'overdue'::character varying, 'partial'::character varying])::"text"[]))), (0)::numeric) AS "remaining_amount",
    "count"(*) FILTER (WHERE ((("priority")::"text" = 'critical'::"text") AND (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'overdue'::character varying])::"text"[])))) AS "critical_pending",
    "count"(*) FILTER (WHERE ((("priority")::"text" = 'high'::"text") AND (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'overdue'::character varying])::"text"[])))) AS "high_pending",
    "min"("due_date") FILTER (WHERE (("status")::"text" = 'pending'::"text")) AS "next_due_date",
    "max"("paid_at") FILTER (WHERE (("status")::"text" = 'paid'::"text")) AS "last_payment_date",
    "max"("updated_at") AS "last_updated"
   FROM "public"."payable_bills"
  WHERE ("due_date" >= '2020-01-01'::"date")
  GROUP BY "user_id", ("date_trunc"('month'::"text", ("due_date")::timestamp with time zone))
  ORDER BY "user_id", (("date_trunc"('month'::"text", ("due_date")::timestamp with time zone))::"date") DESC;


ALTER VIEW "public"."v_bills_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_bills_summary" IS 'Resumo mensal agregado de contas a pagar';



CREATE OR REPLACE VIEW "public"."v_credit_card_transactions_with_installments" AS
 SELECT "t"."id",
    "t"."credit_card_id",
    "t"."invoice_id",
    "t"."user_id",
    "t"."category_id",
    "t"."description",
    "t"."amount",
    "t"."purchase_date",
    "t"."is_installment",
    "t"."installment_number",
    "t"."total_installments",
    "t"."installment_group_id",
    "t"."establishment",
    "t"."notes",
    "t"."attachment_url",
    "t"."source",
    "t"."created_at",
    "t"."updated_at",
    "t"."total_amount",
    "t"."is_parent_installment",
        CASE
            WHEN ("t"."is_installment" AND "t"."is_parent_installment") THEN LEAST("t"."total_installments", GREATEST(1, ((EXTRACT(month FROM "age"((CURRENT_DATE)::timestamp with time zone, ("t"."purchase_date")::timestamp with time zone)))::integer + 1)))
            ELSE "t"."installment_number"
        END AS "current_installment_number",
    "cc"."name" AS "credit_card_name",
    "cat"."name" AS "category_name",
    "cat"."icon" AS "category_icon"
   FROM (("public"."credit_card_transactions" "t"
     LEFT JOIN "public"."credit_cards" "cc" ON (("t"."credit_card_id" = "cc"."id")))
     LEFT JOIN "public"."categories" "cat" ON (("t"."category_id" = "cat"."id")));


ALTER VIEW "public"."v_credit_card_transactions_with_installments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_credit_cards_summary" AS
 SELECT "cc"."id",
    "cc"."user_id",
    "cc"."name",
    "cc"."brand",
    "cc"."last_four_digits",
    "cc"."credit_limit",
    "cc"."available_limit",
    "cc"."closing_day",
    "cc"."due_day",
    "cc"."color",
    "cc"."icon",
    "cc"."is_active",
    "cc"."is_archived",
    "cc"."created_at",
    "cc"."issuing_bank",
    "ci_current"."id" AS "current_invoice_id",
    "ci_current"."total_amount" AS "current_invoice_amount",
    "ci_current"."due_date" AS "current_due_date",
    "ci_current"."status" AS "current_invoice_status",
    "ci_next"."id" AS "next_invoice_id",
    "ci_next"."total_amount" AS "next_invoice_amount",
    "ci_next"."due_date" AS "next_due_date",
    ("cc"."credit_limit" - "cc"."available_limit") AS "used_limit",
    "round"(((("cc"."credit_limit" - "cc"."available_limit") / NULLIF("cc"."credit_limit", (0)::numeric)) * (100)::numeric), 2) AS "usage_percentage",
    ( SELECT "count"(*) AS "count"
           FROM "public"."credit_card_transactions"
          WHERE ("credit_card_transactions"."credit_card_id" = "cc"."id")) AS "total_transactions",
    ( SELECT "count"(*) AS "count"
           FROM "public"."credit_card_invoices"
          WHERE (("credit_card_invoices"."credit_card_id" = "cc"."id") AND (("credit_card_invoices"."status")::"text" = 'paid'::"text"))) AS "paid_invoices_count"
   FROM (("public"."credit_cards" "cc"
     LEFT JOIN LATERAL ( SELECT "credit_card_invoices"."id",
            "credit_card_invoices"."total_amount",
            "credit_card_invoices"."due_date",
            "credit_card_invoices"."status"
           FROM "public"."credit_card_invoices"
          WHERE (("credit_card_invoices"."credit_card_id" = "cc"."id") AND (("credit_card_invoices"."status")::"text" = ANY (ARRAY[('open'::character varying)::"text", ('partial'::character varying)::"text"])) AND ("credit_card_invoices"."reference_month" <= ("date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone) + '1 mon'::interval)))
          ORDER BY
                CASE
                    WHEN ("date_trunc"('month'::"text", ("credit_card_invoices"."reference_month")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)) THEN 0
                    ELSE 1
                END, "credit_card_invoices"."due_date"
         LIMIT 1) "ci_current" ON (true))
     LEFT JOIN LATERAL ( SELECT "credit_card_invoices"."id",
            "credit_card_invoices"."total_amount",
            "credit_card_invoices"."due_date"
           FROM "public"."credit_card_invoices"
          WHERE (("credit_card_invoices"."credit_card_id" = "cc"."id") AND (("credit_card_invoices"."status")::"text" = ANY (ARRAY[('open'::character varying)::"text", ('partial'::character varying)::"text"])) AND ("credit_card_invoices"."id" <> COALESCE("ci_current"."id", '00000000-0000-0000-0000-000000000000'::"uuid")))
          ORDER BY "credit_card_invoices"."due_date"
         LIMIT 1) "ci_next" ON (true))
  WHERE (("cc"."is_active" = true) AND ("cc"."is_archived" = false));


ALTER VIEW "public"."v_credit_cards_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_investment_performance" AS
 SELECT "user_id",
    "category",
    "count"(*) AS "asset_count",
    "sum"("current_value") AS "total_value",
    "sum"("total_invested") AS "total_invested",
    "sum"(("current_value" - "total_invested")) AS "total_return",
        CASE
            WHEN ("sum"("total_invested") > (0)::numeric) THEN "avg"(((("current_value" - "total_invested") / NULLIF("total_invested", (0)::numeric)) * (100)::numeric))
            ELSE (0)::numeric
        END AS "avg_return_pct",
    "avg"("dividend_yield") AS "avg_dividend_yield"
   FROM "public"."investments" "i"
  WHERE (("is_active" = true) AND ("status" = 'active'::"text") AND ("category" IS NOT NULL))
  GROUP BY "user_id", "category";


ALTER VIEW "public"."v_investment_performance" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_investment_performance" IS 'Performance por categoria de ativo';



CREATE OR REPLACE VIEW "public"."v_invoices_detailed" AS
SELECT
    NULL::"uuid" AS "invoice_id",
    NULL::"uuid" AS "credit_card_id",
    NULL::character varying(100) AS "card_name",
    NULL::character varying(50) AS "brand",
    NULL::character varying(4) AS "last_four_digits",
    NULL::"uuid" AS "user_id",
    NULL::"date" AS "reference_month",
    NULL::"date" AS "closing_date",
    NULL::"date" AS "due_date",
    NULL::character varying(20) AS "status",
    NULL::numeric(12,2) AS "total_amount",
    NULL::numeric(12,2) AS "paid_amount",
    NULL::numeric(12,2) AS "remaining_amount",
    NULL::timestamp with time zone AS "payment_date",
    NULL::bigint AS "transaction_count",
    NULL::bigint AS "payment_count",
    NULL::numeric AS "transactions_sum",
    NULL::numeric AS "payments_sum",
    NULL::boolean AS "is_overdue",
    NULL::integer AS "days_until_due";


ALTER VIEW "public"."v_invoices_detailed" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_monthly_budget_summary" AS
 SELECT "user_id",
    "month",
    "planned_income",
    "total_planned",
    "total_actual",
    ("planned_income" - "total_planned") AS "balance_expected",
    ("planned_income" - "total_actual") AS "balance_actual"
   FROM "public"."budget_summaries" "bs";


ALTER VIEW "public"."v_monthly_budget_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_portfolio_summary" AS
 SELECT "user_id",
    "count"(*) AS "total_assets",
    "sum"("total_invested") AS "total_invested",
    "sum"("current_value") AS "current_value",
    "sum"(("current_value" - "total_invested")) AS "total_return",
        CASE
            WHEN ("sum"("total_invested") > (0)::numeric) THEN ((("sum"("current_value") - "sum"("total_invested")) / "sum"("total_invested")) * (100)::numeric)
            ELSE (0)::numeric
        END AS "return_percentage",
    "count"(DISTINCT "category") AS "categories_count",
    "count"(DISTINCT "account_id") AS "accounts_count",
    "max"("updated_at") AS "last_updated"
   FROM "public"."investments" "i"
  WHERE (("is_active" = true) AND ("status" = 'active'::"text"))
  GROUP BY "user_id";


ALTER VIEW "public"."v_portfolio_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_portfolio_summary" IS 'Resumo consolidado do portfólio por usuário';



CREATE OR REPLACE VIEW "public"."v_recurring_bills_history" AS
 WITH "recurring_templates" AS (
         SELECT "payable_bills"."id" AS "template_id",
            "payable_bills"."user_id",
            "payable_bills"."provider_name",
            "payable_bills"."bill_type",
            "payable_bills"."description",
            "payable_bills"."recurrence_config"
           FROM "public"."payable_bills"
          WHERE (("payable_bills"."is_recurring" = true) AND ("payable_bills"."parent_bill_id" IS NULL))
        ), "occurrences" AS (
         SELECT "pb"."id",
            "pb"."user_id",
            "pb"."description",
            "pb"."amount",
            "pb"."due_date",
            "pb"."bill_type",
            "pb"."provider_name",
            "pb"."category_id",
            "pb"."status",
            "pb"."paid_at",
            "pb"."paid_amount",
            "pb"."payment_account_id",
            "pb"."payment_method",
            "pb"."barcode",
            "pb"."qr_code_pix",
            "pb"."reference_number",
            "pb"."bill_document_url",
            "pb"."payment_proof_url",
            "pb"."is_recurring",
            "pb"."recurrence_config",
            "pb"."parent_bill_id",
            "pb"."next_occurrence_date",
            "pb"."is_installment",
            "pb"."installment_number",
            "pb"."installment_total",
            "pb"."installment_group_id",
            "pb"."original_purchase_amount",
            "pb"."reminder_enabled",
            "pb"."reminder_days_before",
            "pb"."reminder_channels",
            "pb"."last_reminder_sent_at",
            "pb"."priority",
            "pb"."tags",
            "pb"."notes",
            "pb"."created_at",
            "pb"."updated_at",
            "rt"."template_id",
            "lag"("pb"."amount") OVER (PARTITION BY "pb"."parent_bill_id" ORDER BY "pb"."due_date") AS "previous_amount",
            "lead"("pb"."due_date") OVER (PARTITION BY "pb"."parent_bill_id" ORDER BY "pb"."due_date") AS "next_due_date",
            "row_number"() OVER (PARTITION BY "pb"."parent_bill_id" ORDER BY "pb"."due_date" DESC) AS "recency_rank"
           FROM ("public"."payable_bills" "pb"
             JOIN "recurring_templates" "rt" ON (("pb"."parent_bill_id" = "rt"."template_id")))
          WHERE ("pb"."is_installment" = false)
        )
 SELECT "id",
    "user_id",
    "description",
    "amount",
    "due_date",
    "bill_type",
    "provider_name",
    "category_id",
    "status",
    "paid_at",
    "paid_amount",
    "payment_account_id",
    "payment_method",
    "barcode",
    "qr_code_pix",
    "reference_number",
    "bill_document_url",
    "payment_proof_url",
    "is_recurring",
    "recurrence_config",
    "parent_bill_id",
    "next_occurrence_date",
    "is_installment",
    "installment_number",
    "installment_total",
    "installment_group_id",
    "original_purchase_amount",
    "reminder_enabled",
    "reminder_days_before",
    "reminder_channels",
    "last_reminder_sent_at",
    "priority",
    "tags",
    "notes",
    "created_at",
    "updated_at",
    "template_id",
    "previous_amount",
    "next_due_date",
    "recency_rank",
        CASE
            WHEN (("previous_amount" IS NOT NULL) AND ("previous_amount" > (0)::numeric)) THEN "round"(((("amount" - "previous_amount") / "previous_amount") * (100)::numeric), 2)
            ELSE NULL::numeric
        END AS "variation_percentage",
        CASE
            WHEN ("recency_rank" = 1) THEN true
            ELSE false
        END AS "is_latest",
    ("date_part"('month'::"text", "age"((CURRENT_DATE)::timestamp with time zone, ("due_date")::timestamp with time zone)))::integer AS "months_ago"
   FROM "occurrences"
  ORDER BY "user_id", "template_id", "due_date" DESC;


ALTER VIEW "public"."v_recurring_bills_history" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_recurring_bills_history" IS 'Histórico de contas recorrentes com variação %';



CREATE OR REPLACE VIEW "public"."v_recurring_bills_trend" AS
 WITH "monthly_data" AS (
         SELECT "pb"."parent_recurring_id",
            "parent"."description",
            "parent"."provider_name",
            "date_trunc"('month'::"text", ("pb"."due_date")::timestamp with time zone) AS "month",
            "avg"("pb"."amount") AS "avg_amount",
            "min"("pb"."amount") AS "min_amount",
            "max"("pb"."amount") AS "max_amount",
            "stddev"("pb"."amount") AS "stddev_amount",
            "count"(*) AS "occurrences_count"
           FROM ("public"."payable_bills" "pb"
             JOIN "public"."payable_bills" "parent" ON (("pb"."parent_recurring_id" = "parent"."id")))
          WHERE ("pb"."parent_recurring_id" IS NOT NULL)
          GROUP BY "pb"."parent_recurring_id", "parent"."description", "parent"."provider_name", ("date_trunc"('month'::"text", ("pb"."due_date")::timestamp with time zone))
        ), "with_variation" AS (
         SELECT "monthly_data"."parent_recurring_id",
            "monthly_data"."description",
            "monthly_data"."provider_name",
            "monthly_data"."month",
            "monthly_data"."avg_amount",
            "monthly_data"."min_amount",
            "monthly_data"."max_amount",
            "monthly_data"."stddev_amount",
            "monthly_data"."occurrences_count",
            "lag"("monthly_data"."avg_amount") OVER (PARTITION BY "monthly_data"."parent_recurring_id" ORDER BY "monthly_data"."month") AS "previous_month_amount",
            ((("monthly_data"."avg_amount" - "lag"("monthly_data"."avg_amount") OVER (PARTITION BY "monthly_data"."parent_recurring_id" ORDER BY "monthly_data"."month")) / NULLIF("lag"("monthly_data"."avg_amount") OVER (PARTITION BY "monthly_data"."parent_recurring_id" ORDER BY "monthly_data"."month"), (0)::numeric)) * (100)::numeric) AS "variation_percent"
           FROM "monthly_data"
        )
 SELECT "parent_recurring_id",
    "description",
    "provider_name",
    "month",
    "avg_amount",
    "min_amount",
    "max_amount",
    COALESCE("stddev_amount", (0)::numeric) AS "stddev_amount",
    "occurrences_count",
    COALESCE("variation_percent", (0)::numeric) AS "variation_percent",
    "previous_month_amount"
   FROM "with_variation"
  ORDER BY "parent_recurring_id", "month" DESC;


ALTER VIEW "public"."v_recurring_bills_trend" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_reminders_brasilia" AS
 SELECT "br"."id",
    "br"."bill_id",
    "pb"."description" AS "bill_description",
    "br"."reminder_date",
    "br"."reminder_time",
    "br"."channel",
    "br"."status",
    "u"."full_name",
    "u"."email",
    "public"."current_date_brasilia"() AS "today_brasilia",
    "public"."current_time_brasilia"() AS "now_brasilia",
        CASE
            WHEN ("br"."reminder_date" < "public"."current_date_brasilia"()) THEN 'Atrasado'::"text"
            WHEN (("br"."reminder_date" = "public"."current_date_brasilia"()) AND ("br"."reminder_time" <= "public"."current_time_brasilia"())) THEN 'Pronto'::"text"
            WHEN ("br"."reminder_date" = "public"."current_date_brasilia"()) THEN 'Hoje'::"text"
            ELSE 'Futuro'::"text"
        END AS "status_timing"
   FROM (("public"."bill_reminders" "br"
     JOIN "public"."payable_bills" "pb" ON (("pb"."id" = "br"."bill_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "br"."user_id")))
  ORDER BY "br"."reminder_date", "br"."reminder_time";


ALTER VIEW "public"."v_reminders_brasilia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_endpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "url" "text" NOT NULL,
    "http_method" "public"."http_method" DEFAULT 'POST'::"public"."http_method" NOT NULL,
    "auth_type" "public"."auth_type" DEFAULT 'none'::"public"."auth_type" NOT NULL,
    "auth_token_encrypted" "text",
    "auth_username" character varying(200),
    "auth_password_encrypted" "text",
    "custom_headers" "jsonb" DEFAULT '{}'::"jsonb",
    "retry_enabled" boolean DEFAULT true,
    "retry_max_attempts" integer DEFAULT 3,
    "retry_delay_seconds" integer DEFAULT 60,
    "is_active" boolean DEFAULT true NOT NULL,
    "total_calls" integer DEFAULT 0,
    "success_calls" integer DEFAULT 0,
    "failed_calls" integer DEFAULT 0,
    "last_triggered_at" timestamp with time zone,
    "last_status_code" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "webhook_endpoints_retry_delay_seconds_check" CHECK (("retry_delay_seconds" >= 10)),
    CONSTRAINT "webhook_endpoints_retry_max_attempts_check" CHECK ((("retry_max_attempts" >= 1) AND ("retry_max_attempts" <= 10))),
    CONSTRAINT "webhook_endpoints_url_check" CHECK (("url" ~* '^https?://'::"text"))
);


ALTER TABLE "public"."webhook_endpoints" OWNER TO "postgres";


COMMENT ON TABLE "public"."webhook_endpoints" IS 'Webhooks configurados pelo usuário (N8N endpoints)';



COMMENT ON COLUMN "public"."webhook_endpoints"."custom_headers" IS 'Headers HTTP customizados em formato JSON';



COMMENT ON COLUMN "public"."webhook_endpoints"."retry_max_attempts" IS 'Número máximo de tentativas em caso de falha';



CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "request_payload" "jsonb",
    "request_headers" "jsonb",
    "request_method" "public"."http_method" NOT NULL,
    "response_status_code" integer,
    "response_body" "text",
    "response_headers" "jsonb",
    "response_time_ms" integer,
    "status" "public"."webhook_log_status" DEFAULT 'pending'::"public"."webhook_log_status" NOT NULL,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "next_retry_at" timestamp with time zone,
    "triggered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."webhook_logs" IS 'Histórico de chamadas de webhooks com request/response completos';



COMMENT ON COLUMN "public"."webhook_logs"."response_time_ms" IS 'Tempo de resposta do webhook em milissegundos';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "instance_id" "text" NOT NULL,
    "instance_token" "text" NOT NULL,
    "instance_name" "text",
    "status" "text" DEFAULT 'disconnected'::"text",
    "connected" boolean DEFAULT false,
    "logged_in" boolean DEFAULT false,
    "jid" "text",
    "profile_name" "text",
    "profile_pic_url" "text",
    "is_business" boolean DEFAULT false,
    "last_disconnect" timestamp with time zone,
    "last_disconnect_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "qr_code" "text",
    "qr_code_expires_at" timestamp with time zone,
    "phone_number" "text"
);


ALTER TABLE "public"."whatsapp_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."whatsapp_conversation_context" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid" DEFAULT "gen_random_uuid"(),
    "last_message_id" "uuid",
    "current_intent" "public"."intent_type",
    "awaiting_confirmation" boolean DEFAULT false,
    "confirmation_data" "jsonb",
    "message_count" integer DEFAULT 0,
    "last_interaction_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:30:00'::interval),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."whatsapp_conversation_context" OWNER TO "postgres";


COMMENT ON TABLE "public"."whatsapp_conversation_context" IS 'Contexto de conversas ativas para manter estado';



COMMENT ON COLUMN "public"."whatsapp_conversation_context"."expires_at" IS 'Contexto expira após 30 minutos de inatividade';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "whatsapp_message_id" "text",
    "phone_number" character varying(20) NOT NULL,
    "message_type" "public"."whatsapp_message_type" DEFAULT 'text'::"public"."whatsapp_message_type" NOT NULL,
    "direction" "public"."message_direction" NOT NULL,
    "content" "text",
    "media_url" "text",
    "media_mime_type" character varying(100),
    "intent" "public"."intent_type",
    "processing_status" "public"."processing_status" DEFAULT 'pending'::"public"."processing_status",
    "processed_at" timestamp with time zone,
    "extracted_data" "jsonb",
    "response_text" "text",
    "response_sent_at" timestamp with time zone,
    "error_message" "text",
    "retry_count" integer DEFAULT 0,
    "metadata" "jsonb",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_phone_number" CHECK ((("phone_number")::"text" ~ '^\+?[1-9]\d{1,14}$'::"text"))
);


ALTER TABLE "public"."whatsapp_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."whatsapp_messages" IS 'Histórico completo de mensagens WhatsApp (enviadas e recebidas)';



COMMENT ON COLUMN "public"."whatsapp_messages"."extracted_data" IS 'Dados extraídos por LLM para lançamentos: {amount, category, description, date}';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_quick_commands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "command" character varying(50) NOT NULL,
    "aliases" "text"[],
    "description" "text" NOT NULL,
    "example" "text",
    "category" character varying(50),
    "response_template" "text",
    "requires_params" boolean DEFAULT false,
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."whatsapp_quick_commands" OWNER TO "postgres";


COMMENT ON TABLE "public"."whatsapp_quick_commands" IS 'Comandos rápidos disponíveis via WhatsApp';



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_action_log"
    ADD CONSTRAINT "agent_action_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_daily_sessions"
    ADD CONSTRAINT "agent_daily_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_daily_sessions"
    ADD CONSTRAINT "agent_daily_sessions_user_id_session_date_key" UNIQUE ("user_id", "session_date");



ALTER TABLE ONLY "public"."agent_identity"
    ADD CONSTRAINT "agent_identity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_identity"
    ADD CONSTRAINT "agent_identity_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."agent_memory_entries"
    ADD CONSTRAINT "agent_memory_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_memory_episodes"
    ADD CONSTRAINT "agent_memory_episodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_pending_tasks"
    ADD CONSTRAINT "agent_pending_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_provider_configs"
    ADD CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_provider_configs"
    ADD CONSTRAINT "ai_provider_configs_user_provider_unique" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."ana_clara_config"
    ADD CONSTRAINT "ana_clara_config_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."ana_clara_group_message_memory"
    ADD CONSTRAINT "ana_clara_group_message_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ana_insights_cache"
    ADD CONSTRAINT "ana_insights_cache_pkey" PRIMARY KEY ("user_id", "insight_type");



ALTER TABLE ONLY "public"."badge_progress"
    ADD CONSTRAINT "badge_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."badge_progress"
    ADD CONSTRAINT "badge_progress_user_id_badge_id_tier_key" UNIQUE ("user_id", "badge_id", "tier");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_payment_history"
    ADD CONSTRAINT "bill_payment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_reminders"
    ADD CONSTRAINT "bill_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bill_tags"
    ADD CONSTRAINT "bill_tags_pkey" PRIMARY KEY ("bill_id", "tag_id");



ALTER TABLE ONLY "public"."budget_summaries"
    ADD CONSTRAINT "budget_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_summaries"
    ADD CONSTRAINT "budget_summaries_unique_user_month" UNIQUE ("user_id", "month");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_unique_user_cat_month" UNIQUE ("user_id", "category_id", "month");



ALTER TABLE ONLY "public"."calendar_event_occurrence_overrides"
    ADD CONSTRAINT "calendar_event_occurrence_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_event_recurrence_rules"
    ADD CONSTRAINT "calendar_event_recurrence_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_event_reminders"
    ADD CONSTRAINT "calendar_event_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_external_event_links"
    ADD CONSTRAINT "calendar_external_event_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_reminder_schedule"
    ADD CONSTRAINT "calendar_reminder_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_sync_jobs"
    ADD CONSTRAINT "calendar_sync_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_rules"
    ADD CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."category_rules"
    ADD CONSTRAINT "category_rules_user_id_merchant_pattern_key" UNIQUE ("user_id", "merchant_pattern");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_context"
    ADD CONSTRAINT "conversation_context_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_card_invoices"
    ADD CONSTRAINT "credit_card_invoices_credit_card_id_reference_month_key" UNIQUE ("credit_card_id", "reference_month");



ALTER TABLE ONLY "public"."credit_card_invoices"
    ADD CONSTRAINT "credit_card_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_card_transaction_tags"
    ADD CONSTRAINT "credit_card_transaction_tags_credit_card_transaction_id_tag_key" UNIQUE ("credit_card_transaction_id", "tag_id");



ALTER TABLE ONLY "public"."credit_card_transaction_tags"
    ADD CONSTRAINT "credit_card_transaction_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_card_transactions"
    ADD CONSTRAINT "credit_card_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credit_cards"
    ADD CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_daily_tips"
    ADD CONSTRAINT "education_daily_tips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_daily_tips"
    ADD CONSTRAINT "education_daily_tips_user_dedupe_unique" UNIQUE ("user_id", "dedupe_key");



ALTER TABLE ONLY "public"."education_glossary_terms"
    ADD CONSTRAINT "education_glossary_terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_glossary_terms"
    ADD CONSTRAINT "education_glossary_terms_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."education_lessons"
    ADD CONSTRAINT "education_lessons_module_slug_unique" UNIQUE ("module_id", "slug");



ALTER TABLE ONLY "public"."education_lessons"
    ADD CONSTRAINT "education_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_modules"
    ADD CONSTRAINT "education_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_modules"
    ADD CONSTRAINT "education_modules_track_slug_unique" UNIQUE ("track_id", "slug");



ALTER TABLE ONLY "public"."education_tracks"
    ADD CONSTRAINT "education_tracks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_tracks"
    ADD CONSTRAINT "education_tracks_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."education_user_profile"
    ADD CONSTRAINT "education_user_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_user_profile"
    ADD CONSTRAINT "education_user_profile_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."education_user_progress"
    ADD CONSTRAINT "education_user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_user_progress"
    ADD CONSTRAINT "education_user_progress_user_lesson_unique" UNIQUE ("user_id", "lesson_id");



ALTER TABLE ONLY "public"."financial_cycles"
    ADD CONSTRAINT "financial_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_goal_contributions"
    ADD CONSTRAINT "financial_goal_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_goals"
    ADD CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_goals"
    ADD CONSTRAINT "financial_goals_user_id_category_id_period_type_period_star_key" UNIQUE ("user_id", "category_id", "period_type", "period_start");



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_user_type_unique" UNIQUE ("user_id", "integration_type");



ALTER TABLE ONLY "public"."investment_accounts"
    ADD CONSTRAINT "investment_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_alerts"
    ADD CONSTRAINT "investment_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_allocation_targets"
    ADD CONSTRAINT "investment_allocation_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_allocation_targets"
    ADD CONSTRAINT "investment_allocation_targets_user_id_asset_class_key" UNIQUE ("user_id", "asset_class");



ALTER TABLE ONLY "public"."investment_goal_contributions"
    ADD CONSTRAINT "investment_goal_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_goals"
    ADD CONSTRAINT "investment_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_quotes_history"
    ADD CONSTRAINT "investment_quotes_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investment_quotes_history"
    ADD CONSTRAINT "investment_quotes_history_symbol_timestamp_key" UNIQUE ("symbol", "timestamp");



ALTER TABLE ONLY "public"."investment_transactions"
    ADD CONSTRAINT "investment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_profile_assessments"
    ADD CONSTRAINT "investor_profile_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_opportunities"
    ADD CONSTRAINT "market_opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications_log"
    ADD CONSTRAINT "notifications_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_event_recurrence_rules"
    ADD CONSTRAINT "one_rule_per_event" UNIQUE ("event_id");



ALTER TABLE ONLY "public"."payable_bills"
    ADD CONSTRAINT "payable_bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolio_snapshots"
    ADD CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolio_snapshots"
    ADD CONSTRAINT "portfolio_snapshots_user_id_snapshot_date_key" UNIQUE ("user_id", "snapshot_date");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."savings_goals"
    ADD CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_edits"
    ADD CONSTRAINT "transaction_edits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_tags"
    ADD CONSTRAINT "transaction_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_temp_id_key" UNIQUE ("temp_id");



ALTER TABLE ONLY "public"."conversation_context"
    ADD CONSTRAINT "uniq_conversation_context_user_phone_type" UNIQUE ("user_id", "phone", "context_type");



ALTER TABLE ONLY "public"."calendar_external_event_links"
    ADD CONSTRAINT "unique_event_provider" UNIQUE ("event_id", "provider");



ALTER TABLE ONLY "public"."calendar_external_event_links"
    ADD CONSTRAINT "unique_external_object" UNIQUE ("provider", "external_object_id");



ALTER TABLE ONLY "public"."calendar_event_occurrence_overrides"
    ADD CONSTRAINT "unique_occurrence_override" UNIQUE ("event_id", "occurrence_key");



ALTER TABLE ONLY "public"."calendar_reminder_schedule"
    ADD CONSTRAINT "unique_reminder_occurrence_channel" UNIQUE ("reminder_id", "occurrence_key", "channel");



ALTER TABLE ONLY "public"."calendar_reminder_schedule"
    ADD CONSTRAINT "unique_reminder_schedule_idempotency" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."calendar_sync_jobs"
    ADD CONSTRAINT "unique_sync_idempotency" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."transaction_tags"
    ADD CONSTRAINT "unique_transaction_tag" UNIQUE ("transaction_id", "tag_id");



ALTER TABLE ONLY "public"."whatsapp_connections"
    ADD CONSTRAINT "unique_user_connection" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "unique_user_tag_name" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_achievement_id_tier_key" UNIQUE ("user_id", "achievement_id", "tier");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_badge_id_key" UNIQUE ("user_id", "badge_id");



ALTER TABLE ONLY "public"."user_gamification"
    ADD CONSTRAINT "user_gamification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_gamification_profile"
    ADD CONSTRAINT "user_gamification_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_gamification_profile"
    ADD CONSTRAINT "user_gamification_profile_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_gamification"
    ADD CONSTRAINT "user_gamification_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_memory"
    ADD CONSTRAINT "user_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_memory"
    ADD CONSTRAINT "user_memory_user_id_tipo_chave_key" UNIQUE ("user_id", "tipo", "chave");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_endpoints"
    ADD CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_connections"
    ADD CONSTRAINT "whatsapp_connections_instance_id_key" UNIQUE ("instance_id");



ALTER TABLE ONLY "public"."whatsapp_connections"
    ADD CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_conversation_context"
    ADD CONSTRAINT "whatsapp_conversation_context_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_conversation_context"
    ADD CONSTRAINT "whatsapp_conversation_context_user_id_conversation_id_key" UNIQUE ("user_id", "conversation_id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_whatsapp_message_id_key" UNIQUE ("whatsapp_message_id");



ALTER TABLE ONLY "public"."whatsapp_quick_commands"
    ADD CONSTRAINT "whatsapp_quick_commands_command_key" UNIQUE ("command");



ALTER TABLE ONLY "public"."whatsapp_quick_commands"
    ADD CONSTRAINT "whatsapp_quick_commands_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "credit_cards_user_id_last_four_digits_active_key" ON "public"."credit_cards" USING "btree" ("user_id", "last_four_digits") WHERE ("is_archived" = false);



CREATE INDEX "idx_accounts_is_active" ON "public"."accounts" USING "btree" ("is_active");



CREATE INDEX "idx_accounts_type" ON "public"."accounts" USING "btree" ("type");



CREATE INDEX "idx_accounts_user_id" ON "public"."accounts" USING "btree" ("user_id");



CREATE INDEX "idx_agent_action_log_user" ON "public"."agent_action_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_agent_memory_embedding" ON "public"."agent_memory_entries" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_agent_memory_episodes_expires" ON "public"."agent_memory_episodes" USING "btree" ("expires_at");



CREATE INDEX "idx_agent_memory_episodes_user_created" ON "public"."agent_memory_episodes" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_agent_memory_episodes_user_importance" ON "public"."agent_memory_episodes" USING "btree" ("user_id", "importance" DESC, "created_at" DESC);



CREATE INDEX "idx_agent_memory_fts" ON "public"."agent_memory_entries" USING "gin" ("to_tsvector"('"portuguese"'::"regconfig", "content"));



CREATE INDEX "idx_agent_memory_reinforcement" ON "public"."agent_memory_entries" USING "btree" ("user_id", "memory_type", "confidence" DESC, "last_reinforced_at" DESC);



CREATE INDEX "idx_agent_memory_tags" ON "public"."agent_memory_entries" USING "gin" ("tags");



CREATE INDEX "idx_agent_memory_type" ON "public"."agent_memory_entries" USING "btree" ("user_id", "memory_type");



CREATE INDEX "idx_agent_memory_user" ON "public"."agent_memory_entries" USING "btree" ("user_id");



CREATE INDEX "idx_ai_provider_configs_active" ON "public"."ai_provider_configs" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_ai_provider_configs_default" ON "public"."ai_provider_configs" USING "btree" ("user_id", "is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_ai_provider_configs_user_id" ON "public"."ai_provider_configs" USING "btree" ("user_id");



CREATE INDEX "idx_allocation_targets_user" ON "public"."investment_allocation_targets" USING "btree" ("user_id");



CREATE INDEX "idx_ana_cache_expiration" ON "public"."ana_insights_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_ana_cache_user" ON "public"."ana_insights_cache" USING "btree" ("user_id");



CREATE INDEX "idx_ana_clara_config_enabled" ON "public"."ana_clara_config" USING "btree" ("user_id") WHERE ("is_enabled" = true);



CREATE INDEX "idx_ana_clara_group_memory_expires" ON "public"."ana_clara_group_message_memory" USING "btree" ("expires_at");



CREATE INDEX "idx_ana_clara_group_memory_user_group_created" ON "public"."ana_clara_group_message_memory" USING "btree" ("user_id", "group_jid", "created_at" DESC);



CREATE INDEX "idx_ana_insights_cache_expires_at" ON "public"."ana_insights_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_badge_progress_badge_id" ON "public"."badge_progress" USING "btree" ("badge_id");



CREATE INDEX "idx_badge_progress_unlocked" ON "public"."badge_progress" USING "btree" ("user_id", "unlocked");



CREATE INDEX "idx_badge_progress_user_id" ON "public"."badge_progress" USING "btree" ("user_id");



CREATE INDEX "idx_bill_payment_history_account" ON "public"."bill_payment_history" USING "btree" ("account_from_id") WHERE ("account_from_id" IS NOT NULL);



CREATE INDEX "idx_bill_payment_history_bill" ON "public"."bill_payment_history" USING "btree" ("bill_id", "payment_date" DESC);



CREATE INDEX "idx_bill_payment_history_user_date" ON "public"."bill_payment_history" USING "btree" ("user_id", "payment_date" DESC);



CREATE INDEX "idx_bill_reminders_bill" ON "public"."bill_reminders" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_reminders_channel" ON "public"."bill_reminders" USING "btree" ("channel");



CREATE INDEX "idx_bill_reminders_pending" ON "public"."bill_reminders" USING "btree" ("reminder_date", "reminder_time", "reminder_type") WHERE (("status")::"text" = 'pending'::"text");



CREATE INDEX "idx_bill_reminders_retry" ON "public"."bill_reminders" USING "btree" ("retry_count") WHERE ((("status")::"text" = 'pending'::"text") AND ("retry_count" < 3));



CREATE INDEX "idx_bill_reminders_scheduled" ON "public"."bill_reminders" USING "btree" ("reminder_date", "scheduled_time", "status") WHERE (("status")::"text" = 'pending'::"text");



CREATE INDEX "idx_bill_reminders_user_date" ON "public"."bill_reminders" USING "btree" ("user_id", "reminder_date", "reminder_time");



CREATE INDEX "idx_bill_tags_bill_id" ON "public"."bill_tags" USING "btree" ("bill_id");



CREATE INDEX "idx_bill_tags_bill_id_tag_id" ON "public"."bill_tags" USING "btree" ("bill_id", "tag_id");



CREATE INDEX "idx_bill_tags_tag_id" ON "public"."bill_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_budget_summaries_user_month" ON "public"."budget_summaries" USING "btree" ("user_id", "month");



CREATE INDEX "idx_budgets_category" ON "public"."budgets" USING "btree" ("category_id");



CREATE INDEX "idx_budgets_user_month" ON "public"."budgets" USING "btree" ("user_id", "month");



CREATE INDEX "idx_calendar_events_sync_eligible" ON "public"."calendar_events" USING "btree" ("user_id", "sync_eligible") WHERE (("sync_eligible" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_calendar_events_user_id" ON "public"."calendar_events" USING "btree" ("user_id");



CREATE INDEX "idx_calendar_events_user_window" ON "public"."calendar_events" USING "btree" ("user_id", "start_at", "end_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_calendar_external_event_links_origin" ON "public"."calendar_external_event_links" USING "btree" ("origin_type", "origin_id") WHERE ("origin_id" IS NOT NULL);



CREATE INDEX "idx_calendar_links_event" ON "public"."calendar_external_event_links" USING "btree" ("event_id");



CREATE INDEX "idx_calendar_links_provider" ON "public"."calendar_external_event_links" USING "btree" ("provider");



CREATE INDEX "idx_calendar_overrides_event" ON "public"."calendar_event_occurrence_overrides" USING "btree" ("event_id");



CREATE INDEX "idx_calendar_recurrence_event" ON "public"."calendar_event_recurrence_rules" USING "btree" ("event_id");



CREATE INDEX "idx_calendar_reminder_schedule_event" ON "public"."calendar_reminder_schedule" USING "btree" ("event_id");



CREATE INDEX "idx_calendar_reminder_schedule_pending" ON "public"."calendar_reminder_schedule" USING "btree" ("fire_at", "delivery_status") WHERE ("delivery_status" = 'pending'::"public"."calendar_reminder_delivery_status");



CREATE INDEX "idx_calendar_reminders_enabled" ON "public"."calendar_event_reminders" USING "btree" ("event_id", "enabled") WHERE ("enabled" = true);



CREATE INDEX "idx_calendar_reminders_event" ON "public"."calendar_event_reminders" USING "btree" ("event_id");



CREATE INDEX "idx_calendar_sync_jobs_event" ON "public"."calendar_sync_jobs" USING "btree" ("event_id");



CREATE INDEX "idx_calendar_sync_jobs_pending" ON "public"."calendar_sync_jobs" USING "btree" ("run_after", "status") WHERE ("status" = 'pending'::"public"."calendar_sync_job_status");



CREATE INDEX "idx_calendar_sync_jobs_user" ON "public"."calendar_sync_jobs" USING "btree" ("user_id");



CREATE INDEX "idx_categories_keywords" ON "public"."categories" USING "gin" ("keywords");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_categories_type" ON "public"."categories" USING "btree" ("type");



CREATE INDEX "idx_categories_user_id" ON "public"."categories" USING "btree" ("user_id");



CREATE INDEX "idx_category_rules_pattern" ON "public"."category_rules" USING "btree" ("merchant_pattern");



CREATE INDEX "idx_category_rules_user_id" ON "public"."category_rules" USING "btree" ("user_id");



CREATE INDEX "idx_cc_payments_date" ON "public"."credit_card_payments" USING "btree" ("payment_date");



CREATE INDEX "idx_cc_payments_invoice_id" ON "public"."credit_card_payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_cc_payments_user_id" ON "public"."credit_card_payments" USING "btree" ("user_id");



CREATE INDEX "idx_cc_trans_card_id" ON "public"."credit_card_transactions" USING "btree" ("credit_card_id");



CREATE INDEX "idx_cc_trans_installment_group" ON "public"."credit_card_transactions" USING "btree" ("installment_group_id") WHERE ("installment_group_id" IS NOT NULL);



CREATE INDEX "idx_cc_trans_invoice_id" ON "public"."credit_card_transactions" USING "btree" ("invoice_id");



CREATE INDEX "idx_cc_trans_purchase_date" ON "public"."credit_card_transactions" USING "btree" ("purchase_date");



CREATE INDEX "idx_cc_trans_user_id" ON "public"."credit_card_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_cc_transaction_tags_tag" ON "public"."credit_card_transaction_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_cc_transaction_tags_transaction" ON "public"."credit_card_transaction_tags" USING "btree" ("credit_card_transaction_id");



CREATE INDEX "idx_challenges_deadline" ON "public"."challenges" USING "btree" ("deadline") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_challenges_status" ON "public"."challenges" USING "btree" ("user_id", "status");



CREATE INDEX "idx_challenges_user_id" ON "public"."challenges" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_context_expires" ON "public"."conversation_context" USING "btree" ("expires_at" DESC);



CREATE INDEX "idx_conversation_context_user_phone" ON "public"."conversation_context" USING "btree" ("user_id", "phone", "expires_at");



CREATE INDEX "idx_credit_card_transaction_tags_cc_tx_tag_id" ON "public"."credit_card_transaction_tags" USING "btree" ("credit_card_transaction_id", "tag_id");



CREATE INDEX "idx_credit_cards_active" ON "public"."credit_cards" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_credit_cards_user_id" ON "public"."credit_cards" USING "btree" ("user_id");



CREATE INDEX "idx_education_daily_tips_user_created" ON "public"."education_daily_tips" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_education_lessons_module_id" ON "public"."education_lessons" USING "btree" ("module_id");



CREATE INDEX "idx_education_modules_track_id" ON "public"."education_modules" USING "btree" ("track_id");



CREATE INDEX "idx_education_user_progress_lesson_id" ON "public"."education_user_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_education_user_progress_user_id" ON "public"."education_user_progress" USING "btree" ("user_id");



CREATE INDEX "idx_financial_cycles_active" ON "public"."financial_cycles" USING "btree" ("user_id", "active");



CREATE INDEX "idx_financial_cycles_user_id" ON "public"."financial_cycles" USING "btree" ("user_id");



CREATE INDEX "idx_financial_goals_category" ON "public"."financial_goals" USING "btree" ("category_id");



CREATE INDEX "idx_financial_goals_status" ON "public"."financial_goals" USING "btree" ("status");



CREATE INDEX "idx_financial_goals_type" ON "public"."financial_goals" USING "btree" ("goal_type");



CREATE INDEX "idx_financial_goals_user" ON "public"."financial_goals" USING "btree" ("user_id");



CREATE INDEX "idx_goal_contrib_created" ON "public"."financial_goal_contributions" USING "btree" ("created_at");



CREATE INDEX "idx_goal_contrib_goal" ON "public"."financial_goal_contributions" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_contrib_user" ON "public"."financial_goal_contributions" USING "btree" ("user_id");



CREATE INDEX "idx_goal_contributions_date" ON "public"."goal_contributions" USING "btree" ("date" DESC);



CREATE INDEX "idx_goal_contributions_goal" ON "public"."goal_contributions" USING "btree" ("goal_id");



CREATE INDEX "idx_goal_contributions_user" ON "public"."goal_contributions" USING "btree" ("user_id");



CREATE INDEX "idx_integration_configs_active" ON "public"."integration_configs" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_integration_configs_status" ON "public"."integration_configs" USING "btree" ("status");



CREATE INDEX "idx_integration_configs_type" ON "public"."integration_configs" USING "btree" ("integration_type");



CREATE INDEX "idx_integration_configs_user_id" ON "public"."integration_configs" USING "btree" ("user_id");



CREATE INDEX "idx_investment_accounts_active" ON "public"."investment_accounts" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_investment_accounts_user" ON "public"."investment_accounts" USING "btree" ("user_id");



CREATE INDEX "idx_investment_alerts_active" ON "public"."investment_alerts" USING "btree" ("is_active", "last_checked");



CREATE INDEX "idx_investment_alerts_ticker" ON "public"."investment_alerts" USING "btree" ("ticker") WHERE ("is_active" = true);



CREATE INDEX "idx_investment_alerts_user_active" ON "public"."investment_alerts" USING "btree" ("user_id", "is_active");



CREATE INDEX "idx_investment_contributions_date" ON "public"."investment_goal_contributions" USING "btree" ("date" DESC);



CREATE INDEX "idx_investment_contributions_goal" ON "public"."investment_goal_contributions" USING "btree" ("goal_id");



CREATE INDEX "idx_investment_contributions_user" ON "public"."investment_goal_contributions" USING "btree" ("user_id");



CREATE INDEX "idx_investment_goals_linked_investments" ON "public"."investment_goals" USING "gin" ("linked_investments");



CREATE INDEX "idx_investment_goals_status" ON "public"."investment_goals" USING "btree" ("status") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_investment_goals_target_date" ON "public"."investment_goals" USING "btree" ("target_date");



CREATE INDEX "idx_investment_goals_user" ON "public"."investment_goals" USING "btree" ("user_id");



CREATE INDEX "idx_investments_account" ON "public"."investments" USING "btree" ("account_id");



CREATE INDEX "idx_investments_is_active" ON "public"."investments" USING "btree" ("is_active");



CREATE INDEX "idx_investments_ticker" ON "public"."investments" USING "btree" ("ticker");



CREATE INDEX "idx_investments_type" ON "public"."investments" USING "btree" ("type");



CREATE INDEX "idx_investments_user_id" ON "public"."investments" USING "btree" ("user_id");



CREATE INDEX "idx_investor_profile_assessments_user_effective" ON "public"."investor_profile_assessments" USING "btree" ("user_id", "effective_at" DESC);



CREATE INDEX "idx_invoices_card_id" ON "public"."credit_card_invoices" USING "btree" ("credit_card_id");



CREATE INDEX "idx_invoices_card_month" ON "public"."credit_card_invoices" USING "btree" ("credit_card_id", "reference_month");



CREATE INDEX "idx_invoices_due_date" ON "public"."credit_card_invoices" USING "btree" ("due_date");



CREATE INDEX "idx_invoices_status" ON "public"."credit_card_invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_user_id" ON "public"."credit_card_invoices" USING "btree" ("user_id");



CREATE INDEX "idx_notif_prefs_bill_reminders" ON "public"."notification_preferences" USING "btree" ("user_id") WHERE ("bill_reminders_enabled" = true);



CREATE INDEX "idx_notif_prefs_daily_summary" ON "public"."notification_preferences" USING "btree" ("user_id") WHERE ("daily_summary_enabled" = true);



CREATE INDEX "idx_notif_prefs_whatsapp_enabled" ON "public"."notification_preferences" USING "btree" ("user_id") WHERE ("whatsapp_enabled" = true);



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_log_user_type_created" ON "public"."notifications_log" USING "btree" ("user_id", "type", "created_at" DESC);



CREATE INDEX "idx_opportunities_active" ON "public"."market_opportunities" USING "btree" ("user_id", "is_active", "is_dismissed");



CREATE INDEX "idx_opportunities_expires" ON "public"."market_opportunities" USING "btree" ("expires_at");



CREATE INDEX "idx_opportunities_ticker" ON "public"."market_opportunities" USING "btree" ("ticker");



CREATE INDEX "idx_opportunities_type" ON "public"."market_opportunities" USING "btree" ("opportunity_type");



CREATE INDEX "idx_opportunities_user" ON "public"."market_opportunities" USING "btree" ("user_id");



CREATE INDEX "idx_payable_bills_credit_card" ON "public"."payable_bills" USING "btree" ("credit_card_id") WHERE ("credit_card_id" IS NOT NULL);



CREATE INDEX "idx_payable_bills_installment" ON "public"."payable_bills" USING "btree" ("installment_group_id", "installment_number") WHERE ("is_installment" = true);



CREATE INDEX "idx_payable_bills_parent_recurring" ON "public"."payable_bills" USING "btree" ("parent_recurring_id") WHERE ("parent_recurring_id" IS NOT NULL);



CREATE INDEX "idx_payable_bills_provider" ON "public"."payable_bills" USING "btree" ("user_id", "provider_name") WHERE ("provider_name" IS NOT NULL);



CREATE INDEX "idx_payable_bills_recurring" ON "public"."payable_bills" USING "btree" ("user_id", "is_recurring", "next_occurrence_date") WHERE ("is_recurring" = true);



CREATE INDEX "idx_payable_bills_upcoming" ON "public"."payable_bills" USING "btree" ("user_id", "due_date", "priority") WHERE (("status")::"text" = 'pending'::"text");



CREATE INDEX "idx_payable_bills_user_due_date" ON "public"."payable_bills" USING "btree" ("user_id", "due_date" DESC) WHERE (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'overdue'::character varying])::"text"[]));



CREATE INDEX "idx_payable_bills_user_status" ON "public"."payable_bills" USING "btree" ("user_id", "status") INCLUDE ("due_date", "amount");



CREATE INDEX "idx_payable_bills_user_type" ON "public"."payable_bills" USING "btree" ("user_id", "bill_type");



CREATE INDEX "idx_portfolio_snapshots_user_date" ON "public"."portfolio_snapshots" USING "btree" ("user_id", "snapshot_date" DESC);



CREATE INDEX "idx_push_tokens_user_id" ON "public"."push_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_quotes_source" ON "public"."investment_quotes_history" USING "btree" ("source");



CREATE INDEX "idx_quotes_symbol_timestamp" ON "public"."investment_quotes_history" USING "btree" ("symbol", "timestamp" DESC);



CREATE INDEX "idx_quotes_timestamp" ON "public"."investment_quotes_history" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_saved_filters_user_id" ON "public"."saved_filters" USING "btree" ("user_id");



CREATE INDEX "idx_savings_goals_deadline" ON "public"."savings_goals" USING "btree" ("deadline");



CREATE INDEX "idx_savings_goals_user_id" ON "public"."savings_goals" USING "btree" ("user_id");



CREATE INDEX "idx_tags_name" ON "public"."tags" USING "btree" ("name");



CREATE INDEX "idx_tags_user_id" ON "public"."tags" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_tags_user_lower_name_unique" ON "public"."tags" USING "btree" ("user_id", "lower"("name"));



CREATE INDEX "idx_transaction_edits_edited_at" ON "public"."transaction_edits" USING "btree" ("edited_at" DESC);



CREATE INDEX "idx_transaction_edits_transaction_id" ON "public"."transaction_edits" USING "btree" ("transaction_id");



CREATE INDEX "idx_transaction_edits_user_id" ON "public"."transaction_edits" USING "btree" ("user_id");



CREATE INDEX "idx_transaction_tags_tag" ON "public"."transaction_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_transaction_tags_transaction" ON "public"."transaction_tags" USING "btree" ("transaction_id");



CREATE INDEX "idx_transaction_tags_transaction_id_tag_id" ON "public"."transaction_tags" USING "btree" ("transaction_id", "tag_id");



CREATE INDEX "idx_transactions_account_id" ON "public"."transactions" USING "btree" ("account_id");



CREATE INDEX "idx_transactions_category_id" ON "public"."credit_card_transactions" USING "btree" ("category_id");



CREATE INDEX "idx_transactions_date" ON "public"."transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_transactions_investment" ON "public"."investment_transactions" USING "btree" ("investment_id");



CREATE INDEX "idx_transactions_is_paid" ON "public"."transactions" USING "btree" ("is_paid");



CREATE INDEX "idx_transactions_source" ON "public"."transactions" USING "btree" ("source");



CREATE INDEX "idx_transactions_type" ON "public"."transactions" USING "btree" ("type");



CREATE INDEX "idx_transactions_user" ON "public"."investment_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_user_achievements_achievement_id" ON "public"."user_achievements" USING "btree" ("achievement_id");



CREATE INDEX "idx_user_achievements_unlocked" ON "public"."user_achievements" USING "btree" ("user_id", "unlocked");



CREATE INDEX "idx_user_achievements_user_id" ON "public"."user_achievements" USING "btree" ("user_id");



CREATE INDEX "idx_user_badges_badge_id" ON "public"."user_badges" USING "btree" ("badge_id");



CREATE INDEX "idx_user_badges_unlocked_at" ON "public"."user_badges" USING "btree" ("unlocked_at" DESC);



CREATE INDEX "idx_user_badges_user_id" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "idx_user_gamification_profile_user_id" ON "public"."user_gamification_profile" USING "btree" ("user_id");



CREATE INDEX "idx_user_gamification_user_id" ON "public"."user_gamification" USING "btree" ("user_id");



CREATE INDEX "idx_user_memory_chave" ON "public"."user_memory" USING "btree" ("chave");



CREATE INDEX "idx_user_memory_tipo" ON "public"."user_memory" USING "btree" ("tipo");



CREATE INDEX "idx_user_memory_user_id" ON "public"."user_memory" USING "btree" ("user_id");



CREATE INDEX "idx_user_settings_user_id" ON "public"."user_settings" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_partner_id" ON "public"."users" USING "btree" ("partner_id");



CREATE INDEX "idx_users_phone" ON "public"."users" USING "btree" ("phone");



CREATE INDEX "idx_webhook_endpoints_active" ON "public"."webhook_endpoints" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_webhook_endpoints_last_triggered" ON "public"."webhook_endpoints" USING "btree" ("last_triggered_at" DESC);



CREATE INDEX "idx_webhook_endpoints_user_id" ON "public"."webhook_endpoints" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_logs_retry" ON "public"."webhook_logs" USING "btree" ("next_retry_at") WHERE ("status" = 'retrying'::"public"."webhook_log_status");



CREATE INDEX "idx_webhook_logs_status" ON "public"."webhook_logs" USING "btree" ("status");



CREATE INDEX "idx_webhook_logs_triggered_at" ON "public"."webhook_logs" USING "btree" ("triggered_at" DESC);



CREATE INDEX "idx_webhook_logs_user_id" ON "public"."webhook_logs" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_logs_webhook_id" ON "public"."webhook_logs" USING "btree" ("webhook_id");



CREATE INDEX "idx_whatsapp_commands_active" ON "public"."whatsapp_quick_commands" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_whatsapp_commands_category" ON "public"."whatsapp_quick_commands" USING "btree" ("category");



CREATE INDEX "idx_whatsapp_connections_instance_id" ON "public"."whatsapp_connections" USING "btree" ("instance_id");



CREATE INDEX "idx_whatsapp_connections_user_id" ON "public"."whatsapp_connections" USING "btree" ("user_id");



CREATE INDEX "idx_whatsapp_context_conversation_id" ON "public"."whatsapp_conversation_context" USING "btree" ("conversation_id");



CREATE INDEX "idx_whatsapp_context_expires_at" ON "public"."whatsapp_conversation_context" USING "btree" ("expires_at");



CREATE INDEX "idx_whatsapp_context_user_id" ON "public"."whatsapp_conversation_context" USING "btree" ("user_id");



CREATE INDEX "idx_whatsapp_messages_direction" ON "public"."whatsapp_messages" USING "btree" ("direction");



CREATE INDEX "idx_whatsapp_messages_intent" ON "public"."whatsapp_messages" USING "btree" ("intent");



CREATE INDEX "idx_whatsapp_messages_pending" ON "public"."whatsapp_messages" USING "btree" ("user_id", "processing_status") WHERE ("processing_status" = 'pending'::"public"."processing_status");



CREATE INDEX "idx_whatsapp_messages_received_at" ON "public"."whatsapp_messages" USING "btree" ("received_at" DESC);



CREATE INDEX "idx_whatsapp_messages_status" ON "public"."whatsapp_messages" USING "btree" ("processing_status");



CREATE INDEX "idx_whatsapp_messages_user_id" ON "public"."whatsapp_messages" USING "btree" ("user_id");



CREATE OR REPLACE VIEW "public"."v_invoices_detailed" AS
 SELECT "ci"."id" AS "invoice_id",
    "ci"."credit_card_id",
    "cc"."name" AS "card_name",
    "cc"."brand",
    "cc"."last_four_digits",
    "ci"."user_id",
    "ci"."reference_month",
    "ci"."closing_date",
    "ci"."due_date",
    "ci"."status",
    "ci"."total_amount",
    "ci"."paid_amount",
    "ci"."remaining_amount",
    "ci"."payment_date",
    "count"(DISTINCT "cct"."id") AS "transaction_count",
    "count"(DISTINCT "ccp"."id") AS "payment_count",
    COALESCE("sum"("cct"."amount"), (0)::numeric) AS "transactions_sum",
    COALESCE("sum"("ccp"."amount"), (0)::numeric) AS "payments_sum",
        CASE
            WHEN (("ci"."status")::"text" = 'paid'::"text") THEN false
            WHEN (("ci"."due_date" < CURRENT_DATE) AND (("ci"."status")::"text" <> 'paid'::"text")) THEN true
            ELSE false
        END AS "is_overdue",
    ("ci"."due_date" - CURRENT_DATE) AS "days_until_due"
   FROM ((("public"."credit_card_invoices" "ci"
     JOIN "public"."credit_cards" "cc" ON (("ci"."credit_card_id" = "cc"."id")))
     LEFT JOIN "public"."credit_card_transactions" "cct" ON (("cct"."invoice_id" = "ci"."id")))
     LEFT JOIN "public"."credit_card_payments" "ccp" ON (("ccp"."invoice_id" = "ci"."id")))
  GROUP BY "ci"."id", "cc"."id";



CREATE OR REPLACE TRIGGER "after_investment_check_badges" AFTER INSERT OR UPDATE ON "public"."investments" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_check_badges"();



CREATE OR REPLACE TRIGGER "after_transaction_check_badges" AFTER INSERT ON "public"."investment_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_check_badges"();



CREATE OR REPLACE TRIGGER "education_glossary_terms_updated_at" BEFORE UPDATE ON "public"."education_glossary_terms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "education_lessons_updated_at" BEFORE UPDATE ON "public"."education_lessons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "education_modules_updated_at" BEFORE UPDATE ON "public"."education_modules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "education_tracks_updated_at" BEFORE UPDATE ON "public"."education_tracks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "education_user_profile_updated_at" BEFORE UPDATE ON "public"."education_user_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "education_user_progress_updated_at" BEFORE UPDATE ON "public"."education_user_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "ensure_single_default_provider_trigger" BEFORE INSERT OR UPDATE ON "public"."ai_provider_configs" FOR EACH ROW WHEN (("new"."is_default" = true)) EXECUTE FUNCTION "public"."ensure_single_default_provider"();



CREATE OR REPLACE TRIGGER "investment_contribution_update_goal" AFTER INSERT OR DELETE ON "public"."investment_goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_investment_goal_amount"();



CREATE OR REPLACE TRIGGER "investment_contributions_updated_at" BEFORE UPDATE ON "public"."investment_goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "investment_goals_updated_at" BEFORE UPDATE ON "public"."investment_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_payable_bills_updated_at" BEFORE UPDATE ON "public"."payable_bills" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "transaction_balance_update" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_account_balance"();



CREATE OR REPLACE TRIGGER "trg_apply_financial_goal_contribution" AFTER INSERT OR DELETE OR UPDATE ON "public"."financial_goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."apply_financial_goal_contribution"();



CREATE OR REPLACE TRIGGER "trg_budgets_set_updated_at" BEFORE UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_budgets_update_summary" AFTER INSERT OR UPDATE ON "public"."budgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_budget_summary"();



CREATE OR REPLACE TRIGGER "trg_calculate_invoice_total_on_close" BEFORE UPDATE ON "public"."credit_card_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_invoice_total_on_close"();



CREATE OR REPLACE TRIGGER "trg_financial_cycles_updated_at" BEFORE UPDATE ON "public"."financial_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_financial_goal_contributions_updated_at" BEFORE UPDATE ON "public"."financial_goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_financial_goals_updated_at" BEFORE UPDATE ON "public"."financial_goals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_investments_set_updated_at" BEFORE UPDATE ON "public"."investments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_savings_goals_updated_at" BEFORE UPDATE ON "public"."savings_goals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sync_financial_goal_savings_fields" BEFORE INSERT OR UPDATE ON "public"."financial_goals" FOR EACH ROW EXECUTE FUNCTION "public"."sync_financial_goal_savings_fields"();



CREATE OR REPLACE TRIGGER "trg_sync_spending_goal_before_write" BEFORE INSERT OR UPDATE OF "category_id", "period_start", "period_end", "target_amount", "goal_type" ON "public"."financial_goals" FOR EACH ROW EXECUTE FUNCTION "public"."sync_spending_goal_before_write"();



CREATE OR REPLACE TRIGGER "trg_update_card_limit_on_delete" AFTER DELETE ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_card_limit_on_delete"();



CREATE OR REPLACE TRIGGER "trg_update_card_limit_on_purchase" AFTER INSERT ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_card_limit_on_purchase"();



CREATE OR REPLACE TRIGGER "trg_update_invoice_remaining_amount" BEFORE UPDATE ON "public"."credit_card_invoices" FOR EACH ROW WHEN (("old"."paid_amount" IS DISTINCT FROM "new"."paid_amount")) EXECUTE FUNCTION "public"."update_invoice_remaining_amount"();



CREATE OR REPLACE TRIGGER "trg_update_invoice_total_on_delete" AFTER DELETE ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_total_on_delete"();



CREATE OR REPLACE TRIGGER "trg_update_invoice_total_on_transaction" AFTER INSERT ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_total_on_transaction"();



CREATE OR REPLACE TRIGGER "trg_update_spending_goals" AFTER INSERT OR DELETE OR UPDATE ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_spending_goals"();



CREATE OR REPLACE TRIGGER "trg_update_spending_goals_from_transactions" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_spending_goals_from_transactions"();



CREATE OR REPLACE TRIGGER "trigger_apply_category_rules" BEFORE INSERT ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."apply_category_rules"();



CREATE OR REPLACE TRIGGER "trigger_auto_categorize" BEFORE INSERT OR UPDATE OF "description" ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."auto_categorize_transaction"();



CREATE OR REPLACE TRIGGER "trigger_calculate_returns" BEFORE UPDATE OF "current_price" ON "public"."investments" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_investment_returns"();



COMMENT ON TRIGGER "trigger_calculate_returns" ON "public"."investments" IS 'Trigger que recalcula rentabilidade ao atualizar cotação';



CREATE OR REPLACE TRIGGER "trigger_check_allocation_total" BEFORE INSERT OR UPDATE ON "public"."investment_allocation_targets" FOR EACH ROW EXECUTE FUNCTION "public"."check_allocation_total"();



CREATE OR REPLACE TRIGGER "trigger_create_opening_transaction_for_investment" AFTER INSERT ON "public"."investments" FOR EACH ROW WHEN (("new"."is_active" = true)) EXECUTE FUNCTION "public"."create_opening_transaction_for_investment"();



CREATE OR REPLACE TRIGGER "trigger_goal_contributions_updated_at" BEFORE UPDATE ON "public"."goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_contributions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_available_limit" AFTER INSERT OR DELETE OR UPDATE ON "public"."credit_card_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_available_limit"();



CREATE OR REPLACE TRIGGER "trigger_update_goal_amount" AFTER INSERT ON "public"."goal_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_goal_amount_on_contribution"();



CREATE OR REPLACE TRIGGER "trigger_update_investment_after_transaction" AFTER INSERT OR DELETE OR UPDATE ON "public"."investment_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_investment_after_transaction"();



CREATE OR REPLACE TRIGGER "trigger_update_investment_alerts_timestamp" BEFORE UPDATE ON "public"."investment_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_investment_alerts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_invoice_total" AFTER INSERT OR DELETE OR UPDATE ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_total"();



CREATE OR REPLACE TRIGGER "update_accounts_updated_at" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ai_provider_configs_updated_at" BEFORE UPDATE ON "public"."ai_provider_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_badge_progress_updated_at" BEFORE UPDATE ON "public"."badge_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_gamification_updated_at"();



CREATE OR REPLACE TRIGGER "update_calendar_events_updated_at" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_links_updated_at" BEFORE UPDATE ON "public"."calendar_external_event_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_overrides_updated_at" BEFORE UPDATE ON "public"."calendar_event_occurrence_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_recurrence_rules_updated_at" BEFORE UPDATE ON "public"."calendar_event_recurrence_rules" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_reminder_schedule_updated_at" BEFORE UPDATE ON "public"."calendar_reminder_schedule" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_reminders_updated_at" BEFORE UPDATE ON "public"."calendar_event_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_sync_jobs_updated_at" BEFORE UPDATE ON "public"."calendar_sync_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cc_transactions_updated_at" BEFORE UPDATE ON "public"."credit_card_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_challenges_updated_at" BEFORE UPDATE ON "public"."challenges" FOR EACH ROW EXECUTE FUNCTION "public"."update_gamification_updated_at"();



CREATE OR REPLACE TRIGGER "update_conversation_context_updated_at" BEFORE UPDATE ON "public"."conversation_context" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_credit_cards_updated_at" BEFORE UPDATE ON "public"."credit_cards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_financial_cycles_updated_at" BEFORE UPDATE ON "public"."financial_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_integration_configs_updated_at" BEFORE UPDATE ON "public"."integration_configs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."credit_card_invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_saved_filters_updated_at" BEFORE UPDATE ON "public"."saved_filters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_achievements_updated_at" BEFORE UPDATE ON "public"."user_achievements" FOR EACH ROW EXECUTE FUNCTION "public"."update_gamification_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_gamification_profile_updated_at" BEFORE UPDATE ON "public"."user_gamification_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_gamification_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_gamification_updated_at" BEFORE UPDATE ON "public"."user_gamification" FOR EACH ROW EXECUTE FUNCTION "public"."update_gamification_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_webhook_endpoints_updated_at" BEFORE UPDATE ON "public"."webhook_endpoints" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_webhook_stats_trigger" AFTER INSERT OR UPDATE OF "status" ON "public"."webhook_logs" FOR EACH ROW WHEN (("new"."status" = ANY (ARRAY['success'::"public"."webhook_log_status", 'failed'::"public"."webhook_log_status"]))) EXECUTE FUNCTION "public"."update_webhook_stats"();



CREATE OR REPLACE TRIGGER "update_whatsapp_commands_updated_at" BEFORE UPDATE ON "public"."whatsapp_quick_commands" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whatsapp_connections_timestamp" BEFORE UPDATE ON "public"."whatsapp_connections" FOR EACH ROW EXECUTE FUNCTION "public"."update_whatsapp_connections_updated_at"();



CREATE OR REPLACE TRIGGER "update_whatsapp_context_updated_at" BEFORE UPDATE ON "public"."whatsapp_conversation_context" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_whatsapp_messages_updated_at" BEFORE UPDATE ON "public"."whatsapp_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_action_log"
    ADD CONSTRAINT "agent_action_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_daily_sessions"
    ADD CONSTRAINT "agent_daily_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_identity"
    ADD CONSTRAINT "agent_identity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_memory_entries"
    ADD CONSTRAINT "agent_memory_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_memory_episodes"
    ADD CONSTRAINT "agent_memory_episodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_pending_tasks"
    ADD CONSTRAINT "agent_pending_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_provider_configs"
    ADD CONSTRAINT "ai_provider_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ana_clara_config"
    ADD CONSTRAINT "ana_clara_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ana_clara_group_message_memory"
    ADD CONSTRAINT "ana_clara_group_message_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ana_insights_cache"
    ADD CONSTRAINT "ana_insights_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."badge_progress"
    ADD CONSTRAINT "badge_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_payment_history"
    ADD CONSTRAINT "bill_payment_history_account_from_id_fkey" FOREIGN KEY ("account_from_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bill_payment_history"
    ADD CONSTRAINT "bill_payment_history_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."payable_bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_payment_history"
    ADD CONSTRAINT "bill_payment_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_reminders"
    ADD CONSTRAINT "bill_reminders_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."payable_bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_reminders"
    ADD CONSTRAINT "bill_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_tags"
    ADD CONSTRAINT "bill_tags_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "public"."payable_bills"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bill_tags"
    ADD CONSTRAINT "bill_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_event_occurrence_overrides"
    ADD CONSTRAINT "calendar_event_occurrence_overrides_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_event_recurrence_rules"
    ADD CONSTRAINT "calendar_event_recurrence_rules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_event_reminders"
    ADD CONSTRAINT "calendar_event_reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_external_event_links"
    ADD CONSTRAINT "calendar_external_event_links_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_reminder_schedule"
    ADD CONSTRAINT "calendar_reminder_schedule_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_reminder_schedule"
    ADD CONSTRAINT "calendar_reminder_schedule_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "public"."calendar_event_reminders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_jobs"
    ADD CONSTRAINT "calendar_sync_jobs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_jobs"
    ADD CONSTRAINT "calendar_sync_jobs_occurrence_override_id_fkey" FOREIGN KEY ("occurrence_override_id") REFERENCES "public"."calendar_event_occurrence_overrides"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_sync_jobs"
    ADD CONSTRAINT "calendar_sync_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_rules"
    ADD CONSTRAINT "category_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."category_rules"
    ADD CONSTRAINT "category_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_context"
    ADD CONSTRAINT "conversation_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_invoices"
    ADD CONSTRAINT "credit_card_invoices_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_invoices"
    ADD CONSTRAINT "credit_card_invoices_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_card_invoices"
    ADD CONSTRAINT "credit_card_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."credit_card_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_payments"
    ADD CONSTRAINT "credit_card_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_transaction_tags"
    ADD CONSTRAINT "credit_card_transaction_tags_credit_card_transaction_id_fkey" FOREIGN KEY ("credit_card_transaction_id") REFERENCES "public"."credit_card_transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_transaction_tags"
    ADD CONSTRAINT "credit_card_transaction_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_transactions"
    ADD CONSTRAINT "credit_card_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_card_transactions"
    ADD CONSTRAINT "credit_card_transactions_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_card_transactions"
    ADD CONSTRAINT "credit_card_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."credit_card_invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_card_transactions"
    ADD CONSTRAINT "credit_card_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credit_cards"
    ADD CONSTRAINT "credit_cards_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_cards"
    ADD CONSTRAINT "credit_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_daily_tips"
    ADD CONSTRAINT "education_daily_tips_track_slug_fkey" FOREIGN KEY ("track_slug") REFERENCES "public"."education_tracks"("slug") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."education_daily_tips"
    ADD CONSTRAINT "education_daily_tips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_lessons"
    ADD CONSTRAINT "education_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."education_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_modules"
    ADD CONSTRAINT "education_modules_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "public"."education_tracks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_user_profile"
    ADD CONSTRAINT "education_user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_user_progress"
    ADD CONSTRAINT "education_user_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."education_lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_user_progress"
    ADD CONSTRAINT "education_user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_cycles"
    ADD CONSTRAINT "financial_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_goal_contributions"
    ADD CONSTRAINT "financial_goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_goal_contributions"
    ADD CONSTRAINT "financial_goal_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_goals"
    ADD CONSTRAINT "financial_goals_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_goals"
    ADD CONSTRAINT "financial_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "fk_investments_account" FOREIGN KEY ("account_id") REFERENCES "public"."investment_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."savings_goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goal_contributions"
    ADD CONSTRAINT "goal_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integration_configs"
    ADD CONSTRAINT "integration_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_accounts"
    ADD CONSTRAINT "investment_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_alerts"
    ADD CONSTRAINT "investment_alerts_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_alerts"
    ADD CONSTRAINT "investment_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_allocation_targets"
    ADD CONSTRAINT "investment_allocation_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_goal_contributions"
    ADD CONSTRAINT "investment_goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."investment_goals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_goal_contributions"
    ADD CONSTRAINT "investment_goal_contributions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_goals"
    ADD CONSTRAINT "investment_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_transactions"
    ADD CONSTRAINT "investment_transactions_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investment_transactions"
    ADD CONSTRAINT "investment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investments"
    ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_profile_assessments"
    ADD CONSTRAINT "investor_profile_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_opportunities"
    ADD CONSTRAINT "market_opportunities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications_log"
    ADD CONSTRAINT "notifications_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payable_bills"
    ADD CONSTRAINT "payable_bills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payable_bills"
    ADD CONSTRAINT "payable_bills_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payable_bills"
    ADD CONSTRAINT "payable_bills_parent_bill_id_fkey" FOREIGN KEY ("parent_bill_id") REFERENCES "public"."payable_bills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payable_bills"
    ADD CONSTRAINT "payable_bills_parent_recurring_id_fkey" FOREIGN KEY ("parent_recurring_id") REFERENCES "public"."payable_bills"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payable_bills"
    ADD CONSTRAINT "payable_bills_payment_account_id_fkey" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payable_bills"
    ADD CONSTRAINT "payable_bills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolio_snapshots"
    ADD CONSTRAINT "portfolio_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."savings_goals"
    ADD CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_edits"
    ADD CONSTRAINT "transaction_edits_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_edits"
    ADD CONSTRAINT "transaction_edits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."transaction_tags"
    ADD CONSTRAINT "transaction_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_tags"
    ADD CONSTRAINT "transaction_tags_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_transfer_to_account_id_fkey" FOREIGN KEY ("transfer_to_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_achievements"
    ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_gamification_profile"
    ADD CONSTRAINT "user_gamification_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_gamification"
    ADD CONSTRAINT "user_gamification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memory"
    ADD CONSTRAINT "user_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."webhook_endpoints"
    ADD CONSTRAINT "webhook_endpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_connections"
    ADD CONSTRAINT "whatsapp_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_conversation_context"
    ADD CONSTRAINT "whatsapp_conversation_context_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "public"."whatsapp_messages"("id");



ALTER TABLE ONLY "public"."whatsapp_conversation_context"
    ADD CONSTRAINT "whatsapp_conversation_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_messages"
    ADD CONSTRAINT "whatsapp_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can read quotes" ON "public"."investment_quotes_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can view active commands" ON "public"."whatsapp_quick_commands" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Badges são públicos" ON "public"."badges" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Service role can insert webhook logs" ON "public"."webhook_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage cache" ON "public"."ana_insights_cache" USING (true);



CREATE POLICY "Service role can update webhook logs" ON "public"."webhook_logs" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Service role full access action_log" ON "public"."agent_action_log" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Service role full access agent episodes" ON "public"."agent_memory_episodes" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Service role full access ana_clara_config" ON "public"."ana_clara_config" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Service role full access ana_clara_group_message_memory" ON "public"."ana_clara_group_message_memory" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Service role full access memories" ON "public"."agent_memory_entries" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Service role full access sessions" ON "public"."agent_daily_sessions" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Service role full access tasks" ON "public"."agent_pending_tasks" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Service role full access to agent_identity" ON "public"."agent_identity" USING ((( SELECT "current_setting"('role'::"text", true) AS "current_setting") = 'service_role'::"text"));



CREATE POLICY "Sistema pode inserir badges" ON "public"."user_badges" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "System can insert snapshots" ON "public"."portfolio_snapshots" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create own alerts" ON "public"."investment_alerts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own tags" ON "public"."tags" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own transaction_tags" ON "public"."transaction_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_tags"."transaction_id") AND ("transactions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own AI configs" ON "public"."ai_provider_configs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own accounts" ON "public"."accounts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own accounts" ON "public"."investment_accounts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own alerts" ON "public"."investment_alerts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own bill tags" ON "public"."bill_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."payable_bills" "pb"
  WHERE (("pb"."id" = "bill_tags"."bill_id") AND ("pb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own bills" ON "public"."payable_bills" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own calendar_events" ON "public"."calendar_events" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own categories" ON "public"."categories" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own category rules" ON "public"."category_rules" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own challenges" ON "public"."challenges" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own connection" ON "public"."whatsapp_connections" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own contributions" ON "public"."financial_goal_contributions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own contributions" ON "public"."goal_contributions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own event_reminders" ON "public"."calendar_event_reminders" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_reminders"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own external_event_links" ON "public"."calendar_external_event_links" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_external_event_links"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own goals" ON "public"."financial_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own integrations" ON "public"."integration_configs" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own investments" ON "public"."investments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notification preferences" ON "public"."notification_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own occurrence_overrides" ON "public"."calendar_event_occurrence_overrides" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_occurrence_overrides"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own payments" ON "public"."credit_card_payments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own recurrence_rules" ON "public"."calendar_event_recurrence_rules" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_recurrence_rules"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own settings" ON "public"."user_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own tags" ON "public"."tags" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own transaction_tags" ON "public"."transaction_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_tags"."transaction_id") AND ("transactions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own transactions" ON "public"."investment_transactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own transactions" ON "public"."transactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own webhooks" ON "public"."webhook_endpoints" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete tags from their credit card transactions" ON "public"."credit_card_transaction_tags" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."credit_card_transactions"
  WHERE (("credit_card_transactions"."id" = "credit_card_transaction_tags"."credit_card_transaction_id") AND ("credit_card_transactions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own AI configs" ON "public"."ai_provider_configs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own accounts" ON "public"."accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own accounts" ON "public"."investment_accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own achievements" ON "public"."user_achievements" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own agent identity" ON "public"."agent_identity" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own badges" ON "public"."badge_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own bill tags" ON "public"."bill_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."payable_bills" "pb"
  WHERE (("pb"."id" = "bill_tags"."bill_id") AND ("pb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own bills" ON "public"."payable_bills" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own calendar_events" ON "public"."calendar_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own category rules" ON "public"."category_rules" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own challenges" ON "public"."challenges" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own connection" ON "public"."whatsapp_connections" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own context" ON "public"."whatsapp_conversation_context" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own contributions" ON "public"."financial_goal_contributions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own contributions" ON "public"."goal_contributions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own event_reminders" ON "public"."calendar_event_reminders" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_reminders"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own external_event_links" ON "public"."calendar_external_event_links" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_external_event_links"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own gamification" ON "public"."user_gamification" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own gamification profile" ON "public"."user_gamification_profile" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own goals" ON "public"."financial_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own integrations" ON "public"."integration_configs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own investments" ON "public"."investments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own messages" ON "public"."whatsapp_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own occurrence_overrides" ON "public"."calendar_event_occurrence_overrides" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_occurrence_overrides"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own payment history" ON "public"."bill_payment_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own payments" ON "public"."credit_card_payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own recurrence_rules" ON "public"."calendar_event_recurrence_rules" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_recurrence_rules"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own reminder_schedule" ON "public"."calendar_reminder_schedule" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_reminder_schedule"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own reminders" ON "public"."bill_reminders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own sync_jobs" ON "public"."calendar_sync_jobs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own transactions" ON "public"."investment_transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own webhooks" ON "public"."webhook_endpoints" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert tags to their credit card transactions" ON "public"."credit_card_transaction_tags" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."credit_card_transactions"
  WHERE (("credit_card_transactions"."id" = "credit_card_transaction_tags"."credit_card_transaction_id") AND ("credit_card_transactions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own transaction edits" ON "public"."transaction_edits" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own filters" ON "public"."saved_filters" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own memory" ON "public"."user_memory" USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can manage own targets" ON "public"."investment_allocation_targets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own conversation context" ON "public"."conversation_context" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own agent identity" ON "public"."agent_identity" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own AI configs" ON "public"."ai_provider_configs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own accounts" ON "public"."accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own accounts" ON "public"."investment_accounts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own achievements" ON "public"."user_achievements" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own agent identity" ON "public"."agent_identity" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own alerts" ON "public"."investment_alerts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own badges" ON "public"."badge_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own bills" ON "public"."payable_bills" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own calendar_events" ON "public"."calendar_events" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own categories" ON "public"."categories" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own category rules" ON "public"."category_rules" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own challenges" ON "public"."challenges" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own connection" ON "public"."whatsapp_connections" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own context" ON "public"."whatsapp_conversation_context" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own contributions" ON "public"."goal_contributions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own event_reminders" ON "public"."calendar_event_reminders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_reminders"."event_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_reminders"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own external_event_links" ON "public"."calendar_external_event_links" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_external_event_links"."event_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_external_event_links"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own gamification" ON "public"."user_gamification" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own gamification profile" ON "public"."user_gamification_profile" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own goals" ON "public"."financial_goals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own integrations" ON "public"."integration_configs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own investments" ON "public"."investments" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own messages" ON "public"."whatsapp_messages" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own occurrence_overrides" ON "public"."calendar_event_occurrence_overrides" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_occurrence_overrides"."event_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_occurrence_overrides"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own opportunities" ON "public"."market_opportunities" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own payments" ON "public"."credit_card_payments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own recurrence_rules" ON "public"."calendar_event_recurrence_rules" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_recurrence_rules"."event_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_recurrence_rules"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own reminder_schedule" ON "public"."calendar_reminder_schedule" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_reminder_schedule"."event_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_reminder_schedule"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own reminders" ON "public"."bill_reminders" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own sync_jobs" ON "public"."calendar_sync_jobs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own tags" ON "public"."tags" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own transactions" ON "public"."investment_transactions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own transactions" ON "public"."transactions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own webhooks" ON "public"."webhook_endpoints" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view categories" ON "public"."categories" FOR SELECT USING ((("user_id" IS NULL) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Users can view own AI configs" ON "public"."ai_provider_configs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own accounts" ON "public"."accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own accounts" ON "public"."investment_accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own achievements" ON "public"."user_achievements" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own alerts" ON "public"."investment_alerts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own badges" ON "public"."badge_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own bill tags" ON "public"."bill_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."payable_bills" "pb"
  WHERE (("pb"."id" = "bill_tags"."bill_id") AND ("pb"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own bills" ON "public"."payable_bills" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own calendar_events" ON "public"."calendar_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own category rules" ON "public"."category_rules" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own challenges" ON "public"."challenges" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own connection" ON "public"."whatsapp_connections" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own context" ON "public"."whatsapp_conversation_context" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own contributions" ON "public"."financial_goal_contributions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own contributions" ON "public"."goal_contributions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own event_reminders" ON "public"."calendar_event_reminders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_reminders"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own external_event_links" ON "public"."calendar_external_event_links" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_external_event_links"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own gamification" ON "public"."user_gamification" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own gamification profile" ON "public"."user_gamification_profile" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own goals" ON "public"."financial_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own integrations" ON "public"."integration_configs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own investments" ON "public"."investments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own messages" ON "public"."whatsapp_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications_log" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own occurrence_overrides" ON "public"."calendar_event_occurrence_overrides" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_occurrence_overrides"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own opportunities" ON "public"."market_opportunities" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own payment history" ON "public"."bill_payment_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own payments" ON "public"."credit_card_payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own recurrence_rules" ON "public"."calendar_event_recurrence_rules" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_event_recurrence_rules"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own reminder_schedule" ON "public"."calendar_reminder_schedule" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."calendar_events" "e"
  WHERE (("e"."id" = "calendar_reminder_schedule"."event_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own reminders" ON "public"."bill_reminders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own snapshots" ON "public"."portfolio_snapshots" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sync_jobs" ON "public"."calendar_sync_jobs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own tags" ON "public"."tags" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own transaction_tags" ON "public"."transaction_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."transactions"
  WHERE (("transactions"."id" = "transaction_tags"."transaction_id") AND ("transactions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own transactions" ON "public"."investment_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own transactions" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own webhook logs" ON "public"."webhook_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own webhooks" ON "public"."webhook_endpoints" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own cache" ON "public"."ana_insights_cache" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own credit card transaction tags" ON "public"."credit_card_transaction_tags" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."credit_card_transactions"
  WHERE (("credit_card_transactions"."id" = "credit_card_transaction_tags"."credit_card_transaction_id") AND ("credit_card_transactions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own transaction edits" ON "public"."transaction_edits" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own agent episodes" ON "public"."agent_memory_episodes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own ana_clara_config" ON "public"."ana_clara_config" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own ana_clara_group_message_memory" ON "public"."ana_clara_group_message_memory" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own memories" ON "public"."agent_memory_entries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own sessions" ON "public"."agent_daily_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users read own tasks" ON "public"."agent_pending_tasks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own ana_clara_config" ON "public"."ana_clara_config" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem atualizar seus próprios tokens" ON "public"."push_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem deletar seus próprios tokens" ON "public"."push_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem inserir seus próprios tokens" ON "public"."push_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários podem ver seus próprios tokens" ON "public"."push_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuários veem seus próprios badges" ON "public"."user_badges" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_action_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_daily_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_identity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_memory_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_memory_episodes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_pending_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_provider_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ana_clara_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ana_clara_group_message_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ana_insights_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badge_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_payment_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bill_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_summaries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_summaries_delete_own" ON "public"."budget_summaries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "budget_summaries_insert_own" ON "public"."budget_summaries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "budget_summaries_select_own" ON "public"."budget_summaries" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "budget_summaries_update_own" ON "public"."budget_summaries" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budgets_delete_own" ON "public"."budgets" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "budgets_insert_own" ON "public"."budgets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "budgets_select_own" ON "public"."budgets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "budgets_update_own" ON "public"."budgets" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."calendar_event_occurrence_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_event_recurrence_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_event_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_external_event_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_reminder_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."category_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contributions_delete_own" ON "public"."investment_goal_contributions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "contributions_insert_own" ON "public"."investment_goal_contributions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "contributions_select_own" ON "public"."investment_goal_contributions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."conversation_context" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_card_invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credit_card_invoices_delete_policy" ON "public"."credit_card_invoices" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_invoices"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



CREATE POLICY "credit_card_invoices_insert_policy" ON "public"."credit_card_invoices" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_invoices"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



CREATE POLICY "credit_card_invoices_select_policy" ON "public"."credit_card_invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_invoices"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



CREATE POLICY "credit_card_invoices_update_policy" ON "public"."credit_card_invoices" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_invoices"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_invoices"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."credit_card_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_card_transaction_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credit_card_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credit_card_transactions_delete_policy" ON "public"."credit_card_transactions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_transactions"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



CREATE POLICY "credit_card_transactions_insert_policy" ON "public"."credit_card_transactions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_transactions"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



CREATE POLICY "credit_card_transactions_select_policy" ON "public"."credit_card_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_transactions"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



CREATE POLICY "credit_card_transactions_update_policy" ON "public"."credit_card_transactions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_transactions"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."credit_cards"
  WHERE (("credit_cards"."id" = "credit_card_transactions"."credit_card_id") AND ("credit_cards"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."credit_cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credit_cards_delete_policy" ON "public"."credit_cards" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "credit_cards_insert_policy" ON "public"."credit_cards" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "credit_cards_select_policy" ON "public"."credit_cards" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "credit_cards_update_policy" ON "public"."credit_cards" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."education_daily_tips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_daily_tips_select_own" ON "public"."education_daily_tips" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."education_glossary_terms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_glossary_terms_select_authenticated" ON "public"."education_glossary_terms" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."education_lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_lessons_select_authenticated" ON "public"."education_lessons" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."education_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_modules_select_authenticated" ON "public"."education_modules" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."education_tracks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_tracks_select_authenticated" ON "public"."education_tracks" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."education_user_profile" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_user_profile_select_own" ON "public"."education_user_profile" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."education_user_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_user_progress_delete_own" ON "public"."education_user_progress" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "education_user_progress_insert_own" ON "public"."education_user_progress" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "education_user_progress_select_own" ON "public"."education_user_progress" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "education_user_progress_update_own" ON "public"."education_user_progress" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."financial_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_cycles_delete_own" ON "public"."financial_cycles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "financial_cycles_insert_own" ON "public"."financial_cycles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "financial_cycles_select_own" ON "public"."financial_cycles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "financial_cycles_update_own" ON "public"."financial_cycles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."financial_goal_contributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."goal_contributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integration_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investment_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investment_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investment_allocation_targets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investment_goal_contributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investment_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investment_goals_delete_own" ON "public"."investment_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "investment_goals_insert_own" ON "public"."investment_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "investment_goals_select_own" ON "public"."investment_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "investment_goals_update_own" ON "public"."investment_goals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."investment_quotes_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investment_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."investor_profile_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_profile_assessments_insert_own" ON "public"."investor_profile_assessments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "investor_profile_assessments_select_own" ON "public"."investor_profile_assessments" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."market_opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payable_bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portfolio_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_filters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."savings_goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "savings_goals_delete_own" ON "public"."savings_goals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "savings_goals_insert_own" ON "public"."savings_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "savings_goals_select_own" ON "public"."savings_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "savings_goals_update_own" ON "public"."savings_goals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_edits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_achievements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_gamification" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_gamification_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_endpoints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_conversation_context" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."whatsapp_quick_commands" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."_calendar_recurrence_rule_signature"("p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_calendar_recurrence_rule_signature"("p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_calendar_recurrence_rule_signature"("p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_xp_to_user"("p_user_id" "uuid", "p_xp_amount" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_xp_to_user"("p_user_id" "uuid", "p_xp_amount" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_xp_to_user"("p_user_id" "uuid", "p_xp_amount" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."adicionar_memoria_usuario"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text", "p_valor" "jsonb", "p_origem" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."adicionar_memoria_usuario"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text", "p_valor" "jsonb", "p_origem" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adicionar_memoria_usuario"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text", "p_valor" "jsonb", "p_origem" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_category_rules"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_category_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_category_rules"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_financial_goal_contribution"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_financial_goal_contribution"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_financial_goal_contribution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_savings_contribution"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_savings_contribution"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_savings_contribution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_categorize_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_categorize_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_categorize_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_recurring_bills"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_recurring_bills"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_recurring_bills"() TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_budgets_into_spending_goals"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_budgets_into_spending_goals"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_budgets_into_spending_goals"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."bootstrap_gamification_state"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."bootstrap_gamification_state"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bootstrap_gamification_state"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."buscar_cartao_por_nome"("p_user_id" "uuid", "p_nome_busca" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."buscar_cartao_por_nome"("p_user_id" "uuid", "p_nome_busca" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."buscar_cartao_por_nome"("p_user_id" "uuid", "p_nome_busca" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_agent_memory_confidence"("p_reinforcement_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_agent_memory_confidence"("p_reinforcement_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_agent_memory_confidence"("p_reinforcement_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_investment_projection"("p_current_amount" numeric, "p_monthly_contribution" numeric, "p_annual_rate" numeric, "p_months" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_investment_projection"("p_current_amount" numeric, "p_monthly_contribution" numeric, "p_annual_rate" numeric, "p_months" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_investment_projection"("p_current_amount" numeric, "p_monthly_contribution" numeric, "p_annual_rate" numeric, "p_months" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_investment_returns"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_investment_returns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_investment_returns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_invoice_total_on_close"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_invoice_total_on_close"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_invoice_total_on_close"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_day_of_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_day_of_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_occurrence"("p_current_date" "date", "p_frequency" "text", "p_day_of_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_portfolio_metrics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_portfolio_metrics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_portfolio_metrics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_spending_streak"("goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_spending_streak"("goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_spending_streak"("goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_xp_for_level"("level" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_xp_for_level"("level" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_xp_for_level"("level" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."calendar_occurrence_key"("p_event_id" "uuid", "p_original_start" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calendar_occurrence_key"("p_event_id" "uuid", "p_original_start" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calendar_occurrence_key"("p_event_id" "uuid", "p_original_start" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calendar_populate_recurring_reminder_schedule"("p_event_id" "uuid", "p_owner_uid" "uuid", "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calendar_populate_recurring_reminder_schedule"("p_event_id" "uuid", "p_owner_uid" "uuid", "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calendar_populate_recurring_reminder_schedule"("p_event_id" "uuid", "p_owner_uid" "uuid", "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calendar_recurrence_expand_occurrences"("p_event_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calendar_recurrence_expand_occurrences"("p_event_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calendar_recurrence_expand_occurrences"("p_event_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."calendar_weekday_token_to_isodow"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."calendar_weekday_token_to_isodow"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calendar_weekday_token_to_isodow"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."categorize_uncategorized_regular_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."categorize_uncategorized_regular_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."categorize_uncategorized_regular_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."categorize_uncategorized_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."categorize_uncategorized_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."categorize_uncategorized_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_allocation_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_allocation_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_allocation_total"() TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_unlock_badges"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_unlock_badges"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_unlock_badges"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_expired_challenges"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_expired_challenges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_expired_challenges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_overdue_invoices"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_overdue_invoices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_overdue_invoices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_conversation_contexts"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_conversation_contexts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_conversation_contexts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_episodes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_episodes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_episodes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."close_invoices_automatically"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_invoices_automatically"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_invoices_automatically"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_challenge"("p_challenge_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_challenge"("p_challenge_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_challenge"("p_challenge_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_calendar_event"("p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_created_by" "public"."calendar_event_created_by", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_calendar_event"("p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_created_by" "public"."calendar_event_created_by", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_calendar_event"("p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_created_by" "public"."calendar_event_created_by", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_category_rule"("p_user_id" "uuid", "p_merchant_pattern" "text", "p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_category_rule"("p_user_id" "uuid", "p_merchant_pattern" "text", "p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_category_rule"("p_user_id" "uuid", "p_merchant_pattern" "text", "p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_opening_transaction_for_investment"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_opening_transaction_for_investment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_opening_transaction_for_investment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."criar_ou_atualizar_fatura"("p_user_id" "uuid", "p_credit_card_id" "uuid", "p_amount" numeric, "p_due_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."criar_ou_atualizar_fatura"("p_user_id" "uuid", "p_credit_card_id" "uuid", "p_amount" numeric, "p_due_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."criar_ou_atualizar_fatura"("p_user_id" "uuid", "p_credit_card_id" "uuid", "p_amount" numeric, "p_due_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_date_brasilia"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_date_brasilia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_date_brasilia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_time_brasilia"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_time_brasilia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_time_brasilia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decay_stale_facts"() TO "anon";
GRANT ALL ON FUNCTION "public"."decay_stale_facts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."decay_stale_facts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_calendar_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_calendar_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_calendar_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_calendar_occurrence_overrides_for_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_calendar_occurrence_overrides_for_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_calendar_occurrence_overrides_for_event"("p_event_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."dismiss_opportunity"("p_opportunity_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."dismiss_opportunity"("p_opportunity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dismiss_opportunity"("p_opportunity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_agent_identity"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_agent_identity"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_agent_identity"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_default_provider"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_default_provider"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_default_provider"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_user_gamification_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_user_gamification_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_user_gamification_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."expire_old_opportunities"() TO "anon";
GRANT ALL ON FUNCTION "public"."expire_old_opportunities"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expire_old_opportunities"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_recurring_bills"("p_horizon_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_recurring_bills"("p_horizon_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recurring_bills"("p_horizon_days" integer) TO "service_role";



GRANT ALL ON TABLE "public"."market_opportunities" TO "anon";
GRANT ALL ON TABLE "public"."market_opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."market_opportunities" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_opportunities"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_opportunities"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_opportunities"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agenda_window"("p_user_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_agenda_window"("p_user_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agenda_window"("p_user_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_memory_context"("p_user_id" "uuid", "p_max_facts" integer, "p_max_episodes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_memory_context"("p_user_id" "uuid", "p_max_facts" integer, "p_max_episodes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_memory_context"("p_user_id" "uuid", "p_max_facts" integer, "p_max_episodes" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bill_analytics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_bill_analytics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bill_analytics"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contas_consolidadas"("p_user_id" "uuid", "p_status" "text"[], "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_contas_consolidadas"("p_user_id" "uuid", "p_status" "text"[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contas_consolidadas"("p_user_id" "uuid", "p_status" "text"[], "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_installment_schedule"("p_transaction_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_installment_schedule"("p_transaction_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_installment_schedule"("p_transaction_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_investment_goal_metrics"("p_goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_investment_goal_metrics"("p_goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_investment_goal_metrics"("p_goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "reference_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "reference_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_summary"("p_user_id" "uuid", "reference_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_reminders"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_reminders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_reminders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_goal_actual_amount"("p_user_id" "uuid", "p_category_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_goal_actual_amount"("p_user_id" "uuid", "p_category_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_goal_actual_amount"("p_user_id" "uuid", "p_category_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."incrementar_frequencia_memoria"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."incrementar_frequencia_memoria"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."incrementar_frequencia_memoria"("p_user_id" "uuid", "p_tipo" "text", "p_chave" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."learn_or_reinforce_fact"("p_user_id" "uuid", "p_memory_type" "text", "p_content" "text", "p_metadata" "jsonb", "p_tags" "text"[], "p_source" "text", "p_query_embedding" "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."learn_or_reinforce_fact"("p_user_id" "uuid", "p_memory_type" "text", "p_content" "text", "p_metadata" "jsonb", "p_tags" "text"[], "p_source" "text", "p_query_embedding" "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."learn_or_reinforce_fact"("p_user_id" "uuid", "p_memory_type" "text", "p_content" "text", "p_metadata" "jsonb", "p_tags" "text"[], "p_source" "text", "p_query_embedding" "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_bill_as_paid"("p_bill_id" "uuid", "p_user_id" "uuid", "p_paid_amount" numeric, "p_payment_method" character varying, "p_account_from_id" "uuid", "p_confirmation_number" character varying, "p_payment_proof_url" "text", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_bill_as_paid"("p_bill_id" "uuid", "p_user_id" "uuid", "p_paid_amount" numeric, "p_payment_method" character varying, "p_account_from_id" "uuid", "p_confirmation_number" character varying, "p_payment_proof_url" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_bill_as_paid"("p_bill_id" "uuid", "p_user_id" "uuid", "p_paid_amount" numeric, "p_payment_method" character varying, "p_account_from_id" "uuid", "p_confirmation_number" character varying, "p_payment_proof_url" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_reminder_failed"("p_reminder_id" "uuid", "p_error_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_reminder_failed"("p_reminder_id" "uuid", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_reminder_failed"("p_reminder_id" "uuid", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_reminder_failed"("p_reminder_id" "uuid", "p_error_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_reminder_sent"("p_reminder_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_reminder_sent"("p_reminder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_reminder_sent"("p_reminder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_reminder_sent"("p_reminder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_legacy_badges_to_badge_progress"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_legacy_badges_to_badge_progress"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_legacy_badges_to_badge_progress"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."now_brasilia"() TO "anon";
GRANT ALL ON FUNCTION "public"."now_brasilia"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."now_brasilia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_gamification_event"("p_user_id" "uuid", "p_event" "text", "p_activity_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."process_gamification_event"("p_user_id" "uuid", "p_event" "text", "p_activity_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_gamification_event"("p_user_id" "uuid", "p_event" "text", "p_activity_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_whatsapp_command"("p_user_id" "uuid", "p_phone" "text", "p_content" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_whatsapp_command"("p_user_id" "uuid", "p_phone" "text", "p_content" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_whatsapp_command"("p_user_id" "uuid", "p_phone" "text", "p_content" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_investment_from_ledger"("p_investment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_investment_from_ledger"("p_investment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_investment_from_ledger"("p_investment_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."financial_goals" TO "anon";
GRANT ALL ON TABLE "public"."financial_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_goals" TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_spending_goal"("goal_row" "public"."financial_goals") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_spending_goal"("goal_row" "public"."financial_goals") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_spending_goal"("goal_row" "public"."financial_goals") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_spending_goals_by_category"("p_user_id" "uuid", "p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_spending_goals_by_category"("p_user_id" "uuid", "p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_spending_goals_by_category"("p_user_id" "uuid", "p_category_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_bill_tags"("p_bill_id" "uuid", "p_tag_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_bill_tags"("p_bill_id" "uuid", "p_tag_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."replace_bill_tags"("p_bill_id" "uuid", "p_tag_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_bill_tags"("p_bill_id" "uuid", "p_tag_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_credit_card_transaction_tags"("p_credit_card_transaction_id" "uuid", "p_tag_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_credit_card_transaction_tags"("p_credit_card_transaction_id" "uuid", "p_tag_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."replace_credit_card_transaction_tags"("p_credit_card_transaction_id" "uuid", "p_tag_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_credit_card_transaction_tags"("p_credit_card_transaction_id" "uuid", "p_tag_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_transaction_tags"("p_transaction_id" "uuid", "p_tag_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_transaction_tags"("p_transaction_id" "uuid", "p_tag_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."replace_transaction_tags"("p_transaction_id" "uuid", "p_tag_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_transaction_tags"("p_transaction_id" "uuid", "p_tag_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."reschedule_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_override_start_at" timestamp with time zone, "p_override_end_at" timestamp with time zone, "p_title_override" "text", "p_description_override" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reschedule_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_override_start_at" timestamp with time zone, "p_override_end_at" timestamp with time zone, "p_title_override" "text", "p_description_override" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reschedule_calendar_occurrence"("p_event_id" "uuid", "p_original_start_at" timestamp with time zone, "p_override_start_at" timestamp with time zone, "p_override_end_at" timestamp with time zone, "p_title_override" "text", "p_description_override" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_memory_episode"("p_user_id" "uuid", "p_summary" "text", "p_importance" numeric, "p_source" "text", "p_outcome" "text", "p_entities" "jsonb", "p_context_window_hours" integer, "p_expires_in_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."save_memory_episode"("p_user_id" "uuid", "p_summary" "text", "p_importance" numeric, "p_source" "text", "p_outcome" "text", "p_entities" "jsonb", "p_context_window_hours" integer, "p_expires_in_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_memory_episode"("p_user_id" "uuid", "p_summary" "text", "p_importance" numeric, "p_source" "text", "p_outcome" "text", "p_entities" "jsonb", "p_context_window_hours" integer, "p_expires_in_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_bill_reminders"("p_bill_id" "uuid", "p_user_id" "uuid", "p_reminders" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_bill_reminders"("p_bill_id" "uuid", "p_user_id" "uuid", "p_reminders" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_bill_reminders"("p_bill_id" "uuid", "p_user_id" "uuid", "p_reminders" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_agent_memories"("p_user_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer, "p_memory_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."search_agent_memories"("p_user_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer, "p_memory_types" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_agent_memories"("p_user_id" "uuid", "p_query_embedding" "public"."vector", "p_match_threshold" double precision, "p_match_count" integer, "p_memory_types" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."send_proactive_whatsapp_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."send_proactive_whatsapp_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_proactive_whatsapp_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_calendar_event_recurrence"("p_event_id" "uuid", "p_remove_recurrence" boolean, "p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text", "p_confirm_drop_overrides" boolean, "p_confirm_drop_reminders" boolean, "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_calendar_event_recurrence"("p_event_id" "uuid", "p_remove_recurrence" boolean, "p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text", "p_confirm_drop_overrides" boolean, "p_confirm_drop_reminders" boolean, "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_calendar_event_recurrence"("p_event_id" "uuid", "p_remove_recurrence" boolean, "p_frequency" "public"."calendar_recurrence_frequency", "p_interval_value" integer, "p_by_weekday" "text"[], "p_by_monthday" integer[], "p_starts_at" timestamp with time zone, "p_until_at" timestamp with time zone, "p_count_limit" integer, "p_timezone" "text", "p_confirm_drop_overrides" boolean, "p_confirm_drop_reminders" boolean, "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_calendar_event_reminders"("p_event_id" "uuid", "p_reminders" "jsonb", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_calendar_event_reminders"("p_event_id" "uuid", "p_reminders" "jsonb", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_calendar_event_reminders"("p_event_id" "uuid", "p_reminders" "jsonb", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_calendar_event_status"("p_event_id" "uuid", "p_new_status" "public"."calendar_event_status", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_calendar_event_status"("p_event_id" "uuid", "p_new_status" "public"."calendar_event_status", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_calendar_event_status"("p_event_id" "uuid", "p_new_status" "public"."calendar_event_status", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_badge_tiers"("p_user_id" "uuid", "p_badge_id" "text", "p_progress" numeric, "p_bronze_target" numeric, "p_silver_target" numeric, "p_gold_target" numeric, "p_bronze_xp" integer, "p_silver_xp" integer, "p_gold_xp" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sync_badge_tiers"("p_user_id" "uuid", "p_badge_id" "text", "p_progress" numeric, "p_bronze_target" numeric, "p_silver_target" numeric, "p_gold_target" numeric, "p_bronze_xp" integer, "p_silver_xp" integer, "p_gold_xp" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_badge_tiers"("p_user_id" "uuid", "p_badge_id" "text", "p_progress" numeric, "p_bronze_target" numeric, "p_silver_target" numeric, "p_gold_target" numeric, "p_bronze_xp" integer, "p_silver_xp" integer, "p_gold_xp" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_financial_goal_savings_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_financial_goal_savings_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_financial_goal_savings_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_gamification_badges"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_gamification_badges"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_gamification_badges"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_investment_after_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_investment_after_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_investment_after_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_investment_prices"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_investment_prices"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_investment_prices"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_spending_goal_before_write"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_spending_goal_before_write"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_spending_goal_before_write"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_user_activity_streak"("p_user_id" "uuid", "p_activity_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."track_user_activity_streak"("p_user_id" "uuid", "p_activity_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_user_activity_streak"("p_user_id" "uuid", "p_activity_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_check_badges"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_check_badges"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_check_badges"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_xp_reward" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_xp_reward" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_achievement"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_xp_reward" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."unlock_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_xp_reward" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_xp_reward" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_badge"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_xp_reward" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_account_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_account_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_account_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_achievement_progress"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_achievement_progress"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_achievement_progress"("p_user_id" "uuid", "p_achievement_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_available_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_available_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_available_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_badge_progress"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_badge_progress"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_badge_progress"("p_user_id" "uuid", "p_badge_id" "text", "p_tier" "text", "p_progress" numeric, "p_target" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_best_streak"("goal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_best_streak"("goal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_best_streak"("goal_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_budget_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_budget_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_budget_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calendar_event"("p_event_id" "uuid", "p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_priority" "text", "p_ticktick_tags" "text"[], "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_calendar_event"("p_event_id" "uuid", "p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_priority" "text", "p_ticktick_tags" "text"[], "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calendar_event"("p_event_id" "uuid", "p_title" "text", "p_date" "date", "p_timezone" "text", "p_all_day" boolean, "p_description" "text", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_location_text" "text", "p_event_kind" "text", "p_priority" "text", "p_ticktick_tags" "text"[], "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_card_limit_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_card_limit_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_card_limit_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_card_limit_on_purchase"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_card_limit_on_purchase"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_card_limit_on_purchase"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_gamification_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_gamification_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gamification_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_goal_amount_on_contribution"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_goal_amount_on_contribution"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_goal_amount_on_contribution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_goal_contributions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_goal_contributions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_goal_contributions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_investment_after_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_investment_after_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investment_after_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_investment_alerts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_investment_alerts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investment_alerts_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_investment_goal_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_investment_goal_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_investment_goal_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_remaining_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_remaining_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_remaining_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_total_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_total_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_total_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_total_on_transaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_total_on_transaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_total_on_transaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_overdue_bills"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_overdue_bills"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_overdue_bills"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_spending_goals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_spending_goals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_spending_goals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_spending_goals_from_transactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_spending_goals_from_transactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_spending_goals_from_transactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_webhook_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_webhook_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_webhook_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_whatsapp_connections_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_whatsapp_connections_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_whatsapp_connections_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."agent_action_log" TO "anon";
GRANT ALL ON TABLE "public"."agent_action_log" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_action_log" TO "service_role";



GRANT ALL ON TABLE "public"."agent_daily_sessions" TO "anon";
GRANT ALL ON TABLE "public"."agent_daily_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_daily_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."agent_identity" TO "anon";
GRANT ALL ON TABLE "public"."agent_identity" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_identity" TO "service_role";



GRANT ALL ON TABLE "public"."agent_memory_entries" TO "anon";
GRANT ALL ON TABLE "public"."agent_memory_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_memory_entries" TO "service_role";



GRANT ALL ON TABLE "public"."agent_memory_episodes" TO "anon";
GRANT ALL ON TABLE "public"."agent_memory_episodes" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_memory_episodes" TO "service_role";



GRANT ALL ON TABLE "public"."agent_pending_tasks" TO "anon";
GRANT ALL ON TABLE "public"."agent_pending_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_pending_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."ai_provider_configs" TO "anon";
GRANT ALL ON TABLE "public"."ai_provider_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_provider_configs" TO "service_role";



GRANT ALL ON TABLE "public"."ana_clara_config" TO "anon";
GRANT ALL ON TABLE "public"."ana_clara_config" TO "authenticated";
GRANT ALL ON TABLE "public"."ana_clara_config" TO "service_role";



GRANT ALL ON TABLE "public"."ana_clara_group_message_memory" TO "anon";
GRANT ALL ON TABLE "public"."ana_clara_group_message_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."ana_clara_group_message_memory" TO "service_role";



GRANT ALL ON TABLE "public"."ana_insights_cache" TO "anon";
GRANT ALL ON TABLE "public"."ana_insights_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."ana_insights_cache" TO "service_role";



GRANT ALL ON TABLE "public"."badge_progress" TO "anon";
GRANT ALL ON TABLE "public"."badge_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."badge_progress" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."bill_payment_history" TO "anon";
GRANT ALL ON TABLE "public"."bill_payment_history" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_payment_history" TO "service_role";



GRANT ALL ON TABLE "public"."bill_reminders" TO "anon";
GRANT ALL ON TABLE "public"."bill_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."bill_tags" TO "anon";
GRANT ALL ON TABLE "public"."bill_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."bill_tags" TO "service_role";



GRANT ALL ON TABLE "public"."budget_summaries" TO "anon";
GRANT ALL ON TABLE "public"."budget_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_event_occurrence_overrides" TO "anon";
GRANT ALL ON TABLE "public"."calendar_event_occurrence_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_event_occurrence_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_event_recurrence_rules" TO "anon";
GRANT ALL ON TABLE "public"."calendar_event_recurrence_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_event_recurrence_rules" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_event_reminders" TO "anon";
GRANT ALL ON TABLE "public"."calendar_event_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_event_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_external_event_links" TO "anon";
GRANT ALL ON TABLE "public"."calendar_external_event_links" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_external_event_links" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_reminder_schedule" TO "anon";
GRANT ALL ON TABLE "public"."calendar_reminder_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_reminder_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_jobs" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."category_rules" TO "anon";
GRANT ALL ON TABLE "public"."category_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."category_rules" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_context" TO "anon";
GRANT ALL ON TABLE "public"."conversation_context" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_context" TO "service_role";



GRANT ALL ON TABLE "public"."credit_card_invoices" TO "anon";
GRANT ALL ON TABLE "public"."credit_card_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_card_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."credit_card_payments" TO "anon";
GRANT ALL ON TABLE "public"."credit_card_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_card_payments" TO "service_role";



GRANT ALL ON TABLE "public"."credit_card_transaction_tags" TO "anon";
GRANT ALL ON TABLE "public"."credit_card_transaction_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_card_transaction_tags" TO "service_role";



GRANT ALL ON TABLE "public"."credit_card_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_card_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_card_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."credit_cards" TO "anon";
GRANT ALL ON TABLE "public"."credit_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_cards" TO "service_role";



GRANT ALL ON TABLE "public"."education_daily_tips" TO "anon";
GRANT ALL ON TABLE "public"."education_daily_tips" TO "authenticated";
GRANT ALL ON TABLE "public"."education_daily_tips" TO "service_role";



GRANT ALL ON TABLE "public"."education_glossary_terms" TO "anon";
GRANT ALL ON TABLE "public"."education_glossary_terms" TO "authenticated";
GRANT ALL ON TABLE "public"."education_glossary_terms" TO "service_role";



GRANT ALL ON TABLE "public"."education_lessons" TO "anon";
GRANT ALL ON TABLE "public"."education_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."education_lessons" TO "service_role";



GRANT ALL ON TABLE "public"."education_modules" TO "anon";
GRANT ALL ON TABLE "public"."education_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."education_modules" TO "service_role";



GRANT ALL ON TABLE "public"."education_tracks" TO "anon";
GRANT ALL ON TABLE "public"."education_tracks" TO "authenticated";
GRANT ALL ON TABLE "public"."education_tracks" TO "service_role";



GRANT ALL ON TABLE "public"."education_user_profile" TO "anon";
GRANT ALL ON TABLE "public"."education_user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."education_user_profile" TO "service_role";



GRANT ALL ON TABLE "public"."education_user_progress" TO "anon";
GRANT ALL ON TABLE "public"."education_user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."education_user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."financial_cycles" TO "anon";
GRANT ALL ON TABLE "public"."financial_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."financial_goal_contributions" TO "anon";
GRANT ALL ON TABLE "public"."financial_goal_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_goal_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."goal_contributions" TO "anon";
GRANT ALL ON TABLE "public"."goal_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."goal_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."integration_configs" TO "anon";
GRANT ALL ON TABLE "public"."integration_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_configs" TO "service_role";



GRANT ALL ON TABLE "public"."investment_accounts" TO "anon";
GRANT ALL ON TABLE "public"."investment_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."investment_alerts" TO "anon";
GRANT ALL ON TABLE "public"."investment_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."investment_allocation_targets" TO "anon";
GRANT ALL ON TABLE "public"."investment_allocation_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_allocation_targets" TO "service_role";



GRANT ALL ON TABLE "public"."investment_goal_contributions" TO "anon";
GRANT ALL ON TABLE "public"."investment_goal_contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_goal_contributions" TO "service_role";



GRANT ALL ON TABLE "public"."investment_goals" TO "anon";
GRANT ALL ON TABLE "public"."investment_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_goals" TO "service_role";



GRANT ALL ON TABLE "public"."investment_quotes_history" TO "anon";
GRANT ALL ON TABLE "public"."investment_quotes_history" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_quotes_history" TO "service_role";



GRANT ALL ON TABLE "public"."investment_transactions" TO "anon";
GRANT ALL ON TABLE "public"."investment_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."investment_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."investments" TO "anon";
GRANT ALL ON TABLE "public"."investments" TO "authenticated";
GRANT ALL ON TABLE "public"."investments" TO "service_role";



GRANT ALL ON TABLE "public"."investor_profile_assessments" TO "anon";
GRANT ALL ON TABLE "public"."investor_profile_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_profile_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_expenses_by_category" TO "anon";
GRANT ALL ON TABLE "public"."monthly_expenses_by_category" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_expenses_by_category" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications_log" TO "anon";
GRANT ALL ON TABLE "public"."notifications_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications_log" TO "service_role";



GRANT ALL ON TABLE "public"."payable_bills" TO "anon";
GRANT ALL ON TABLE "public"."payable_bills" TO "authenticated";
GRANT ALL ON TABLE "public"."payable_bills" TO "service_role";



GRANT ALL ON TABLE "public"."portfolio_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."portfolio_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolio_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."push_tokens" TO "anon";
GRANT ALL ON TABLE "public"."push_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."push_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."saved_filters" TO "anon";
GRANT ALL ON TABLE "public"."saved_filters" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_filters" TO "service_role";



GRANT ALL ON TABLE "public"."savings_goals" TO "anon";
GRANT ALL ON TABLE "public"."savings_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."savings_goals" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_edits" TO "anon";
GRANT ALL ON TABLE "public"."transaction_edits" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_edits" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_tags" TO "anon";
GRANT ALL ON TABLE "public"."transaction_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_achievements" TO "anon";
GRANT ALL ON TABLE "public"."user_achievements" TO "authenticated";
GRANT ALL ON TABLE "public"."user_achievements" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges_detailed" TO "anon";
GRANT ALL ON TABLE "public"."user_badges_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."user_gamification" TO "anon";
GRANT ALL ON TABLE "public"."user_gamification" TO "authenticated";
GRANT ALL ON TABLE "public"."user_gamification" TO "service_role";



GRANT ALL ON TABLE "public"."user_gamification_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_gamification_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_gamification_profile" TO "service_role";



GRANT ALL ON TABLE "public"."user_memory" TO "anon";
GRANT ALL ON TABLE "public"."user_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memory" TO "service_role";



GRANT ALL ON TABLE "public"."user_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_total_balance" TO "anon";
GRANT ALL ON TABLE "public"."user_total_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."user_total_balance" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."v_all_transactions" TO "anon";
GRANT ALL ON TABLE "public"."v_all_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."v_all_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."v_bills_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_bills_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_bills_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_credit_card_transactions_with_installments" TO "anon";
GRANT ALL ON TABLE "public"."v_credit_card_transactions_with_installments" TO "authenticated";
GRANT ALL ON TABLE "public"."v_credit_card_transactions_with_installments" TO "service_role";



GRANT ALL ON TABLE "public"."v_credit_cards_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_credit_cards_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_credit_cards_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_investment_performance" TO "anon";
GRANT ALL ON TABLE "public"."v_investment_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."v_investment_performance" TO "service_role";



GRANT ALL ON TABLE "public"."v_invoices_detailed" TO "anon";
GRANT ALL ON TABLE "public"."v_invoices_detailed" TO "authenticated";
GRANT ALL ON TABLE "public"."v_invoices_detailed" TO "service_role";



GRANT ALL ON TABLE "public"."v_monthly_budget_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_monthly_budget_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_monthly_budget_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_portfolio_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_portfolio_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_portfolio_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_recurring_bills_history" TO "anon";
GRANT ALL ON TABLE "public"."v_recurring_bills_history" TO "authenticated";
GRANT ALL ON TABLE "public"."v_recurring_bills_history" TO "service_role";



GRANT ALL ON TABLE "public"."v_recurring_bills_trend" TO "anon";
GRANT ALL ON TABLE "public"."v_recurring_bills_trend" TO "authenticated";
GRANT ALL ON TABLE "public"."v_recurring_bills_trend" TO "service_role";



GRANT ALL ON TABLE "public"."v_reminders_brasilia" TO "anon";
GRANT ALL ON TABLE "public"."v_reminders_brasilia" TO "authenticated";
GRANT ALL ON TABLE "public"."v_reminders_brasilia" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_endpoints" TO "anon";
GRANT ALL ON TABLE "public"."webhook_endpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_endpoints" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_connections" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_connections" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_conversation_context" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_conversation_context" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_conversation_context" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_messages" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_messages" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_quick_commands" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_quick_commands" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_quick_commands" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







