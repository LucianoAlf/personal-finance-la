-- Budgets + Summaries + Trigger/Function (v2)
create extension if not exists pgcrypto;

-- 1) Table: budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  month varchar(7) not null check (month ~ '^[0-9]{4}-[0-9]{2}$'), -- 'YYYY-MM'
  planned_amount numeric(10,2) not null check (planned_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_unique_user_cat_month unique (user_id, category_id, month)
);

create index if not exists idx_budgets_user_month on public.budgets(user_id, month);
create index if not exists idx_budgets_category on public.budgets(category_id);

-- 2) Table: budget_summaries
create table if not exists public.budget_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  month varchar(7) not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  planned_income numeric(10,2) not null default 0,
  total_planned numeric(10,2) not null default 0,
  total_actual numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_summaries_unique_user_month unique (user_id, month)
);

create index if not exists idx_budget_summaries_user_month on public.budget_summaries(user_id, month);

-- 3) Function: update_budget_summary
create or replace function public.update_budget_summary()
returns trigger
language plpgsql
security definer
as $$
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

-- 4) Trigger to keep updated_at and maintain summary
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_budgets_set_updated_at on public.budgets;
create trigger trg_budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

drop trigger if exists trg_budgets_update_summary on public.budgets;
create trigger trg_budgets_update_summary
after insert or update on public.budgets
for each row execute function public.update_budget_summary();

-- 5) RLS
alter table public.budgets enable row level security;
alter table public.budget_summaries enable row level security;

-- Budgets policies (drop then create to avoid duplicates)
drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own on public.budgets
for select using (auth.uid() = user_id);

drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own on public.budgets
for insert with check (auth.uid() = user_id);

drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own on public.budgets
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own on public.budgets
for delete using (auth.uid() = user_id);

-- Budget summaries policies
drop policy if exists budget_summaries_select_own on public.budget_summaries;
create policy budget_summaries_select_own on public.budget_summaries
for select using (auth.uid() = user_id);

drop policy if exists budget_summaries_insert_own on public.budget_summaries;
create policy budget_summaries_insert_own on public.budget_summaries
for insert with check (auth.uid() = user_id);

drop policy if exists budget_summaries_update_own on public.budget_summaries;
create policy budget_summaries_update_own on public.budget_summaries
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists budget_summaries_delete_own on public.budget_summaries;
create policy budget_summaries_delete_own on public.budget_summaries
for delete using (auth.uid() = user_id);

-- 6) View for quick summaries
create or replace view public.v_monthly_budget_summary as
select 
  bs.user_id,
  bs.month,
  bs.planned_income,
  bs.total_planned,
  bs.total_actual,
  (bs.planned_income - bs.total_planned) as balance_expected,
  (bs.planned_income - bs.total_actual) as balance_actual
from public.budget_summaries bs;
;
