-- Un gasto puede ser gratis (monto 0), p. ej. un plan gratuito de una plataforma.
alter table public.expenses drop constraint if exists expenses_amount_check;
alter table public.expenses add constraint expenses_amount_check check (amount >= 0);
