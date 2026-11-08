import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Badge, Empty, Panel, Stats, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { dateShort, money, timeShort, todayLima } from "@/lib/format";
import { markFollowUpDoneAction } from "./actions";
import { fail } from "@/lib/errors";

type Money = { amount: number; currency: string };

/** Suma por moneda: "S/ 1,200.00 · US$ 300.00". */
function totals(items: Money[]) {
  const by = new Map<string, number>();
  for (const i of items) by.set(i.currency, (by.get(i.currency) ?? 0) + Number(i.amount));
  return by.size ? [...by].map(([cur, n]) => money(n, cur)).join(" · ") : money(0);
}

type FollowUp = { id: string; reason: string; next_action: string; next_action_date: string; clients: { id: string; name: string } };
type Appointment = { id: string; title: string; start_at: string; status: string; modality: string; location_or_link: string | null; clients: { id: string; name: string } };
type Installment = {
  id: string;
  concept: string | null;
  amount: number;
  due_date: string;
  payments: { projects: { title: string; currency: string; clients: { id: string; name: string } } };
};

const REASON: Record<string, string> = {
  venta: "Venta", post_diagnostico: "Post diagnóstico", propuesta: "Propuesta", cobranza: "Cobranza",
  soporte: "Soporte", post_entrega: "Post entrega", renovacion: "Renovación", otro: "Otro",
};

