import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Chips, Empty, Panel, SearchBox, Stats, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { addDays, dateShort, money, todayLima } from "@/lib/format";
import PaymentDialog from "./PaymentDialog";

type Row = {
  id: string;
  concept: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_method: string | null;
  operation_number: string | null;
  status: string;
  payments: { projects: { id: string; title: string; currency: string; clients: { id: string; name: string } } };
};

/** Suma por moneda: "S/ 1,200.00 · US$ 300.00". */
function totals(rows: Row[]) {
  const by = new Map<string, number>();
  for (const r of rows) {
    const cur = r.payments.projects.currency;
    by.set(cur, (by.get(cur) ?? 0) + Number(r.amount));
  }
  return by.size ? [...by].map(([cur, n]) => money(n, cur)).join(" · ") : money(0);
}

export default async function PagosPage({ searchParams }: PageProps<"/pagos">) {
  const sp = await searchParams;
  const filter = typeof sp.f === "string" ? sp.f : "pendientes";
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const today = todayLima();
  const month = today.slice(0, 7);
  const in7 = addDays(today, 7);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installments")
    .select("id, concept, amount, due_date, paid_date, payment_method, operation_number, status, payments!inner(projects!inner(id, title, currency, clients!inner(id, name)))")
    .neq("status", "anulada")
    .neq("payments.projects.clients.status", "inactivo")
    .order("due_date");

  const all = (data ?? []) as unknown as Row[];
  const pending = all.filter((r) => r.status === "pendiente");
  const overdue = pending.filter((r) => r.due_date < today);
  const dueSoon = pending.filter((r) => r.due_date >= today && r.due_date <= in7);
  const paid = all.filter((r) => r.status === "pagada");
  const collected = paid.filter((r) => r.paid_date?.startsWith(month));

  const monthName = new Intl.DateTimeFormat("es-PE", { month: "long", timeZone: "America/Lima" }).format(new Date());

  const chips: [string, string, number][] = [
    ["pendientes", "Pendientes", pending.length],
    ["vencidas", "Vencidas", overdue.length],
    ["pagadas", "Pagadas", paid.length],
    ["todas", "Todas", all.length],
  ];

  let rows = all;
  if (filter === "pendientes") rows = pending;
  if (filter === "vencidas") rows = overdue;
  if (filter === "pagadas") rows = [...paid].reverse();
  const needle = q.toLowerCase();
  if (needle) {
    rows = rows.filter((r) => `${r.payments.projects.clients.name} ${r.payments.projects.title} ${r.concept ?? ""}`.toLowerCase().includes(needle));
  }

  const href = (f: string) => `/pagos?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <Topbar
        title="Pagos de clientes"
        sub="Lo que los clientes pagan por sus proyectos. Los gastos y sueldos de la empresa están en Finanzas."
        actions={<Link href="/pagos/nuevo" className={btn("cta")}><Plus /> Agregar pago</Link>}
      />

      <Stats
        items={[
          [totals(collected), `Cobrado en ${monthName}`],
          [totals(pending), `Por cobrar · ${pending.length} cuota${pending.length === 1 ? "" : "s"}`],
          [totals(overdue), `Vencido · ${overdue.length} cuota${overdue.length === 1 ? "" : "s"}`, overdue.length > 0],
          [totals(dueSoon), "Vence en los próximos 7 días"],
        ]}
      />

      {error && <div className="form-error" role="alert">No se pudieron cargar los pagos de clientes: {error.message}</div>}

      <Panel>
        <div className="filters">
          <SearchBox action="/pagos" hidden={{ f: filter }} q={q} placeholder="Buscar por cliente o proyecto" label="Buscar pagos" />
          <Chips items={chips} current={filter} href={href} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Proyecto</th>
                <th>Concepto</th>
                <th className="num">Monto</th>
                <th>Vence</th>
                <th>Estado</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = r.payments.projects;
                const isPaid = r.status === "pagada";
                const isOverdue = !isPaid && r.due_date < today;
                return (
                  <tr key={r.id} className="clickable">
                    <td className="cell-main"><Link href={`/clientes/${p.clients.id}`}>{p.clients.name}</Link></td>
                    <td>{p.title}</td>
                    <td>{r.concept ?? "—"}</td>
                    <td className="num mono">{money(r.amount, p.currency)}</td>
                    <td className={isOverdue ? "late" : ""}>{dateShort(r.due_date)}</td>
                    <td>
                      {isPaid ? <Badge tone="ok">Pagada {dateShort(r.paid_date)}</Badge> : isOverdue ? <Badge tone="bad">Vencida</Badge> : <Badge tone="info">Pendiente</Badge>}
                      {isPaid && r.payment_method && (
                        <div className="cell-sub capitalize">
                          {r.payment_method}
                          {r.operation_number && <> · <span className="mono">{r.operation_number}</span></>}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <PaymentDialog
                          today={today}
                          label={isPaid ? "Editar" : "Registrar pago"}
                          primary={!isPaid}
                          row={{
                            id: r.id,
                            concept: r.concept,
                            amount: Number(r.amount),
                            due_date: r.due_date,
                            paid_date: r.paid_date,
                            payment_method: r.payment_method,
                            operation_number: r.operation_number,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <Empty
              title={all.length === 0 ? "Aún no hay cuotas" : "No hay cuotas con ese criterio"}
              text={all.length === 0 ? "Las cuotas aparecen al crear un proyecto con su plan de pago desde la ficha de un cliente." : "Prueba con otro filtro o búsqueda."}
              href={all.length === 0 ? "/clientes" : undefined}
              action={all.length === 0 ? "Ir a clientes" : undefined}
            />
          )}
        </div>
      </Panel>
    </>
  );
}
