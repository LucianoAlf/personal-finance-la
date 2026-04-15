-- =============================================================================
-- SCHEMA BASELINE REPAIR — Core PFM tables (replayable DDL)
-- =============================================================================
-- Context: The incremental migration history did not include CREATE statements
-- for public.users, public.accounts, public.categories, or public.transactions.
-- Those objects existed in production (and in tmp/remote-public-schema.sql) but
-- were missing from replay, so fresh local bootstrap failed (e.g. tags migration
-- referencing public.transactions before any migration created it).
--
-- Source of truth for column shapes and checks: tmp/remote-public-schema.sql
-- (public schema dump aligned with project sbnpmhmvcspwcyjhftlw).
--
-- Ordering: filename sorts before all historical migrations so downstream files
-- replay unchanged. See docs/engineering/2026-04-15-schema-baseline-repair.md.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email character varying NOT NULL,
  full_name character varying,
  avatar_url character varying,
  phone character varying,
  whatsapp_connected boolean DEFAULT false,
  couple_mode boolean DEFAULT false,
  partner_id uuid,
  monthly_savings_goal numeric(10,2),
  closing_day integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  nickname character varying(100),
  CONSTRAINT users_closing_day_check CHECK (closing_day >= 1 AND closing_day <= 31),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_phone_key UNIQUE (phone)
);

ALTER TABLE public.users
  ADD CONSTRAINT users_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.users (id) ON DELETE SET NULL;

CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name character varying NOT NULL,
  type character varying NOT NULL,
  bank_name character varying,
  initial_balance numeric(10,2) DEFAULT 0,
  current_balance numeric(10,2) DEFAULT 0,
  color character varying DEFAULT '#6366f1',
  icon character varying DEFAULT 'Wallet',
  is_shared boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  include_in_total boolean DEFAULT true NOT NULL,
  CONSTRAINT accounts_type_check CHECK (
    (type)::text = ANY (
      (ARRAY['checking', 'savings', 'cash', 'investment', 'credit_card'])::character varying[]
    )
  )
);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name character varying NOT NULL,
  type character varying NOT NULL,
  parent_id uuid,
  color character varying DEFAULT '#6366f1',
  icon character varying DEFAULT 'FolderOpen',
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  keywords text[],
  CONSTRAINT categories_type_check CHECK (
    (type)::text = ANY (
      (ARRAY['income', 'expense'])::character varying[]
    )
  )
);

ALTER TABLE public.categories
  ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.categories (id) ON DELETE CASCADE;

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts (id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories (id) ON DELETE SET NULL,
  type character varying NOT NULL,
  amount numeric(10,2) NOT NULL,
  description character varying,
  transaction_date date NOT NULL,
  is_paid boolean DEFAULT true,
  is_recurring boolean DEFAULT false,
  recurrence_type character varying,
  recurrence_end_date date,
  attachment_url character varying,
  notes text,
  source character varying DEFAULT 'manual',
  whatsapp_message_id character varying,
  transfer_to_account_id uuid REFERENCES public.accounts (id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'completed',
  temp_id text,
  confirmed_at timestamp with time zone,
  payment_method character varying(20),
  CONSTRAINT transactions_amount_check CHECK (amount > (0)::numeric),
  CONSTRAINT transactions_payment_method_check CHECK (
    (payment_method)::text = ANY (
      (ARRAY['pix', 'credit', 'debit', 'cash', 'boleto', 'transfer', 'other'])::character varying[]
    )
  ),
  CONSTRAINT transactions_recurrence_type_check CHECK (
    (recurrence_type)::text = ANY (
      (ARRAY['daily', 'weekly', 'monthly', 'yearly'])::character varying[]
    )
  ),
  CONSTRAINT transactions_source_check CHECK (
    (source)::text = ANY (
      (ARRAY['manual', 'whatsapp', 'import', 'open_finance'])::character varying[]
    )
  ),
  CONSTRAINT transactions_status_check CHECK (
    status = ANY (ARRAY['pending_confirmation', 'completed', 'cancelled']::text[])
  ),
  CONSTRAINT transactions_type_check CHECK (
    (type)::text = ANY (
      (ARRAY['income', 'expense', 'transfer'])::character varying[]
    )
  )
);

COMMENT ON TABLE public.users IS 'Usuários da plataforma Personal Finance LA';
COMMENT ON TABLE public.accounts IS 'Contas bancárias, carteiras e investimentos dos usuários';
COMMENT ON TABLE public.categories IS 'Taxonomia de transações (usuário e sistema)';
COMMENT ON TABLE public.transactions IS 'Todas as transações financeiras (receitas, despesas, transferências)';