export default async function PanelPage() {
  const today = todayLima();
  const dayStart = new Date(`${today}T00:00:00-05:00`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [me, appts, follow, inst, funnel] = await Promise.all([
    supabase.from("users").select("name").eq("id", user?.id ?? "").maybeSingle(),
    supabase
      .from("appointments")
      .select("id, title, start_at, status, modality, location_or_link, clients!inner(id, name)")
      .gte("start_at", dayStart.toISOString())
      .lt("start_at", dayEnd.toISOString())
      .in("status", ["agendada", "confirmada"])
      .neq("clients.status", "inactivo")
      .order("start_at"),
    supabase
      .from("follow_ups")
      .select("id, reason, next_action, next_action_date, clients!inner(id, name)")
      .eq("next_action_done", false)
      .not("next_action", "is", null)
      .neq("clients.status", "inactivo")
      .order("next_action_date"),
    supabase
      .from("installments")
      .select("id, concept, amount, due_date, payments!inner(projects!inner(title, currency, clients!inner(id, name)))")
      .eq("status", "pendiente")
      .neq("payments.projects.clients.status", "inactivo")
      .order("due_date"),
    supabase
      .from("diagnostics")
      .select("status, converted_project_id, clients!inner(status)")
      .neq("clients.status", "inactivo"),
  ]);

  const appointments = (appts.data ?? []) as unknown as Appointment[];
  const followUps = (follow.data ?? []) as unknown as FollowUp[];
  const pending = ((inst.data ?? []) as unknown as Installment[]).map((i) => ({ ...i, currency: i.payments.projects.currency }));
  const overdue = pending.filter((i) => i.due_date < today);
  const dueToday = followUps.filter((s) => s.next_action_date <= today);
  const anyLate = followUps.some((s) => s.next_action_date < today);

  const diags = funnel.data ?? [];
  const f = {
    requested: diags.length,
    delivered: diags.filter((d) => d.status === "entregado" || d.status === "convertido").length,
    converted: diags.filter((d) => d.converted_project_id !== null).length,
  };
  const rate = f.requested ? Math.round((f.converted / f.requested) * 100) : 0;
  const funnelRows: [string, number][] = [["Solicitados", f.requested], ["Entregados", f.delivered], ["Convertidos", f.converted]];

  const first = (me.data?.name ?? "").split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Lima" }).format(new Date());
  const failed = [appts.error, follow.error, inst.error, funnel.error].find(Boolean);

  return (
    <>
      <Topbar
        title={`Buenos días${first ? `, ${first}` : ""}`}
        sub={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
        actions={
          <>
            <Link href="/agenda/nueva" className={btn()}><CalendarDays /> Agregar cita</Link>
            <Link href="/clientes/nuevo" className={btn("cta")}><Plus /> Nuevo cliente</Link>
          </>
        }
      />

      {failed && <div className="form-error" role="alert">{fail("Algunos datos no se pudieron cargar", failed)}</div>}

      <Stats
        items={[
          [String(appointments.length), "Citas hoy"],
          [String(dueToday.length), "Seguimientos para hoy o atrasados", anyLate],
          [totals(overdue), `${overdue.length} cuota${overdue.length === 1 ? "" : "s"} vencida${overdue.length === 1 ? "" : "s"}`, overdue.length > 0],
          [totals(pending), "Por cobrar en total"],
        ]}
      />

      <div className="today">
        <div className="stack">
          <Panel title="Citas de hoy" action={<Link href="/agenda" className={btn("ghost", "small")}>Ver agenda</Link>}>
            {appointments.length ? (
              <ul className="list">
                {appointments.map((a) => (
                  <li key={a.id}>
                    <div className="time">{timeShort(a.start_at)}</div>
                    <div className="grow">
                      <div className="t"><Link href={`/agenda/${a.id}`}>{a.title}</Link></div>
                      <div className="s"><Link href={`/clientes/${a.clients.id}`}>{a.clients.name}</Link> · <span className="capitalize">{a.modality}</span></div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No tienes citas hoy" text="Agenda una reunión con un cliente o prospecto." />
            )}
          </Panel>

          <Panel title="Próximas acciones de seguimiento">
            {followUps.length ? (
              <ul className="list">
                {followUps.map((s) => {
                  const late = s.next_action_date < today;
                  const isToday = s.next_action_date === today;
                  return (
                    <li key={s.id}>
                      <div className="grow">
                        <div className="t">{s.next_action}</div>
                        <div className="s"><Link href={`/clientes/${s.clients.id}`}>{s.clients.name}</Link> · {REASON[s.reason] ?? s.reason}</div>
                      </div>
                      <Badge tone={late ? "bad" : isToday ? "warn" : "info"}>
                        {late ? `Atrasado ${dateShort(s.next_action_date)}` : isToday ? "Hoy" : dateShort(s.next_action_date)}
                      </Badge>
                      <form action={markFollowUpDoneAction.bind(null, s.id)}>
                        <button type="submit" className={btn("small")}>Hecho</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Sin acciones pendientes" text="Al registrar un seguimiento puedes dejar la próxima acción." />
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Cuotas vencidas" action={<Link href="/pagos?f=vencidas" className={btn("ghost", "small")}>Ver pagos</Link>}>
            {overdue.length ? (
              <ul className="list">
                {overdue.slice(0, 6).map((i) => (
                  <li key={i.id}>
                    <div className="grow">
                      <div className="t">{i.payments.projects.clients.name}</div>
                      <div className="s">{i.payments.projects.title} · {i.concept ?? "Cuota"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="t">{money(i.amount, i.currency)}</div>
                      <div className="s late">venció {dateShort(i.due_date)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="Todo al día" text="No hay cuotas vencidas." />
            )}
          </Panel>

          <Panel title="Diagnósticos gratuitos" action={<Link href="/diagnosticos" className={btn("ghost", "small")}>Ver todos</Link>}>
            <div className="panel-body funnel">
              {funnelRows.map(([l, v]) => (
                <div key={l} className="funnel-row">
                  <span>{l}</span>
                  <div className="bar"><i style={{ width: `${(v / Math.max(1, funnelRows[0][1])) * 100}%` }} /></div>
                  <strong style={{ textAlign: "right" }}>{v}</strong>
                </div>
              ))}
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                {f.requested ? `Conversión: ${rate}% de los diagnósticos se vuelven proyecto` : "Aún no hay diagnósticos registrados."}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
