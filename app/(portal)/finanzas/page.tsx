import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Empty, Panel, Stats, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { addDays, dateShort, money, todayLima } from "@/lib/format";
import { adminId } from "@/lib/team";
import FinanceNav from "./FinanceNav";

type Income = {
  id: string;
  concept: string | null;
  amount: number;
  paid_date: string;
  payment_method: string | null;
  payments: { projects: { title: string; currency: string; clients: { id: string; name: string } } };
};
type Pending = { amount: number; due_date: string; payments: { projects: { currency: string } } };
type Expense = {
  id: string;
  concept: string;
  category: string;
  amount: number;
  currency: string;
  expense_date: string;
  platform: string | null;
  expires_on: string | null;
  payer: { name: string } | null;
};
const EXP_SELECT = "id, concept, category, amount, currency, expense_date, platform, expires_on, payer:users!paid_by(name)";

const monthLabel = (m: string) =>
  new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`));
const shiftMonth = (m: string, n: number) => {
  const d = new Date(`${m}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const round = (n: number) => Math.round(n * 100) / 100;

/** Suma por moneda. */
function sumBy<T>(rows: T[], cur: (r: T) => string, amt: (r: T) => number) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(cur(r), round((m.get(cur(r)) ?? 0) + Number(amt(r))));
  return m;
}

