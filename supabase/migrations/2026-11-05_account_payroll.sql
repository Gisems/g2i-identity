-- Finanzas: cuenta de la empresa (saldo) y pagos a empleados.
-- Ejecútalo DESPUÉS de 2026-11-05_expenses.sql y 2026-11-05_expenses_details.sql. No borra datos existentes.
-- Cuentas, depósitos y sueldos solo los puede ver y escribir un admin (RLS).

-- 1. Cuentas de la empresa --------------------------------------------------
create table if not exists public.accounts (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null unique,
  currency                  text not null default 'PEN' check (currency in ('PEN', 'USD')),
  opening_balance           numeric(12,2) not null default 0,     -- saldo con el que empieza a contarse
  opening_date              date not null default current_date,   -- desde cuándo se cuentan los movimientos
  receives_client_payments  boolean not null default true,        -- suma las cuotas cobradas (misma moneda)
  active                    boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- 2. Depósitos a la cuenta ---------------------------------------------------
create table if not exists public.account_deposits (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  amount        numeric(12,2) not null check (amount > 0),
  deposit_date  date not null default current_date,
  concept       text,
  created_by    uuid references public.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index if not exists idx_deposits_account on public.account_deposits(account_id, deposit_date);

-- 3. Pagos a empleados --------------------------------------------------------
create table if not exists public.payroll_payments (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.users(id) on delete restrict,
  kind         text not null default 'sueldo' check (kind in ('sueldo', 'bono', 'adelanto', 'otro')),
  period       date not null,                                   -- primer día del mes al que corresponde
  amount       numeric(12,2) not null check (amount > 0),
  currency     text not null default 'PEN' check (currency in ('PEN', 'USD')),
  paid_date    date not null default current_date,
  account_id   uuid references public.accounts(id) on delete set null,
  notes        text,
  created_by   uuid references public.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_payroll_period   on public.payroll_payments(period);
create index if not exists idx_payroll_employee on public.payroll_payments(employee_id);
create index if not exists idx_payroll_account  on public.payroll_payments(account_id, paid_date);

-- 4. Desde qué cuenta se pagó cada gasto -------------------------------------
alter table public.expenses add column if not exists account_id uuid references public.accounts(id) on delete set null;
create index if not exists idx_expenses_account on public.expenses(account_id, expense_date);

-- 5. updated_at --------------------------------------------------------------
drop trigger if exists trg_accounts_updated on public.accounts;
create trigger trg_accounts_updated before update on public.accounts
  for each row execute function public.set_updated_at();
drop trigger if exists trg_payroll_updated on public.payroll_payments;
create trigger trg_payroll_updated before update on public.payroll_payments
  for each row execute function public.set_updated_at();

-- 6. Seguridad: solo admins ----------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['accounts', 'account_deposits', 'payroll_payments']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
