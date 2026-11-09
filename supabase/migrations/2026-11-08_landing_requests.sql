-- Solicitudes desde la landing (diagnóstico gratis y proyecto) + cambios del modelo.
-- Aplica este script una vez en Supabase → SQL Editor. Luego ejecuta el INSERT del secreto que está al final.

-- 1. Los clientes ya no tienen "responsable" (owner_id).
drop trigger if exists trg_clients_owner on public.clients;
drop function if exists public.protect_client_owner();
drop index if exists public.idx_clients_owner;
-- La vista usaba owner_id: se vuelve a crear sin él.
drop view if exists public.client_summary;
create or replace view public.client_summary
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.ruc,
  c.status,
  c.phone,
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
alter table public.clients drop column if exists owner_id;

-- Admin que le hace seguimiento al cliente: se elige a mano en la ficha (puede quedar sin asignar).
alter table public.clients add column if not exists follow_up_admin_id uuid references public.users(id) on delete set null;

-- 2. "Origen" del cliente: 'web' si viene de la landing; si no, el nombre de quien lo creó (ya no es una lista fija).
alter table public.clients drop constraint if exists clients_source_check;

-- 3. Proyectos: nuevo estado "solicitado" y servicio opcional (se elige al preparar la propuesta).
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('solicitado', 'propuesta', 'aprobado', 'en_curso', 'en_revision', 'entregado', 'pausado', 'cancelado'));
alter table public.projects alter column service_id drop not null;   -- legacy: ahora se usa "services"
-- Servicios pedidos (multiselect), solo valores de la lista fija.
alter table public.projects add column if not exists services text[] not null default '{}';
alter table public.projects drop constraint if exists projects_services_check;
alter table public.projects add constraint projects_services_check check (services <@ array['Web nueva', 'Tienda online', 'Automatización', 'SEO', 'Integraciones (CRM, pagos, WhatsApp)', 'Aún no lo sé']::text[]);

-- 4. Diagnósticos: lo que el visitante escribió en el formulario.
alter table public.diagnostics add column if not exists request_notes text;

-- ---------------------------------------------------------------------
-- 16. Landing requests (diagnóstico gratis y solicitud de proyecto)
-- ---------------------------------------------------------------------
-- El servidor de la landing llama a esta función con la clave pública (anon) y un secreto compartido.
-- Sin el secreto correcto rechaza la llamada, así que nadie puede usarla directo desde internet.
-- Solo crea prospectos: no lee ni modifica datos de clientes que ya existen.
create table if not exists public.lead_settings (
  key   text primary key,
  value text not null
);
alter table public.lead_settings enable row level security;   -- sin políticas: la API no la expone
revoke all on public.lead_settings from anon, authenticated;

create or replace function public.register_landing_request(p_secret text, p_payload jsonb)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_hash      text;
  v_kind      text;
  v_person    text;
  v_company   text;
  v_email     text;
  v_phone     text;
  v_web       text;
  v_message   text;
  v_services  text[];
  v_client_id uuid;
  v_title     text;
  v_recent    int;
