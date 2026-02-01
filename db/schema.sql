create extension if not exists pgcrypto;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  thread_id text not null,
  type text not null check (type in ('EXPENSE','INCOME')),
  amount_mxn_cents bigint not null check (amount_mxn_cents >= 0),
  category_type text not null check (category_type in ('INCOME','FIXED','VARIABLE','DEBT','DONATION','SAVINGS')),
  check (
    (type = 'INCOME' and category_type = 'INCOME')
    or
    (type = 'EXPENSE' and category_type in ('FIXED','VARIABLE','DEBT','DONATION','SAVINGS'))
  ),
  category text not null,
  description text null,
  date_iso text not null check (date_iso ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_thread_date
  on transactions (user_id, thread_id, date_iso);

create index if not exists idx_transactions_user_thread_created
  on transactions (user_id, thread_id, created_at desc);

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  thread_id text not null,
  name text not null,
  balance_mxn_cents bigint null check (balance_mxn_cents is null or balance_mxn_cents >= 0),
  minimum_payment_mxn_cents bigint null check (minimum_payment_mxn_cents is null or minimum_payment_mxn_cents >= 0),
  due_day_of_month int null check (due_day_of_month is null or (due_day_of_month between 1 and 31)),
  priority text not null,
  do_not_accelerate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_debts_user_thread
  on debts (user_id, thread_id);

create unique index if not exists uq_debts_user_thread_name
  on debts (user_id, thread_id, name);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  thread_id text not null,
  effective_month text not null check (effective_month ~ '^\d{4}-\d{2}$'),
  variable_cap_mxn_cents bigint not null check (variable_cap_mxn_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_budgets_user_thread_month
  on budgets (user_id, thread_id, effective_month);

create table if not exists bank_balances (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  thread_id text not null,
  bank_balance_mxn_cents bigint not null check (bank_balance_mxn_cents >= 0),
  as_of_iso timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bank_balances_user_thread_asof
  on bank_balances (user_id, thread_id, as_of_iso desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_debts_set_updated_at on debts;
create trigger trg_debts_set_updated_at
before update on debts
for each row
execute function set_updated_at();

drop trigger if exists trg_budgets_set_updated_at on budgets;
create trigger trg_budgets_set_updated_at
before update on budgets
for each row
execute function set_updated_at();
