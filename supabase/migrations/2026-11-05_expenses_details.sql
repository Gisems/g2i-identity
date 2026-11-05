-- Finanzas: plataforma, quién realizó el gasto y fecha de vencimiento (renovación).
-- Ejecútalo DESPUÉS de 2026-11-05_expenses.sql. No borra datos existentes.

alter table public.expenses add column if not exists platform   text;                                                -- GoDaddy, Namecheap, Google Ads...
alter table public.expenses add column if not exists paid_by    uuid references public.users(id) on delete set null; -- quién lo realizó
alter table public.expenses add column if not exists expires_on date;                                                -- cuándo vence / se renueva
create index if not exists idx_expenses_expires on public.expenses(expires_on) where expires_on is not null;