begin
  select value into v_hash from public.lead_settings where key = 'landing_secret_sha256';
  if v_hash is null or p_secret is null
     or encode(sha256(convert_to(p_secret, 'UTF8')), 'hex') <> v_hash then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  v_kind    := p_payload ->> 'kind';
  v_person  := left(btrim(coalesce(p_payload ->> 'name', '')), 100);
  v_company := left(btrim(coalesce(p_payload ->> 'company', '')), 120);
  v_email   := lower(left(btrim(coalesce(p_payload ->> 'email', '')), 254));
  v_phone   := nullif(left(btrim(coalesce(p_payload ->> 'phone', '')), 30), '');
  v_web     := nullif(left(btrim(coalesce(p_payload ->> 'web', '')), 300), '');
  v_message := nullif(left(btrim(coalesce(p_payload ->> 'message', '')), 2000), '');

  if v_kind is null or v_kind not in ('diagnostico', 'diagnostico_extra', 'proyecto') then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  -- Solo enlaces http(s): se muestran como enlace en el portal.
  if v_web is not null and v_web !~* '^https?://[^\s]+$' then
    v_web := null;
  end if;

  -- Tope de seguridad: si alguien se salta la landing y llena la base, la función se cierra sola un rato.
  select (select count(*) from public.diagnostics where created_at > now() - interval '1 hour')
       + (select count(*) from public.projects
          where status = 'solicitado' and created_at > now() - interval '1 hour')
    into v_recent;
  if v_recent >= 40 then
    raise exception 'rate_limited' using errcode = '54000';
  end if;

  -- Respuestas opcionales de la pantalla de confirmación del diagnóstico: se agregan a la solicitud reciente.
  if v_kind = 'diagnostico_extra' then
    if v_message is null or v_web is null then
      return;
    end if;
    update public.diagnostics
       set request_notes = left(coalesce(request_notes || E'\n', '') || v_message, 3000)
     where id = (
       select d.id
         from public.diagnostics d
         join public.clients c on c.id = d.client_id
        where lower(c.email) = v_email
          and d.analyzed_url = v_web
          and d.status = 'solicitado'
          and d.created_at > now() - interval '24 hours'
        order by d.created_at desc
        limit 1);
    return;
  end if;

  if v_person = '' then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  if v_kind = 'diagnostico' and v_web is null then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  -- Un correo ya registrado reutiliza al cliente sin tocar sus datos.
  select id into v_client_id
    from public.clients
   where lower(email) = v_email
   order by created_at
   limit 1;

  if v_client_id is null then
    insert into public.clients (name, email, phone, status, source)
    values (coalesce(nullif(v_company, ''), v_person), v_email, v_phone, 'prospecto', 'web')
    returning id into v_client_id;

    insert into public.representatives (client_id, name, phone, email, is_primary)
    values (v_client_id, v_person, v_phone, v_email, true);

    insert into public.client_details (client_id, current_website)
    values (v_client_id, v_web);
  end if;

  if v_kind = 'diagnostico' then
    insert into public.diagnostics (client_id, analyzed_url, status, request_notes)
    values (v_client_id, v_web, 'solicitado', v_message);
  else
    -- Solo servicios de la lista fija (sin repetir).
    select coalesce(array_agg(distinct s), '{}') into v_services
      from (
        select left(btrim(e), 60) as s
          from jsonb_array_elements_text(
                 case when jsonb_typeof(p_payload -> 'services') = 'array'
                      then p_payload -> 'services' else '[]'::jsonb end) as e
         limit 12
      ) t
     where s = any (array['Web nueva', 'Tienda online', 'Automatización', 'SEO', 'Integraciones (CRM, pagos, WhatsApp)', 'Aún no lo sé']::text[]);

    v_title := left(
      coalesce(nullif(v_company, ''), v_person) || ' - ' ||
      case when cardinality(array_remove(v_services, 'Aún no lo sé')) = 0 then 'Por definir'
           else array_to_string(array_remove(v_services, 'Aún no lo sé'), ', ') end,
      200);

    insert into public.projects (client_id, title, description, status, services)
    values (v_client_id, v_title, v_message, 'solicitado', v_services);
  end if;
end;
$$;

revoke all on function public.register_landing_request(text, jsonb) from public, anon, authenticated;
grant execute on function public.register_landing_request(text, jsonb) to anon;

-- Secreto compartido con la landing (se guarda solo su hash). Ejecútalo una vez, con un secreto largo y aleatorio,
-- y pon el mismo secreto en la variable LEAD_SECRET de Netlify:
--   insert into public.lead_settings (key, value)
--   values ('landing_secret_sha256', encode(sha256(convert_to('PEGA-AQUI-EL-SECRETO', 'UTF8')), 'hex'))
--   on conflict (key) do update set value = excluded.value;
