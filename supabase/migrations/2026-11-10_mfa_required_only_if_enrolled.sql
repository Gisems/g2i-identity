-- El 2FA (aal2) se exige solo a quien ya tiene un factor TOTP verificado.
-- Quien aún no lo activó entra con aal1 y lo configura después en Ajustes.
-- Antes la base exigía aal2 a todos, pero la app solo pedía 2FA a quien ya lo tenía,
-- así que los usuarios sin 2FA quedaban fuera del portal (sin-acceso).

create or replace function public.is_team_member()
returns boolean language sql stable security definer set search_path = public as $$
  select (
      coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      )
    )
    and exists (select 1 from public.users u where u.id = auth.uid() and u.active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select (
      coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      )
    )
    and exists (select 1 from public.users u where u.id = auth.uid() and u.active and u.role = 'admin');
$$;
