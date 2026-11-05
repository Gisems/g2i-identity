import Link from "next/link";
import { Plus, Search } from "lucide-react";

/** Clases de botón del diseño del portal: btn("cta"), btn("primary", "small")… */
export const btn = (...mods: string[]) => ["btn", ...mods].join(" ");

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge ${tone === "neutral" ? "" : tone}`}>{children}</span>;
}

/* Etiqueta y color de cada estado, para que se vean igual en todas las vistas. */
type Map = Record<string, { label: string; tone: Tone }>;

export const CLIENT_STATUS: Map = {
  prospecto: { label: "Prospecto", tone: "warn" },
  activo: { label: "Activo", tone: "ok" },
  inactivo: { label: "Inactivo", tone: "neutral" },
  perdido: { label: "Perdido", tone: "bad" },
};
export const APPOINTMENT_STATUS: Map = {
  agendada: { label: "Agendada", tone: "info" },
  confirmada: { label: "Confirmada", tone: "ok" },
  realizada: { label: "Realizada", tone: "neutral" },
  cancelada: { label: "Cancelada", tone: "bad" },
  reprogramada: { label: "Reprogramada", tone: "warn" },
  no_asistio: { label: "No asistió", tone: "bad" },
};
export const DIAGNOSTIC_STATUS: Map = {
  solicitado: { label: "Solicitado", tone: "neutral" },
  en_analisis: { label: "En análisis", tone: "info" },
  entregado: { label: "Entregado", tone: "warn" },
  convertido: { label: "Convertido", tone: "ok" },
  descartado: { label: "Descartado", tone: "bad" },
};
export const PAYMENT_STATUS: Map = {
  con_atraso: { label: "Con atraso", tone: "bad" },
  pagado: { label: "Pagado", tone: "ok" },
  al_dia: { label: "Al día", tone: "info" },
  sin_plan: { label: "Sin plan", tone: "neutral" },
};
export const MODALITY: Record<string, string> = {
  presencial: "Presencial",
  videollamada: "Videollamada",
  llamada: "Llamada",
  contado: "Contado",
  adelanto_saldo: "Adelanto y saldo",
  cuotas: "En cuotas",
  recurrente: "Recurrente",
};

export function StatusBadge({ map, value }: { map: Map; value: string }) {
  const s = map[value] ?? { label: value, tone: "neutral" as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Topbar({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Stats({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="stats">
      {items.map(([v, l, alert]) => (
        <div key={l} className={`stat ${alert ? "alert" : ""}`}>
          <div className="v">{v}</div>
          <div className="l">{l}</div>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className ?? ""}`}>
      {title && (
        <div className="panel-head">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, text, href, action }: { title: string; text?: string; href?: string; action?: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {text}
      {href && action && (
        <div>
          <Link href={href} className={btn("cta")}>
            <Plus /> {action}
          </Link>
        </div>
      )}
    </div>
  );
}

export function Chips({ items, current, href }: { items: [string, string, number?][]; current: string; href: (key: string) => string }) {
  return (
    <div className="chips" role="group">
      {items.map(([k, l, n]) => (
        <Link key={k} href={href(k)} className="chip" aria-pressed={current === k}>
          {l}
          {n != null && <span className="n">{n}</span>}
        </Link>
      ))}
    </div>
  );
}

export function SearchBox({ action, hidden, q, placeholder, label }: { action: string; hidden: Record<string, string>; q: string; placeholder: string; label: string }) {
  return (
    <form action={action} className="search">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Search aria-hidden="true" />
      <input name="q" type="search" defaultValue={q} placeholder={placeholder} aria-label={label} />
    </form>
  );
}
