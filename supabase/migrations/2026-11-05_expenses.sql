-- Finanzas: tabla de gastos. Pégalo en Supabase > SQL Editor y ejecútalo UNA vez.
-- No borra datos existentes.

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  concept       text not null,
  category      text not null default 'otro'
                check (category in ('hosting', 'herramientas', 'publicidad', 'sueldos', 'impuestos', 'oficina', 'servicios', 'otro')),
  amount        numeric(12,2) not null check (amount > 0),
  currency      text not null default 'PEN' check (currency in ('PEN', 'USD')),
  expense_date  date not null default current_date,
  notes         text,
  created_by    uuid references public.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_expenses_date on public.expenses(expense_date);

drop trigger if exists trg_expenses_updated on public.expenses;
create trigger trg_expenses_updated before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;
drop policy if exists team_select on public.expenses;
drop policy if exists team_insert on public.expenses;
drop policy if exists team_update on public.expenses;
drop policy if exists team_delete on public.expenses;
create policy team_select on public.expenses for select to authenticated using (public.is_team_member());
create policy team_insert on public.expenses for insert to authenticated with check (public.is_team_member());
create policy team_update on public.expenses for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
-- Los gastos mal cargados los puede borrar cualquier miembro del equipo.
create policy team_delete on public.expenses for delete to authenticated using (public.is_team_member());
