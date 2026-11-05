import Link from "next/link";
import { Plus } from "lucide-react";
import { CLIENT_STATUS, Chips, Empty, Panel, SearchBox, StatusBadge, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { dateShort, money } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  ruc: string | null;
  status: string;
  phone: string | null;
  primary_representative: string | null;
  total_follow_ups: number;
  last_contact_at: string | null;
  days_since_contact: number | null;
  next_appointment_at: string | null;
  pending_balance: number;
  overdue_installments: number;
};

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const filter = typeof sp.f === "string" ? sp.f : "todos";

  const supabase = await createClient();
  const { data, error } = await supabase.from("client_summary").select("*").order("name");
  const all = (data ?? []) as Row[];

  // Es una base chica: se filtra en memoria para poder mostrar el conteo de cada filtro.
  const cold = (c: Row) => c.days_since_contact == null || c.days_since_contact >= 14;
  const count = (fn: (c: Row) => boolean) => all.filter(fn).length;
  const chips: [string, string, number][] = [
    ["todos", "Todos", all.length],
    ["activo", "Activos", count((c) => c.status === "activo")],
    ["prospecto", "Prospectos", count((c) => c.status === "prospecto")],
    ["inactivo", "Inactivos", count((c) => c.status === "inactivo")],
    ["saldo", "Con saldo pendiente", count((c) => Number(c.pending_balance) > 0)],
    ["sin-contacto", "Sin contacto hace 14+ días", count(cold)],
  ];

  const needle = q.toLowerCase();
  const rows = all.filter((c) => {
    const okFilter =
      filter === "todos" ||
      filter === c.status ||
      (filter === "saldo" && Number(c.pending_balance) > 0) ||
      (filter === "sin-contacto" && cold(c));
    const okSearch = !needle || [c.name, c.ruc, c.primary_representative].join(" ").toLowerCase().includes(needle);
    return okFilter && okSearch;
  });

  const href = (f: string) => `/clientes?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <Topbar
        title="Clientes"
        sub={`${all.length} registrado${all.length === 1 ? "" : "s"}`}
        actions={<Link href="/clientes/nuevo" className={btn("cta")}><Plus /> Nuevo cliente</Link>}
      />

      {error && <div className="form-error" role="alert">No se pudieron cargar los clientes: {error.message}</div>}

      <Panel>
        <div className="filters">
          <SearchBox action="/clientes" hidden={{ f: filter }} q={q} placeholder="Buscar por nombre, RUC o representante" label="Buscar clientes" />
          <Chips items={chips} current={filter} href={href} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Representante</th>
                <th>Estado</th>
                <th className="num">Seguimientos</th>
                <th>Último contacto</th>
                <th>Próxima cita</th>
                <th className="num">Saldo pendiente</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="clickable">
                  <td>
                    <div className="cell-main"><Link href={`/clientes/${c.id}`}>{c.name}</Link></div>
                    <div className="cell-sub mono">{c.ruc ?? "Sin RUC"}</div>
                  </td>
                  <td>
                    {c.primary_representative ?? "—"}
                    {c.phone && <div className="cell-sub">{c.phone}</div>}
                  </td>
                  <td><StatusBadge map={CLIENT_STATUS} value={c.status} /></td>
                  <td className="num"><strong>{c.total_follow_ups}</strong></td>
                  <td>
                    {c.last_contact_at ? (
                      <>
                        {dateShort(c.last_contact_at)}
                        <div className={`cell-sub ${(c.days_since_contact ?? 0) >= 14 ? "late" : ""}`}>
                          {c.days_since_contact === 0 ? "hoy" : `hace ${c.days_since_contact} días`}
                        </div>
                      </>
                    ) : (
                      <span className="muted">Nunca</span>
                    )}
                  </td>
                  <td>{c.next_appointment_at ? dateShort(c.next_appointment_at) : <span className="muted">—</span>}</td>
                  <td className={`num ${c.overdue_installments > 0 ? "late" : ""}`}>
                    {Number(c.pending_balance) > 0 ? money(c.pending_balance) : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <Empty
              title={all.length === 0 ? "Aún no hay clientes" : "No hay clientes con ese criterio"}
              text={all.length === 0 ? "Registra al primero para empezar a dar seguimiento." : "Prueba con otra búsqueda o quita el filtro."}
              href={all.length === 0 ? "/clientes/nuevo" : undefined}
              action={all.length === 0 ? "Nuevo cliente" : undefined}
            />
          )}
        </div>
      </Panel>
    </>
  );
}
