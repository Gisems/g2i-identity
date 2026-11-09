import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, MessageSquare, Pencil, Plus } from "lucide-react";
import {
  APPOINTMENT_STATUS, CLIENT_STATUS, DIAGNOSTIC_STATUS, MODALITY, PAYMENT_STATUS,
  Badge, Empty, Panel, StatusBadge, btn,
} from "@/components/pv";
import ArchiveClientButton from "../ArchiveClientButton";
import FollowUpSelect from "./FollowUpSelect";
import PaymentDialog from "../../pagos/PaymentDialog";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/session";
import { isHttpUrl } from "@/lib/url";
import { dateShort, dateTime, initials, money, timeShort, todayLima } from "@/lib/format";

type Color = { name: string; hex: string };
type Installment = { id: string; number: number; concept: string | null; amount: number; due_date: string; paid_date: string | null; payment_method: string | null; operation_number: string | null; status: string };
type Project = {
  id: string;
  title: string;
  status: string;
  total_amount: number;
  currency: string;
  services: string[];
  description: string | null;
  start_date: string | null;
  estimated_delivery_date: string | null;
  legacy_service: { name: string } | null;
  payments: { modality: string; installments: Installment[] } | null;
};

const PROJECT_STATUS: Record<string, string> = {
  solicitado: "Solicitado", propuesta: "Propuesta", aprobado: "Aprobado", en_curso: "En curso", en_revision: "En revisión",
  entregado: "Entregado", pausado: "Pausado", cancelado: "Cancelado",
};
const SOURCE: Record<string, string> = {
  web: "Web", diagnostico: "Diagnóstico", whatsapp: "WhatsApp", referido: "Referido", redes: "Redes", evento: "Evento", otro: "Otro",
};
const CHANNEL: Record<string, string> = { llamada: "Llamada", whatsapp: "WhatsApp", email: "Correo", reunion: "Reunión", redes: "Redes", otro: "Otro" };
const REASON: Record<string, string> = {
  venta: "Venta", post_diagnostico: "Post diagnóstico", propuesta: "Propuesta", cobranza: "Cobranza",
  soporte: "Soporte", post_entrega: "Post entrega", renovacion: "Renovación", otro: "Otro",
};
const OUTCOME: Record<string, string> = {
  respondio: "Respondió", sin_respuesta: "Sin respuesta", interesado: "Interesado", no_interesado: "No interesado", cerrado: "Cerrado", pendiente: "Pendiente",
};

const dash = (v: string | null | undefined) => (v && v.trim() ? v : "—");

