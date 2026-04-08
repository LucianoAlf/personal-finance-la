-- Canonical categories & tag assignment hardening (2026-04-07)
-- Checklist (assertions this migration enforces):
-- [x] public.categories remains the single canonical category table for operational rows
--     (transactions, credit_card_transactions, payable_bills, financial_goals); no parallel category tables added.
-- [x] Tag name uniqueness per user at insert/update time: unique (user_id, lower(name)) on public.tags.
-- [x] Composite lookup indexes on junction tables: (entity_id, tag_id) for the three assignment paths.
-- [x] RPCs to replace all tag links for one entity atomically (bank tx, card tx, bill).
-- Verification note (Task 2 / Step 4):
-- - `npx supabase db lint` could not run locally because Postgres on 127.0.0.1:54322 was unavailable.
-- - `npx supabase db lint --linked` completed and reported unrelated existing remote schema issues, not this migration.
-- - Final rollout still requires the normal apply workflow (`supabase db push` or project equivalent).

-- ---------------------------------------------------------------------------
-- Documentation (non-destructive): runtime ownership
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.categories IS
  'Canonical per-user (and system) transaction taxonomy. Runtime source of truth for category_id on transactions, credit_card_transactions, payable_bills, financial_goals, and related rules; app and edge functions must resolve category_id against this table.';

COMMENT ON TABLE public.tags IS
  'Canonical per-user tag catalog. Runtime source of truth for tag definitions; assignments are stored only in entity-specific junction tables (transaction_tags, credit_card_transaction_tags, bill_tags).';

COMMENT ON TABLE public.transaction_tags IS
  'Tag assignments for public.transactions; one row per (transaction_id, tag_id).';

COMMENT ON TABLE public.credit_card_transaction_tags IS
  'Tag assignments for public.credit_card_transactions; one row per (credit_card_transaction_id, tag_id).';

COMMENT ON TABLE public.bill_tags IS
  'Tag assignments for public.payable_bills; one row per (bill_id, tag_id).';

-- ---------------------------------------------------------------------------
-- Indexes: case-insensitive unique tag names per user
-- Fails if duplicate pairs (user_id, lower(name)) already exist; resolve data before applying.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_lower_name_unique
  ON public.tags (user_id, lower(name));

-- ---------------------------------------------------------------------------
-- Indexes: composite (entity, tag) for joins and replacement deletes
-- Additive alongside any existing single-column indexes.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id_tag_id
  ON public.transaction_tags (transaction_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_credit_card_transaction_tags_cc_tx_tag_id
  ON public.credit_card_transaction_tags (credit_card_transaction_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_bill_tags_bill_id_tag_id
  ON public.bill_tags (bill_id, tag_id);

-- ---------------------------------------------------------------------------
-- RPCs: atomically replace tag set for one entity (caller = authenticated user)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_transaction_tags(
  p_transaction_id uuid,
  p_tag_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.replace_credit_card_transaction_tags(
  p_credit_card_transaction_id uuid,
  p_tag_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

CREATE OR REPLACE FUNCTION public.replace_bill_tags(
  p_bill_id uuid,
  p_tag_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

REVOKE ALL ON FUNCTION public.replace_transaction_tags(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_credit_card_transaction_tags(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_bill_tags(uuid, uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.replace_transaction_tags(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_credit_card_transaction_tags(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_bill_tags(uuid, uuid[]) TO authenticated;
