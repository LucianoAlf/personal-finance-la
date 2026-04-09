-- Create helper function for updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- savings_goals table
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  target_amount numeric(14,2),
  target_percent numeric(5,2),
  current_amount numeric(14,2) default 0,
  deadline date,
  is_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint savings_goals_target_check check (target_amount is not null or target_percent is not null)
);

create index if not exists idx_savings_goals_user_id on public.savings_goals(user_id);
create index if not exists idx_savings_goals_deadline on public.savings_goals(deadline);

-- trigger updated_at
create or replace trigger trg_savings_goals_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

-- RLS for savings_goals
alter table public.savings_goals enable row level security;

drop policy if exists savings_goals_select_own on public.savings_goals;
drop policy if exists savings_goals_insert_own on public.savings_goals;
drop policy if exists savings_goals_update_own on public.savings_goals;
drop policy if exists savings_goals_delete_own on public.savings_goals;

create policy savings_goals_select_own on public.savings_goals for select using (auth.uid() = user_id);
create policy savings_goals_insert_own on public.savings_goals for insert with check (auth.uid() = user_id);
create policy savings_goals_update_own on public.savings_goals for update using (auth.uid() = user_id);
create policy savings_goals_delete_own on public.savings_goals for delete using (auth.uid() = user_id);

-- financial_cycles table
create table if not exists public.financial_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('salary','credit_card','rent','custom')),
  day int not null check (day between 1 and 31),
  name text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_financial_cycles_user_id on public.financial_cycles(user_id);
create index if not exists idx_financial_cycles_active on public.financial_cycles(user_id, active);

-- trigger updated_at
create or replace trigger trg_financial_cycles_updated_at
before update on public.financial_cycles
for each row execute function public.set_updated_at();

-- RLS for financial_cycles
alter table public.financial_cycles enable row level security;

drop policy if exists financial_cycles_select_own on public.financial_cycles;
drop policy if exists financial_cycles_insert_own on public.financial_cycles;
drop policy if exists financial_cycles_update_own on public.financial_cycles;
drop policy if exists financial_cycles_delete_own on public.financial_cycles;

create policy financial_cycles_select_own on public.financial_cycles for select using (auth.uid() = user_id);
create policy financial_cycles_insert_own on public.financial_cycles for insert with check (auth.uid() = user_id);
create policy financial_cycles_update_own on public.financial_cycles for update using (auth.uid() = user_id);
create policy financial_cycles_delete_own on public.financial_cycles for delete using (auth.uid() = user_id);;