export default async function FinanzasPage({ searchParams }: PageProps<"/finanzas">) {
  const sp = await searchParams;
  const today = todayLima();
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const start = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;

  const supabase = await createClient();
  const admin = !!(await adminId());
  const [paidRes, pendRes, expRes, renewRes, payrollRes] = await Promise.all([
    supabase
      .from("installments")
      .select("id, concept, amount, paid_date, payment_method, payments!inner(projects!inner(title, currency, clients!inner(id, name)))")
      .eq("status", "pagada")
      .gte("paid_date", start)
      .lt("paid_date", next)
      .neq("payments.projects.clients.status", "inactivo")
      .order("paid_date", { ascending: false }),
    supabase
      .from("installments")
      .select("amount, due_date, payments!inner(projects!inner(currency, clients!inner(status)))")
      .eq("status", "pendiente")
      .neq("payments.projects.clients.status", "inactivo"),
    supabase.from("expenses").select(EXP_SELECT).gte("expense_date", start).lt("expense_date", next).order("expense_date", { ascending: false }),
    // Renovaciones: lo vencido en el último año y lo que vence en los próximos 60 días, sea cual sea el mes que se mira.
    supabase.from("expenses").select(EXP_SELECT).not("expires_on", "is", null).lte("expires_on", addDays(today, 60)).gte("expires_on", addDays(today, -365)).order("expires_on"),
    // Los sueldos solo los puede leer un admin (RLS); para los demás vienen vacíos y no se muestran.
    admin ? supabase.from("payroll_payments").select("amount, currency").eq("period", start) : Promise.resolve({ data: [] as unknown[], error: null as { message: string } | null }),
  ]);

  const income = (paidRes.data ?? []) as unknown as Income[];
  const pending = (pendRes.data ?? []) as unknown as Pending[];
  const expenses = (expRes.data ?? []) as unknown as Expense[];
  const renewals = (renewRes.data ?? []) as unknown as Expense[];
  const payroll = (payrollRes.data ?? []) as unknown as { amount: number; currency: string }[];
  const error = paidRes.error ?? pendRes.error ?? expRes.error ?? renewRes.error ?? payrollRes.error;

  const collected = sumBy(income, (r) => r.payments.projects.currency, (r) => r.amount);
  const spent = sumBy(expenses, (r) => r.currency, (r) => r.amount);
  const wages = sumBy(payroll, (r) => r.currency, (r) => r.amount);
  const toCollect = sumBy(pending, (r) => r.payments.projects.currency, (r) => r.amount);
  const overdue = sumBy(pending.filter((r) => r.due_date < today), (r) => r.payments.projects.currency, (r) => r.amount);

  const currencies = ["PEN", ...["USD"].filter((c) => [collected, spent, toCollect, wages].some((m) => m.has(c)))];
  const NAMES: Record<string, string> = { PEN: "Soles (S/)", USD: "Dólares (US$)" };
  const href = (m: string) => `/finanzas?m=${m}`;

  return (
    <>
      <Topbar
        title="Finanzas"
        sub="Lo que cobramos de clientes frente a lo que gasta la empresa"
        actions={<Link href="/finanzas/gastos/nuevo" className={btn("cta")}><Plus /> Agregar gasto</Link>}
      />

      <FinanceNav current="resumen" admin={admin} />

      <div className="agenda-bar">
        <Link href={href(shiftMonth(month, -1))} className={btn("small")} aria-label="Mes anterior"><ChevronLeft size={14} /></Link>
        <Link href={href(today.slice(0, 7))} className={btn("small")}>Este mes</Link>
        <Link href={href(shiftMonth(month, 1))} className={btn("small")} aria-label="Mes siguiente"><ChevronRight size={14} /></Link>
        <span className="range" style={{ textTransform: "capitalize" }}>{monthLabel(month)}</span>
      </div>

      {error && <div className="form-error" role="alert">No se pudo cargar Finanzas: {error.message}</div>}

      {currencies.map((cur) => {
        const c = collected.get(cur) ?? 0;
        const g = spent.get(cur) ?? 0;
        const w = wages.get(cur) ?? 0;
        const balance = round(c - g - w);
        return (
          <div key={cur} style={{ marginBottom: 18 }}>
            {currencies.length > 1 && <h3 style={{ margin: "0 0 8px" }}>{NAMES[cur]}</h3>}
            <Stats
              items={[
                [money(c, cur), "Cobrado de clientes en el mes"],
                [money(g, cur), "Gastos del mes"],
                ...(admin ? ([[money(w, cur), "Sueldos del mes"]] as [string, string][]) : []),
                [money(balance, cur), "Balance del mes", balance < 0],
                [money(toCollect.get(cur) ?? 0, cur), "Por cobrar (total)"],
                [money(overdue.get(cur) ?? 0, cur), "Vencido", (overdue.get(cur) ?? 0) > 0],
              ]}
            />
          </div>
        );
      })}

      <Panel title="Cobros de clientes del mes">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Cliente</th><th>Proyecto / cuota</th><th>Método</th><th className="num">Monto</th></tr>
            </thead>
            <tbody>
              {income.map((r) => (
                <tr key={r.id}>
                  <td>{dateShort(r.paid_date)}</td>
                  <td><Link href={`/clientes/${r.payments.projects.clients.id}`}>{r.payments.projects.clients.name}</Link></td>
                  <td>{r.payments.projects.title}{r.concept ? ` · ${r.concept}` : ""}</td>
                  <td>{r.payment_method ?? "—"}</td>
                  <td className="num"><strong>{money(r.amount, r.payments.projects.currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          {income.length === 0 && <Empty title="Sin cobros de clientes este mes" text="Aquí aparecen las cuotas que se registran como pagadas en Pagos de clientes." />}
        </div>
      </Panel>

      <Panel title="Próximos vencimientos">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Vence</th><th>Motivo</th><th>Plataforma</th><th>Realizado por</th><th className="num">Monto</th></tr>
            </thead>
            <tbody>
              {renewals.map((e) => (
                <tr key={e.id} className="clickable">
                  <td className={e.expires_on! < today ? "late" : ""}>
                    {dateShort(e.expires_on!)}
                    <div className={`cell-sub ${e.expires_on! < today ? "late" : ""}`}>{e.expires_on! < today ? "vencido" : e.expires_on === today ? "hoy" : `en ${Math.round((Date.parse(e.expires_on!) - Date.parse(today)) / 86_400_000)} días`}</div>
                  </td>
                  <td><Link href={`/finanzas/gastos/${e.id}`}>{e.concept}</Link></td>
                  <td>{e.platform ?? "—"}</td>
                  <td>{e.payer?.name ?? "—"}</td>
                  <td className="num">{money(e.amount, e.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {renewals.length === 0 && <Empty title="Nada por vencer" text="Los gastos con fecha de vencimiento (dominios, hosting, licencias) aparecen aquí 60 días antes." />}
        </div>
      </Panel>

      <Panel title="Gastos del mes" action={<Link href="/finanzas/gastos/nuevo" className={btn("small")}><Plus /> Agregar gasto</Link>}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Motivo</th><th>Plataforma</th><th>Realizado por</th><th>Vence</th><th className="num">Monto</th></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="clickable">
                  <td>{dateShort(e.expense_date)}</td>
                  <td><Link href={`/finanzas/gastos/${e.id}`}>{e.concept}</Link></td>
                  <td>{e.platform ?? "—"}</td>
                  <td>{e.payer?.name ?? "—"}</td>
                  <td>{e.expires_on ? dateShort(e.expires_on) : "—"}</td>
                  <td className="num"><strong>{money(e.amount, e.currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <Empty title="Sin gastos este mes" text="Registra los gastos de la empresa para ver el balance." href="/finanzas/gastos/nuevo" action="Agregar gasto" />
          )}
        </div>
      </Panel>
    </>
  );
}
