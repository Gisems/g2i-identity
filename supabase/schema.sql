-- =====================================================================
--  G2I Digital · Client portal
--  Full script for Supabase (PostgreSQL 15+)
--  Paste into: Supabase → SQL Editor → New query → Run
--  Table and column names are in English. Stored values (statuses,
--  channels, etc.) stay in Spanish because they are shown in the UI.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. CLEANUP: wipes EVERYTHING in the public schema (tables, views,
--    functions) and the policies on storage.objects, whatever
--    their names are. Does NOT touch auth.users or Supabase internals.
-- WARNING: all data in public tables is deleted permanently.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  -- views
  for r in select viewname from pg_views where schemaname = 'public' loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;
  -- tables
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
  -- functions (skip those owned by extensions)
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
  -- policies on storage files
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 0. Utilities
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Internal users (G2I team), 1:1 with auth.users
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        text not null default 'ventas'
              check (role in ('admin', 'ventas', 'dev', 'diseño')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Is the current user an active team member?
create or replace function public.is_team_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.active and u.role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- 2. Clients
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                     -- legal or business name
  trade_name  text,
  ruc         text unique,                       -- Peruvian tax id (11 digits)
  phone       text,
  email       text,
  country     text default 'Perú',
  city        text,
  address     text,
  status      text not null default 'prospecto'
              check (status in ('prospecto', 'activo', 'inactivo', 'perdido')),
  source      text
              check (source in ('web', 'diagnostico', 'whatsapp', 'referido', 'redes', 'evento', 'otro')),
  -- OWNER: who registered the client. Set automatically from the logged-in user (auth.uid()).
  -- A user who owns clients cannot be deleted: deactivate them (users.active = false) or reassign first.
  owner_id    uuid not null default auth.uid() references public.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_clients_owner  on public.clients(owner_id);
create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_clients_name   on public.clients using gin (to_tsvector('spanish', name));

-- The owner is always whoever uploads the client. Only an admin can assign/reassign.
-- (From the SQL Editor or service_role there is no auth.uid(): the given owner_id is kept.)
create or replace function public.protect_client_owner()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.owner_id is null or not public.is_admin() then
      new.owner_id := auth.uid();
    end if;
  elsif new.owner_id is distinct from old.owner_id and not public.is_admin() then
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clients_owner on public.clients;
create trigger trg_clients_owner before insert or update on public.clients
  for each row execute function public.protect_client_owner();

-- ---------------------------------------------------------------------
-- 3. Representatives (one or many per client)
-- ---------------------------------------------------------------------
create table if not exists public.representatives (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  name         text not null,
  job_title    text,
  document_id  text,                             -- DNI / CE
  phone        text,
  email        text,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_representatives_client on public.representatives(client_id);
-- Only one primary representative per client
create unique index if not exists uq_representatives_primary
  on public.representatives(client_id) where is_primary;

-- ---------------------------------------------------------------------
-- 4. Client brand details (1:1)
-- ---------------------------------------------------------------------
create table if not exists public.client_details (
  client_id        uuid primary key references public.clients(id) on delete cascade,
  description      text,
  industry         text,
  target_audience  text,
  current_website  text,
  domain           text,
  hosting          text,
  -- {"instagram":"https://...","facebook":"...","tiktok":"...","linkedin":"..."}
  social_links     jsonb not null default '{}'::jsonb,
  -- [{"name":"Primary","hex":"#1A2B3C"}, ...]
  brand_colors     jsonb not null default '[]'::jsonb,
  typefaces        text,
  logo_path        text,                         -- path in Storage (bucket "logos")
  drive_folder_url text,                         -- assets folder in Google Drive
  access_location  text,                         -- WHERE credentials are kept (e.g. "Bitwarden > Clients > ACME"). NEVER store passwords here.
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Service catalog
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  type          text not null
                check (type in ('web', 'tienda', 'integracion', 'producto_digital', 'seo', 'mantenimiento', 'diagnostico')),
  description   text,
  base_price    numeric(12,2),
  currency      text not null default 'PEN' check (currency in ('PEN', 'USD')),
  is_recurring  boolean not null default false,  -- hosting, maintenance, monthly SEO
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Projects (what is sold to each client)
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid not null references public.clients(id) on delete cascade,
  service_id               uuid not null references public.services(id),
  title                    text not null,
  description              text,
  status                   text not null default 'propuesta'
                           check (status in ('propuesta', 'aprobado', 'en_curso', 'en_revision', 'entregado', 'pausado', 'cancelado')),
  total_amount             numeric(12,2) not null default 0,
  currency                 text not null default 'PEN' check (currency in ('PEN', 'USD')),
  start_date               date,
  estimated_delivery_date  date,
  actual_delivery_date     date,
  production_url           text,
  manager_id               uuid references public.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);

-- ---------------------------------------------------------------------
-- 7. Payments (payment plan of each project) and installments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null unique references public.projects(id) on delete cascade,
  modality           text not null default 'contado'
                     check (modality in ('contado', 'cuotas', 'adelanto_saldo', 'recurrente')),
  installment_count  int not null default 1 check (installment_count >= 1),
  periodicity        text check (periodicity in ('mensual', 'trimestral', 'anual')), -- only if recurring
  currency           text not null default 'PEN' check (currency in ('PEN', 'USD')),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.installments (
  id                uuid primary key default gen_random_uuid(),
  payment_id        uuid not null references public.payments(id) on delete cascade,
  number            int not null check (number >= 1),
  concept           text,                        -- "Adelanto 50%", "Cuota 2", "Mantenimiento marzo"
  amount            numeric(12,2) not null check (amount >= 0),
  due_date          date not null,
  paid_date         date,
  payment_method    text check (payment_method in ('transferencia', 'yape', 'plin', 'tarjeta', 'efectivo', 'otro')),
  operation_number  text,
  receipt_path      text,                        -- path in Storage (bucket "receipts")
  status            text not null default 'pendiente'
                    check (status in ('pendiente', 'pagada', 'anulada')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (payment_id, number)
);
create index if not exists idx_installments_due on public.installments(due_date) where status = 'pendiente';

-- Setting paid_date automatically flips the installment to "pagada"
create or replace function public.mark_installment_paid()
returns trigger language plpgsql as $$
begin
  if new.paid_date is not null and new.status = 'pendiente' then
    new.status := 'pagada';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Contracts
-- ---------------------------------------------------------------------
create table if not exists public.contracts (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  type         text not null default 'servicio'
               check (type in ('servicio', 'mantenimiento', 'confidencialidad', 'adenda')),
  issue_date   date,
  signed_date  date,
  valid_until  date,
  file_path    text,                             -- path in Storage (bucket "contracts")
  status       text not null default 'borrador'
               check (status in ('borrador', 'enviado', 'firmado', 'vencido', 'anulado')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_contracts_project on public.contracts(project_id);

-- ---------------------------------------------------------------------
-- 9. Free diagnostics
-- ---------------------------------------------------------------------
create table if not exists public.diagnostics (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  analyzed_url          text not null,
  requested_date        date not null default current_date,
  delivered_date        date,
  status                text not null default 'solicitado'
                        check (status in ('solicitado', 'en_analisis', 'entregado', 'convertido', 'descartado')),
  -- [{"area":"SEO","finding":"Sin meta description","priority":"alta"}, ...]
  improvement_points    jsonb not null default '[]'::jsonb,
  overall_score         int check (overall_score between 0 and 100),
  mockup_url            text,                    -- visual proposal of how it would look
  report_path           text,                    -- report PDF (bucket "diagnostics")
  manager_id            uuid references public.users(id) on delete set null,
  converted_project_id  uuid references public.projects(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_diagnostics_status on public.diagnostics(status);

-- ---------------------------------------------------------------------
-- 10. Appointments (client agenda)
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  diagnostic_id    uuid references public.diagnostics(id) on delete set null,
  manager_id       uuid references public.users(id) on delete set null,
  title            text not null,
  type             text not null default 'reunion_inicial'
                   check (type in ('reunion_inicial', 'presentacion_diagnostico', 'propuesta', 'revision_avance', 'entrega', 'capacitacion', 'soporte', 'cobranza', 'otro')),
  start_at         timestamptz not null,
  end_at           timestamptz,
  modality         text not null default 'videollamada'
                   check (modality in ('presencial', 'videollamada', 'llamada')),
  location_or_link text,
  status           text not null default 'agendada'
                   check (status in ('agendada', 'confirmada', 'realizada', 'cancelada', 'reprogramada', 'no_asistio')),
  notes            text,
  google_event_id  text,                         -- to sync with Google Calendar
  source           text default 'manual' check (source in ('manual', 'cal_com', 'google_calendar', 'web')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_at is null or end_at > start_at)
);
create index if not exists idx_appointments_start  on public.appointments(start_at);
create index if not exists idx_appointments_client on public.appointments(client_id);

-- ---------------------------------------------------------------------
-- 11. Follow-ups (every contact with a client = 1 record)
-- ---------------------------------------------------------------------
create table if not exists public.follow_ups (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  project_id         uuid references public.projects(id) on delete set null,
  diagnostic_id      uuid references public.diagnostics(id) on delete set null,
  appointment_id     uuid references public.appointments(id) on delete set null,
  author_id          uuid references public.users(id) on delete set null default auth.uid(),
  contacted_at       timestamptz not null default now(),
  channel            text not null
                     check (channel in ('llamada', 'whatsapp', 'email', 'reunion', 'redes', 'otro')),
  reason             text not null default 'venta'
                     check (reason in ('venta', 'post_diagnostico', 'propuesta', 'cobranza', 'soporte', 'post_entrega', 'renovacion', 'otro')),
  outcome            text not null default 'pendiente'
                     check (outcome in ('respondio', 'sin_respuesta', 'interesado', 'no_interesado', 'cerrado', 'pendiente')),
  comment            text,
  next_action        text,
  next_action_date   date,
  next_action_done   boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_follow_ups_client on public.follow_ups(client_id, contacted_at desc);
create index if not exists idx_follow_ups_next   on public.follow_ups(next_action_date)
  where not next_action_done;

-- Marking an appointment as "realizada" creates its follow-up automatically
create or replace function public.create_follow_up_from_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'realizada'
     and (old.status is distinct from 'realizada')
     and not exists (select 1 from public.follow_ups f where f.appointment_id = new.id) then
    insert into public.follow_ups (client_id, project_id, diagnostic_id, appointment_id, author_id,
                                   contacted_at, channel, reason, outcome, comment)
    values (new.client_id, new.project_id, new.diagnostic_id, new.id,
            coalesce(auth.uid(), new.manager_id),
            coalesce(new.end_at, new.start_at), 'reunion',
            case new.type
              when 'presentacion_diagnostico' then 'post_diagnostico'
              when 'propuesta' then 'propuesta'
              when 'cobranza' then 'cobranza'
              when 'soporte' then 'soporte'
              when 'entrega' then 'post_entrega'
              else 'venta'
            end,
            'pendiente',
            'Cita realizada: ' || new.title);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 12. Triggers
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['users','clients','representatives','client_details','services',
                           'projects','payments','installments','contracts','diagnostics',
                           'appointments','follow_ups']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$I', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

drop trigger if exists trg_installment_paid on public.installments;
create trigger trg_installment_paid before insert or update on public.installments
  for each row execute function public.mark_installment_paid();

drop trigger if exists trg_appointment_follow_up on public.appointments;
create trigger trg_appointment_follow_up after update of status on public.appointments
  for each row execute function public.create_follow_up_from_appointment();

-- ---------------------------------------------------------------------
-- 13. Dashboard views
-- ---------------------------------------------------------------------

-- Per-client summary: follow-up count, appointments, balance, etc.
drop view if exists public.client_summary;
create view public.client_summary
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.ruc,
  c.status,
  c.phone,
  c.owner_id,
  ow.name                                          as owner_name,
  rp.name                                          as primary_representative,
  coalesce(f.total_follow_ups, 0)                  as total_follow_ups,
  coalesce(f.follow_ups_last_30_days, 0)           as follow_ups_last_30_days,
  f.last_contact_at,
  case when f.last_contact_at is null then null
       else (current_date - f.last_contact_at::date) end as days_since_contact,
  f.next_action_date,
  coalesce(ap.total_appointments, 0)               as total_appointments,
  coalesce(ap.completed_appointments, 0)           as completed_appointments,
  coalesce(ap.no_shows, 0)                         as no_shows,
  ap.next_appointment_at,
  coalesce(p.active_projects, 0)                   as active_projects,
  coalesce(d.pending_balance, 0)                   as pending_balance,
  coalesce(d.overdue_installments, 0)              as overdue_installments
from public.clients c
left join public.users ow on ow.id = c.owner_id
left join lateral (
  select r.name from public.representatives r
  where r.client_id = c.id order by r.is_primary desc, r.created_at limit 1
) rp on true
left join lateral (
  select count(*)                                                       as total_follow_ups,
         count(*) filter (where contacted_at >= now() - interval '30 days') as follow_ups_last_30_days,
         max(contacted_at)                                              as last_contact_at,
         min(next_action_date) filter (where not next_action_done
                                       and next_action_date is not null) as next_action_date
  from public.follow_ups where client_id = c.id
) f on true
left join lateral (
  select count(*)                                          as total_appointments,
         count(*) filter (where status = 'realizada')      as completed_appointments,
         count(*) filter (where status = 'no_asistio')     as no_shows,
         min(start_at) filter (where start_at >= now()
                               and status in ('agendada','confirmada')) as next_appointment_at
  from public.appointments where client_id = c.id
) ap on true
left join lateral (
  select count(*) filter (where status in ('aprobado','en_curso','en_revision')) as active_projects
  from public.projects where client_id = c.id
) p on true
left join lateral (
  select sum(i.amount) filter (where i.status = 'pendiente') as pending_balance,
         count(*) filter (where i.status = 'pendiente' and i.due_date < current_date) as overdue_installments
  from public.projects pr
  join public.payments pa on pa.project_id = pr.id
  join public.installments i on i.payment_id = pa.id
  where pr.client_id = c.id
) d on true;

-- Payment status per project
create or replace view public.project_payment_summary
with (security_invoker = true) as
select
  pr.id            as project_id,
  pr.client_id,
  pr.title,
  pr.total_amount,
  pr.currency,
  pa.modality,
  coalesce(sum(i.amount) filter (where i.status = 'pagada'), 0)    as paid,
  coalesce(sum(i.amount) filter (where i.status = 'pendiente'), 0) as pending,
  count(i.*) filter (where i.status = 'pendiente' and i.due_date < current_date) as overdue_installments,
  min(i.due_date) filter (where i.status = 'pendiente')            as next_due_date,
  case
    when pa.id is null then 'sin_plan'
    when count(i.*) filter (where i.status = 'pendiente') = 0 then 'pagado'
    when count(i.*) filter (where i.status = 'pendiente' and i.due_date < current_date) > 0 then 'con_atraso'
    else 'al_dia'
  end as payment_status
from public.projects pr
left join public.payments pa on pa.project_id = pr.id
left join public.installments i on i.payment_id = pa.id
group by pr.id, pa.id;

-- Free diagnostics funnel
create or replace view public.diagnostics_funnel
with (security_invoker = true) as
select
  date_trunc('month', d.requested_date)::date as month,
  count(*)                                                        as requested,
  count(*) filter (where d.status in ('entregado','convertido'))  as delivered,
  count(*) filter (where d.converted_project_id is not null)      as converted,
  round(100.0 * count(*) filter (where d.converted_project_id is not null)
        / nullif(count(*), 0), 1)                                 as conversion_rate_pct,
  round(avg(fu.n) filter (where d.converted_project_id is not null), 1) as avg_follow_ups_to_close
from public.diagnostics d
left join lateral (
  select count(*) as n from public.follow_ups f where f.diagnostic_id = d.id
) fu on true
group by 1
order by 1 desc;

-- ---------------------------------------------------------------------
-- 13a. Finance: company accounts, deposits and payroll
--      (see supabase/migrations/2026-11-05_account_payroll.sql)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 13b. Finance: expenses (see supabase/migrations/2026-11-05_expenses.sql)
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  concept       text not null,
  category      text not null default 'otro'
                check (category in ('hosting', 'herramientas', 'publicidad', 'sueldos', 'impuestos', 'oficina', 'servicios', 'otro')),
  amount        numeric(12,2) not null check (amount > 0),
  currency      text not null default 'PEN' check (currency in ('PEN', 'USD')),
  expense_date  date not null default current_date,
  platform      text,                                                      -- GoDaddy, Namecheap, Google Ads...
  paid_by       uuid references public.users(id) on delete set null,       -- who made the expense
  expires_on    date,                                                      -- when it expires / renews
  account_id    uuid references public.accounts(id) on delete set null,    -- account it was paid from
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

drop trigger if exists trg_accounts_updated on public.accounts;
create trigger trg_accounts_updated before update on public.accounts
  for each row execute function public.set_updated_at();
drop trigger if exists trg_payroll_updated on public.payroll_payments;
create trigger trg_payroll_updated before update on public.payroll_payments
  for each row execute function public.set_updated_at();

-- Accounts / deposits / payroll: admins only
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

-- ---------------------------------------------------------------------
-- 14. Security (Row Level Security)
--     Only authenticated, active team members can read and write.
--     Only admins can delete.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clients','representatives','client_details','services','projects',
                           'payments','installments','contracts','diagnostics','appointments','follow_ups']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists team_select on public.%I', t);
    execute format('drop policy if exists team_insert on public.%I', t);
    execute format('drop policy if exists team_update on public.%I', t);
    execute format('drop policy if exists admin_delete on public.%I', t);
    execute format('create policy team_select on public.%I for select to authenticated using (public.is_team_member())', t);
    execute format('create policy team_insert on public.%I for insert to authenticated with check (public.is_team_member())', t);
    execute format('create policy team_update on public.%I for update to authenticated using (public.is_team_member()) with check (public.is_team_member())', t);
    execute format('create policy admin_delete on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

alter table public.users enable row level security;
drop policy if exists users_select on public.users;
drop policy if exists users_admin on public.users;
create policy users_select on public.users for select to authenticated using (public.is_team_member());
create policy users_admin  on public.users for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 15. Storage: private buckets for files
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', false),
       ('contracts', 'contracts', false),
       ('receipts', 'receipts', false),
       ('diagnostics', 'diagnostics', false)
on conflict (id) do nothing;

drop policy if exists team_reads_files on storage.objects;
drop policy if exists team_uploads_files on storage.objects;
drop policy if exists team_updates_files on storage.objects;
drop policy if exists admin_deletes_files on storage.objects;

create policy team_reads_files on storage.objects for select to authenticated
  using (bucket_id in ('logos','contracts','receipts','diagnostics') and public.is_team_member());
create policy team_uploads_files on storage.objects for insert to authenticated
  with check (bucket_id in ('logos','contracts','receipts','diagnostics') and public.is_team_member());
create policy team_updates_files on storage.objects for update to authenticated
  using (bucket_id in ('logos','contracts','receipts','diagnostics') and public.is_team_member());
create policy admin_deletes_files on storage.objects for delete to authenticated
  using (bucket_id in ('logos','contracts','receipts','diagnostics') and public.is_admin());

-- Suggested path convention:
--   logos/{client_id}/logo.png
--   contracts/{project_id}/{contract_id}.pdf
--   receipts/{project_id}/installment-{number}.jpg
--   diagnostics/{diagnostic_id}/report.pdf

-- ---------------------------------------------------------------------
-- 16. Initial service catalog
-- ---------------------------------------------------------------------
insert into public.services (name, type, description, is_recurring) values
  ('Web corporativa',            'web',              'Sitio institucional a medida', false),
  ('Tienda online',              'tienda',           'E-commerce con pagos y pedidos', false),
  ('Integración CRM / WhatsApp', 'integracion',      'Conexión de web con CRM, WhatsApp o pasarela de pagos', false),
  ('Producto digital',           'producto_digital', 'Sistema, dashboard o app a medida', false),
  ('SEO técnico',                'seo',              'Optimización y posicionamiento orgánico', false),
  ('Mantenimiento y hosting',    'mantenimiento',    'Soporte, dominio y hosting', true),
  ('Diagnóstico web gratuito',   'diagnostico',      'Análisis de la web actual y propuesta de mejoras', false)
on conflict (name) do nothing;

-- =====================================================================
-- FINAL STEP (manual): register each team member
-- 1. Supabase → Authentication → Users → "Add user" / "Invite user".
-- 2. Copy their UUID and run:
--    insert into public.users (id, name, email, role)
--    values ('USER-UUID', 'First Last', 'email@g2i.com', 'admin');
-- 3. Authentication → Sign In / Providers → Email: turn off "Allow new users to sign up".
-- =====================================================================
