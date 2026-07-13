create table if not exists public.obra_expenses (
  id text primary key,
  group_id text not null,
  purchase_date date not null,
  payment_date date not null,
  category text not null,
  description text not null,
  supplier text not null,
  amount numeric(12, 2) not null,
  total_amount numeric(12, 2) not null,
  payment_method text not null,
  card_name text not null default '',
  installment_mode text not null,
  installment_number integer not null,
  total_installments integer not null,
  phase text not null default '',
  created_at timestamptz not null default now()
);

alter table public.obra_expenses
add column if not exists card_name text not null default '';

alter table public.obra_expenses enable row level security;

drop policy if exists "service role manages obra expenses" on public.obra_expenses;
create policy "service role manages obra expenses"
on public.obra_expenses
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
