-- Align bank_transactions uniqueness with the poller/materializer upsert contract.
-- PostgreSQL unique indexes already allow multiple NULL external_id values, so the
-- previous partial predicate blocked ON CONFLICT inference without providing benefit.

DROP INDEX IF EXISTS public.bank_transactions_user_source_external_id_key;

CREATE UNIQUE INDEX bank_transactions_user_source_external_id_key
  ON public.bank_transactions (user_id, source, external_id);
