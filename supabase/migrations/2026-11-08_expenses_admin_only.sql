-- Finanzas es solo para administradores: los gastos pasan a ser solo-admin (antes, cualquier miembro del equipo).
drop policy if exists team_select on public.expenses;
drop policy if exists team_insert on public.expenses;
drop policy if exists team_update on public.expenses;
drop policy if exists team_delete on public.expenses;
drop policy if exists admin_delete on public.expenses;
drop policy if exists admin_all on public.expenses;
create policy admin_all on public.expenses for all to authenticated using (public.is_admin()) with check (public.is_admin());
