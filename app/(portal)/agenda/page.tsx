import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { APPOINTMENT_STATUS, MODALITY, Panel, StatusBadge, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { addDays, dateShort, isoToLimaLocal, timeShort, todayLima } from "@/lib/format";
import { markDoneAction } from "./actions";

type Row = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  modality: string;
  location_or_link: string | null;
  status: string;
  clients: { id: string; name: string };
};

const LIMA = "America/Lima";
const H0 = 8; // la semana se dibuja de 8:00 a 20:00
const H1 = 20;
const PX = 54; // alto de una hora en la cuadrícula

const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: LIMA }).format(new Date(iso));
const longDay = (iso: string) => new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: LIMA }).format(new Date(iso));
/** Formatea una fecha YYYY-MM-DD sin que la zona horaria la mueva de día. */
const fmtDate = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-PE", { ...o, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
/** Lunes de la semana de una fecha YYYY-MM-DD. */
const mondayOf = (d: string) => addDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));
/** Hora local de Lima como decimal: "15:30" → 15.5 */
const hourOf = (iso: string) => {
  const [h, m] = isoToLimaLocal(iso).slice(11).split(":").map(Number);
  return h + m / 60;
};

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const sp = await searchParams;
  const mode = sp.v === "lista" ? "lista" : "semana";
  const today = todayLima();
  const wParam = typeof sp.w === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.w) ? sp.w : today;
  const weekStart = mondayOf(wParam);
  const weekEnd = addDays(weekStart, 6);

  const dayStart = new Date(`${today}T00:00:00-05:00`); // Lima es UTC-5 todo el año
  const tomorrow = new Date(dayStart.getTime() + 86_400_000);

  const supabase = await createClient();
  const select = "id, title, start_at, end_at, modality, location_or_link, status, clients!inner(id, name)";

  let query = supabase.from("appointments").select(select).order("start_at");
  if (mode === "semana") {
    query = query
      .gte("start_at", new Date(`${weekStart}T00:00:00-05:00`).toISOString())
      .lt("start_at", new Date(`${addDays(weekEnd, 1)}T00:00:00-05:00`).toISOString());
  }

  const [list, upcomingRes] = await Promise.all([
    query,
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("start_at", dayStart.toISOString())
      .in("status", ["agendada", "confirmada"]),
  ]);

  const rows = (list.data ?? []) as unknown as Row[];
  const upcomingCount = upcomingRes.count ?? 0;
  const error = list.error ?? upcomingRes.error;

  /* ---------- Barra de la vista ---------- */
  const sameMonth = weekStart.slice(0, 7) === weekEnd.slice(0, 7);
  const range = sameMonth
    ? `${Number(weekStart.slice(8))}–${Number(weekEnd.slice(8))} de ${fmtDate(weekEnd, { month: "long" })}`
    : `${fmtDate(weekStart, { day: "numeric", month: "short" })} – ${fmtDate(weekEnd, { day: "numeric", month: "short" })}`;
  const weekHref = (start: string) => `/agenda?v=semana&w=${start}`;

  const bar = (
    <div className="agenda-bar">
      <div className="seg" role="group" aria-label="Vista">
        <Link href={weekHref(weekStart)} aria-pressed={mode === "semana"}>Semana</Link>
        <Link href="/agenda?v=lista" aria-pressed={mode === "lista"}>Lista</Link>
      </div>
      {mode === "semana" && (
        <>
          <Link href={weekHref(addDays(weekStart, -7))} className={btn("small")} aria-label="Semana anterior"><ChevronLeft size={14} /></Link>
          <Link href={weekHref(mondayOf(today))} className={btn("small")}>Hoy</Link>
          <Link href={weekHref(addDays(weekStart, 7))} className={btn("small")} aria-label="Semana siguiente"><ChevronRight size={14} /></Link>
          <span className="range">{range}</span>
        </>
      )}
      <div className="right">
        <Link href="/agenda/nueva" className={btn("cta")}><Plus /> Agregar cita</Link>
      </div>
    </div>
  );

  /* ---------- Semana: la cuadrícula se dibuja siempre, haya citas o no ---------- */
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDayWeek = new Map<string, Row[]>();
  for (const r of rows) {
    const k = isoToLimaLocal(r.start_at).slice(0, 10);
    byDayWeek.set(k, [...(byDayWeek.get(k) ?? []), r]);
  }

  const week = (
    <section className="panel week">
      <div className="week-inner">
        <div className="week-head">
          <div />
          {days.map((d) => (
            <div key={d} className={`wh ${d === today ? "is-today" : ""}`}>
              {fmtDate(d, { weekday: "short" }).replace(".", "")}
              <br />
              <span className="dn">{Number(d.slice(8))}</span>
            </div>
          ))}
        </div>
        <div className="week-body">
          <div className="hours">
            {Array.from({ length: H1 - H0 }, (_, i) => <div key={i}>{String(H0 + i).padStart(2, "0")}:00</div>)}
          </div>
          {days.map((d) => {
            const evs = [...(byDayWeek.get(d) ?? [])].sort((a, b) => a.start_at.localeCompare(b.start_at));
            // Las citas que se superponen se reparten en carriles.
            const lanes: number[] = [];
            const placed = evs.map((a) => {
              const sh = hourOf(a.start_at);
              const eh = a.end_at && isoToLimaLocal(a.end_at).slice(0, 10) === d ? hourOf(a.end_at) : sh + 1;
              let lane = lanes.findIndex((end) => end <= sh);
              if (lane < 0) { lane = lanes.length; lanes.push(0); }
              lanes[lane] = eh;
              return { a, sh, eh, lane };
            });
            return (
              <div key={d} className={`daycol ${d === today ? "is-today" : ""}`} style={{ height: (H1 - H0) * PX }}>
                {placed.map(({ a, sh, eh, lane }) => {
                  const top = Math.max(0, (sh - H0) * PX);
                  const h = Math.max(30, (Math.min(eh, H1) - Math.max(sh, H0)) * PX - 2);
                  const n = lanes.length;
                  return (
                    <Link
                      key={a.id}
                      href={`/agenda/${a.id}`}
                      className={`ev ${a.status}`}
                      style={{ top, height: h, left: `calc(${(lane / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}
                      title={`${a.title} · ${a.clients.name}`}
                    >
                      <b>{timeShort(a.start_at)}</b>
                      {a.title}
                      <small>{a.clients.name}</small>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  /* ---------- Lista: próximas por día y anteriores ---------- */
  const item = (a: Row, withDate = false) => {
    const open = (a.status === "agendada" || a.status === "confirmada") && new Date(a.start_at) < tomorrow;
    return (
      <li key={a.id} className="link">
        <div className="time">{withDate ? dateShort(a.start_at) : timeShort(a.start_at)}</div>
        <div className="grow">
          <div className="t"><Link href={`/agenda/${a.id}`}>{a.title}</Link></div>
          <div className="s">
            <Link href={`/clientes/${a.clients.id}`}>{a.clients.name}</Link> · {MODALITY[a.modality] ?? a.modality}
            {a.location_or_link ? ` · ${a.location_or_link}` : ""}
          </div>
        </div>
        <StatusBadge map={APPOINTMENT_STATUS} value={a.status} />
        {open && (
          <form action={markDoneAction.bind(null, a.id)}>
            <button type="submit" className={btn("small")}>Marcar realizada</button>
          </form>
        )}
      </li>
    );
  };

  const upcoming = mode === "lista" ? rows.filter((a) => new Date(a.start_at) >= dayStart) : [];
  const past = mode === "lista" ? rows.filter((a) => new Date(a.start_at) < dayStart).reverse() : [];
  const byDay = new Map<string, Row[]>();
  for (const a of upcoming) {
    const k = dayKey(a.start_at);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }

  const listView = (
    <>
      {byDay.size === 0 ? (
        <div className="panel empty">
          <strong>No hay citas próximas</strong>
          Agenda la próxima reunión.
        </div>
      ) : (
        [...byDay].map(([k, items]) => (
          <div key={k} className="day">
            <h3 className={k === today ? "is-today" : ""}>{k === today ? "Hoy · " : ""}{longDay(items[0].start_at)}</h3>
            <Panel><ul className="list">{items.map((a) => item(a))}</ul></Panel>
          </div>
        ))
      )}
      {past.length > 0 && (
        <div className="day">
          <h3>Anteriores</h3>
          <Panel><ul className="list">{past.map((a) => item(a, true))}</ul></Panel>
        </div>
      )}
    </>
  );

  return (
    <>
      <Topbar title="Agenda" sub={`${upcomingCount} cita${upcomingCount === 1 ? "" : "s"} próxima${upcomingCount === 1 ? "" : "s"}`} />
      {bar}
      {error && <div className="form-error" role="alert">No se pudo cargar la agenda: {error.message}</div>}
      {mode === "semana" ? week : listView}
    </>
  );
}