export default async function ClientePage({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "resumen";
  const today = todayLima();
  const supabase = await createClient();

  const [summary, client, reps, details, followUps, projects, appts, diags, admins, me] = await Promise.all([
    supabase.from("client_summary").select("*").eq("id", id).maybeSingle(),
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("representatives").select("*").eq("client_id", id).order("is_primary", { ascending: false }),
    supabase.from("client_details").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("follow_ups").select("*").eq("client_id", id).order("contacted_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, status, total_amount, currency, services, description, start_date, estimated_delivery_date, legacy_service:services!service_id(name), payments(modality, installments(id, number, concept, amount, due_date, paid_date, payment_method, operation_number, status))")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("appointments").select("*").eq("client_id", id).order("start_at", { ascending: false }),
    supabase.from("diagnostics").select("id, analyzed_url, status, overall_score, requested_date").eq("client_id", id).order("requested_date", { ascending: false }),
    supabase.from("users").select("id, name, active").eq("role", "admin").order("name"),
    getProfile(),
  ]);

  if (!client.data || !summary.data) notFound();
  const c = client.data;
  const s = summary.data;
  const d = details.data;
  const colors = (d?.brand_colors ?? []) as Color[];
  const social = Object.fromEntries(
    Object.entries((d?.social_links ?? {}) as Record<string, string>).filter(([, v]) => typeof v === "string" && isHttpUrl(v)),
  );
  const projs = (projects.data ?? []) as unknown as Project[];
  const fu = followUps.data ?? [];
  const ap = appts.data ?? [];
  const dg = diags.data ?? [];
  // Admins activos para elegir; si el asignado ya está desactivado, se conserva para que se vea quién era.
  const adminList = (admins.data ?? []).filter((a) => a.active || a.id === c.follow_up_admin_id);
  const followUpAdmin = adminList.find((a) => a.id === c.follow_up_admin_id);
  const canAssign = me?.active && me.role === "admin";

  const pendingCount = projs.reduce((t, p) => t + (p.payments?.installments ?? []).filter((i) => i.status === "pendiente").length, 0);

  const tabs: [string, string, number?][] = [
    ["resumen", "Resumen"],
    ["marca", "Marca y assets"],
    ["proyectos", "Proyectos", projs.length],
    ["pagos", "Pagos", pendingCount || undefined],
    ["seguimientos", "Seguimientos", fu.length],
    ["citas", "Citas", ap.length],
  ];

  return (
    <>
      <Link href="/clientes" className="back"><ChevronLeft /> Clientes</Link>

      {sp.aviso === "parcial" && (
        <div className="form-warn" role="status">El cliente se creó, pero no se pudieron guardar todos sus representantes o detalles de marca.</div>
      )}

      <div className="client-head">
        <div className="client-logo" style={{ background: colors[0]?.hex ?? "#004952" }}>{initials(c.name)}</div>
        <div>
          <h1>{c.name}</h1>
          <div className="meta">
            <span>RUC <span className="mono">{c.ruc ?? "—"}</span></span>
            {c.phone && <span>{c.phone}</span>}
            <StatusBadge map={CLIENT_STATUS} value={c.status} />
          </div>
        </div>
        <div className="actions">
          <Link href={`/agenda/nueva?cliente=${id}`} className={btn()}><CalendarDays /> Agregar cita</Link>
          <Link href={`/diagnosticos/nuevo?cliente=${id}`} className={btn()}><Plus /> Agregar diagnóstico</Link>
          <Link href={`/clientes/${id}/editar`} className={btn("cta")}><Pencil /> Editar</Link>
          <ArchiveClientButton id={id} name={c.name} inactive={c.status === "inactivo"} />
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map(([k, l, n]) => (
          <Link key={k} href={`/clientes/${id}?tab=${k}`} role="tab" aria-selected={tab === k}>
            {l}
            {n != null && <span className="n">{n}</span>}
          </Link>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="cols">
          <Panel title="Datos de la empresa" action={<Link href={`/clientes/${id}/editar`} className={btn("small")}>Editar</Link>}>
            <div className="panel-body">
              <dl className="facts">
                <dt>Razón social</dt><dd>{c.name}</dd>
                <dt>Nombre comercial</dt><dd>{dash(c.trade_name)}</dd>
                <dt>RUC</dt><dd className="mono">{dash(c.ruc)}</dd>
                <dt>Teléfono</dt><dd>{dash(c.phone)}</dd>
                <dt>Correo</dt><dd>{dash(c.email)}</dd>
                <dt>Ciudad</dt><dd>{dash(c.city)}</dd>
                <dt>Origen</dt><dd>{c.source ? SOURCE[c.source] ?? c.source : "—"}</dd>
              </dl>
            </div>
          </Panel>

          <Panel title="Representantes">
            <ul className="list">
              {reps.data?.map((r) => (
                <li key={r.id}>
                  <div className="avatar">{initials(r.name)}</div>
                  <div className="grow">
                    <div className="t">{r.name} {r.is_primary && <Badge tone="info">Principal</Badge>}</div>
                    <div className="s">{[r.job_title, r.phone].filter(Boolean).join(" · ") || "—"}</div>
                  </div>
                </li>
              ))}
              {!reps.data?.length && <li className="empty" style={{ width: "100%" }}>Sin representantes</li>}
            </ul>
          </Panel>

          <Panel title="Relación con el cliente" action={canAssign ? <FollowUpSelect clientId={id} current={c.follow_up_admin_id ?? null} admins={adminList.map(({ id: aid, name }) => ({ id: aid, name }))} /> : undefined}>
            <div className="panel-body">
              <dl className="facts">
                <dt>Seguimiento a cargo de</dt><dd>{followUpAdmin?.name ?? "Sin asignar"}</dd>
                <dt>Seguimientos</dt><dd><strong>{s.total_follow_ups}</strong> en total · {s.follow_ups_last_30_days} en los últimos 30 días</dd>
                <dt>Último contacto</dt>
                <dd>
                  {s.last_contact_at ? dateShort(s.last_contact_at) : "Nunca"}
                  {s.days_since_contact != null && <span className={s.days_since_contact >= 14 ? "late" : "muted"}> · hace {s.days_since_contact} días</span>}
                </dd>
                <dt>Próxima cita</dt><dd>{s.next_appointment_at ? `${dateShort(s.next_appointment_at)}, ${timeShort(s.next_appointment_at)}` : "—"}</dd>
                <dt>Saldo pendiente</dt>
                <dd className={s.overdue_installments > 0 ? "late" : ""}>
                  {Number(s.pending_balance) > 0 ? money(s.pending_balance) : "—"}
                  {s.overdue_installments > 0 && ` · ${s.overdue_installments} cuota${s.overdue_installments === 1 ? "" : "s"} vencida${s.overdue_installments === 1 ? "" : "s"}`}
                </dd>
              </dl>
            </div>
          </Panel>

          <Panel title="Diagnósticos" action={<Link href={`/diagnosticos/nuevo?cliente=${id}`} className={btn("small")}>Agregar</Link>}>
            {dg.length ? (
              <ul className="list">
                {dg.map((g) => (
                  <li key={g.id}>
                    <div className="grow">
                      <div className="t"><Link href={`/diagnosticos/${g.id}`}>{g.analyzed_url}</Link></div>
                      <div className="s">Solicitado {dateShort(g.requested_date)}{g.overall_score != null ? ` · puntaje ${g.overall_score}` : ""}</div>
                    </div>
                    <StatusBadge map={DIAGNOSTIC_STATUS} value={g.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="Sin diagnósticos" text="Aún no se le hizo un diagnóstico gratuito." />
            )}
          </Panel>
        </div>
      )}

      {tab === "marca" && (
        <div className="cols">
          <Panel title="Sobre la empresa" action={<Link href={`/clientes/${id}/editar`} className={btn("small")}>Editar</Link>}>
            <div className="panel-body">
              <dl className="facts">
                <dt>Rubro</dt><dd>{dash(d?.industry)}</dd>
                <dt>Web actual</dt>
                <dd>{d?.current_website && isHttpUrl(d.current_website) ? <a href={d.current_website} target="_blank" rel="noreferrer">{d.current_website}</a> : "—"}</dd>
                <dt>Carpeta de Drive</dt>
                <dd>{d?.drive_folder_url && isHttpUrl(d.drive_folder_url) ? <a href={d.drive_folder_url} target="_blank" rel="noreferrer">Abrir carpeta</a> : "—"}</dd>
                <dt>Descripción</dt><dd>{dash(d?.description)}</dd>
              </dl>
            </div>
          </Panel>
          <div className="stack">
            <Panel title="Identidad visual">
              <div className="panel-body">
                {colors.length ? (
                  <div className="swatches">
                    {colors.map((col, i) => (
                      <div key={i} className="swatch"><i style={{ background: col.hex }} /><span>{col.name} <span className="mono muted">{col.hex}</span></span></div>
                    ))}
                  </div>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>Aún no se registraron colores de marca.</p>
                )}
              </div>
            </Panel>
            <Panel title="Redes sociales">
              <div className="panel-body">
                {Object.keys(social).length ? (
                  <dl className="facts">
                    {Object.entries(social).map(([k, v]) => (
                      <div key={k} style={{ display: "contents" }}>
                        <dt className="capitalize">{k}</dt>
                        <dd><a href={v} target="_blank" rel="noreferrer">{v}</a></dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>Sin redes registradas.</p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === "proyectos" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <Link href={`/clientes/${id}/proyectos/nuevo`} className={btn("cta")}><Plus /> Nuevo proyecto</Link>
          </div>
          {projs.length === 0 && (
            <Panel><Empty title="Aún no hay proyectos" text="Crea el primero. El plan de pago puedes definirlo ahora o después, cuando acuerden el precio: las cuotas se generan solas." /></Panel>
          )}
          {projs.map((p) => (
            <section key={p.id} className="panel" style={{ marginBottom: 18 }}>
              <div className="panel-head">
                <h2>{p.title}</h2>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge tone="info">{PROJECT_STATUS[p.status] ?? p.status}</Badge>
                  <Link href={`/clientes/${id}/proyectos/${p.id}/editar`} className={btn("small")}>Editar</Link>
                </span>
              </div>
              <div className="panel-body">
                <dl className="facts">
                  <dt>Servicios pedidos</dt>
                  <dd>{p.services?.length ? p.services.join(", ") : p.legacy_service?.name ?? "—"}</dd>
                  <dt>Descripción</dt><dd>{dash(p.description)}</dd>
                  <dt>Inicio</dt><dd>{p.start_date ? dateShort(p.start_date) : "—"}</dd>
                  <dt>Entrega estimada</dt><dd>{p.estimated_delivery_date ? dateShort(p.estimated_delivery_date) : "—"}</dd>
                  <dt>Monto acordado</dt><dd className="mono">{Number(p.total_amount) > 0 ? money(p.total_amount, p.currency) : p.payments ? "Gratis" : "Por definir"}</dd>
                </dl>
              </div>
            </section>
          ))}
        </>
      )}

      {tab === "pagos" && (
        <>
          {projs.length === 0 && (
            <Panel><Empty title="Aún no hay proyectos" text="Los pagos se registran sobre las cuotas de un proyecto." href={`/clientes/${id}/proyectos/nuevo`} action="Nuevo proyecto" /></Panel>
          )}
          {projs.map((p) => {
            const inst = [...(p.payments?.installments ?? [])].sort((a, b) => a.number - b.number);
            const active = inst.filter((i) => i.status !== "anulada");
            const paid = active.filter((i) => i.status === "pagada");
            const overdue = active.some((i) => i.status === "pendiente" && i.due_date < today);
            const paymentState = !p.payments ? "sin_plan" : paid.length === active.length ? "pagado" : overdue ? "con_atraso" : "al_dia";
            const paidAmount = paid.reduce((t, i) => t + Number(i.amount), 0);
            const pct = Number(p.total_amount) ? Math.round((paidAmount / Number(p.total_amount)) * 100) : 0;
            return (
              <section key={p.id} className="panel" style={{ marginBottom: 18 }}>
                <div className="panel-head">
                  <div>
                    <h2>{p.title}</h2>
                    <div className="cell-sub">{p.payments ? MODALITY[p.payments.modality] ?? p.payments.modality : "Sin plan de pago"}</div>
                  </div>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge map={PAYMENT_STATUS} value={paymentState} />
                    <Link href={`/clientes/${id}/proyectos/${p.id}/editar`} className={btn("small")}>{p.payments ? "Editar plan" : "Definir plan"}</Link>
                  </span>
                </div>
                <div className="panel-body">
                  {p.payments && Number(p.total_amount) === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>Proyecto gratis: no hay nada que cobrar.</p>
                  ) : (
                    <div className="progress">
                      <span>{money(paidAmount, p.currency)} de {money(p.total_amount, p.currency)}</span>
                      <div className="bar ok"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
                      <strong>{pct}%</strong>
                    </div>
                  )}
                </div>
                {inst.length > 0 && (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Cuota</th><th className="num">Monto</th><th>Vence</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
                      <tbody>
                        {inst.map((i) => {
                          const isPaid = i.status === "pagada";
                          return (
                            <tr key={i.id}>
                              <td>{i.concept ?? `Cuota ${i.number}`}</td>
                              <td className="num mono">{money(i.amount, p.currency)}</td>
                              <td className={i.status === "pendiente" && i.due_date < today ? "late" : ""}>{dateShort(i.due_date)}</td>
                              <td>
                                {isPaid ? <Badge tone="ok">Pagada {dateShort(i.paid_date)}</Badge>
                                  : i.status === "anulada" ? <Badge>Anulada</Badge>
                                  : i.due_date < today ? <Badge tone="bad">Vencida</Badge> : <Badge tone="info">Pendiente</Badge>}
                                {isPaid && i.payment_method && (
                                  <div className="cell-sub capitalize">
                                    {i.payment_method}
                                    {i.operation_number && <> · <span className="mono">{i.operation_number}</span></>}
                                  </div>
                                )}
                              </td>
                              <td>
                                {i.status !== "anulada" && (
                                  <div className="row-actions">
                                    <PaymentDialog
                                      today={today}
                                      label={isPaid ? "Editar" : "Registrar pago"}
                                      primary={!isPaid}
                                      row={{ id: i.id, concept: i.concept, amount: Number(i.amount), due_date: i.due_date, paid_date: i.paid_date, payment_method: i.payment_method, operation_number: i.operation_number }}
                                    />
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {tab === "seguimientos" && (
        <Panel title={`${fu.length} seguimiento${fu.length === 1 ? "" : "s"} realizado${fu.length === 1 ? "" : "s"}`}>
          {fu.length ? (
            <ul className="timeline">
              {fu.map((f) => (
                <li key={f.id}>
                  <div className="ticon"><MessageSquare /></div>
                  <div>
                    <div className="head">
                      <strong>{CHANNEL[f.channel] ?? f.channel}</strong>
                      <Badge tone="info">{REASON[f.reason] ?? f.reason}</Badge>
                      <Badge>{OUTCOME[f.outcome] ?? f.outcome}</Badge>
                      <span className="muted mono">{dateTime(f.contacted_at)}</span>
                    </div>
                    {f.comment && <p>{f.comment}</p>}
                    {f.next_action && (
                      <div className={`next ${f.next_action_done ? "done" : ""}`}>
                        {f.next_action_done ? "Hecho" : "Próxima acción"}: {f.next_action} · {dateShort(f.next_action_date)}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Aún no hay seguimientos" text="Cada contacto con el cliente queda registrado aquí. Al marcar una cita como realizada, se crea sola." />
          )}
        </Panel>
      )}

      {tab === "citas" && (
        <Panel title="Citas" action={<Link href={`/agenda/nueva?cliente=${id}`} className={btn("primary", "small")}><Plus /> Agregar cita</Link>}>
          {ap.length ? (
            <ul className="list">
              {ap.map((a) => (
                <li key={a.id}>
                  <div className="time" style={{ minWidth: 110 }}>
                    {dateShort(a.start_at)}
                    <div className="mono muted" style={{ fontSize: 12.5 }}>{timeShort(a.start_at)}</div>
                  </div>
                  <div className="grow">
                    <div className="t"><Link href={`/agenda/${a.id}`}>{a.title}</Link></div>
                    <div className="s">{MODALITY[a.modality] ?? a.modality}{a.location_or_link ? ` · ${a.location_or_link}` : ""}</div>
                  </div>
                  <StatusBadge map={APPOINTMENT_STATUS} value={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="Sin citas" text="Agenda una reunión con este cliente." />
          )}
        </Panel>
      )}
    </>
  );
}
