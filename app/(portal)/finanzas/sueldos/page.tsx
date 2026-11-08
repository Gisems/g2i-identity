import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge, Empty, Panel, Stats, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { dateShort, money, todayLima } from "@/lib/format";
import { adminId } from "@/lib/team";
import FinanceNav from "../FinanceNav";
import { fail } from "@/lib/errors";

type Pay = {
  id: string;
  employee_id: string;
  kind: string;
  amount: number;
  currency: string;
  paid_date: string;
  employee: { name: string } | null;
  account: { name: string } | null;
};

const KIND: Record<string, string> = { sueldo: "Sueldo", bono: "Bono", adelanto: "Adelanto", otro: "Otro" };
const ROLE: Record<string, string> = { admin: "Administrador", ventas: "Ventas", dev: "Desarrollo", "diseño": "Diseño" };
const monthLabel = (m: string) =>
  new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`));
const shiftMonth = (m: string, n: number) => {
  const d = new Date(`${m}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const round = (n: number) => Math.round(n * 100) / 100;

export default async function SueldosPage({ searchParams }: PageProps<"/finanzas/sueldos">) {
  if (!(await adminId())) notFound();
  const sp = await searchParams;
  const today = todayLima();
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);

  const supabase = await createClient();
  const [empRes, payRes] = await Promise.all([
    supabase.from("users").select("id, name, role").eq("active", true).order("name"),
    supabase
      .from("payroll_payments")
      .select("id, employee_id, kind, amount, currency, paid_date, employee:users!employee_id(name), account:accounts!account_id(name)")
      .eq("period", `${month}-01`)
      .order("paid_date", { ascending: false }),
  ]);
  const employees = empRes.data ?? [];
  const payments = (payRes.data ?? []) as unknown as Pay[];
  const error = empRes.error ?? payRes.error;

  const byCur = new Map<string, number>();
  for (const p of payments) byCur.set(p.currency, round((byCur.get(p.currency) ?? 0) + Number(p.amount)));
  const paidSalary = new Set(payments.filter((p) => p.kind === "sueldo").map((p) => p.employee_id));
  const pending = employees.filter((e) => !paidSalary.has(e.id));
  const total = [...byCur].map(([c, n]) => money(n, c)).join(" · ") || money(0);
  const href = (m: string) => `/finanzas/sueldos?m=${m}`;

  return (
    <>
      <Topbar
        title="Finanzas"
        sub="Pagos a empleados"
        actions={<Link href={`/finanzas/sueldos/nuevo?m=${month}`} className={btn("cta")}><Plus /> Registrar pago</Link>}
      />
      <FinanceNav current="sueldos" admin />

      <div className="agenda-bar">
        <Link href={href(shiftMonth(month, -1))} className={btn("small")} aria-label="Mes anterior"><ChevronLeft size={14} /></Link>
        <Link href={href(today.slice(0, 7))} className={btn("small")}>Este mes</Link>
        <Link href={href(shiftMonth(month, 1))} className={btn("small")} aria-label="Mes siguiente"><ChevronRight size={14} /></Link>
        <span className="range" style={{ textTransform: "capitalize" }}>{monthLabel(month)}</span>
      </div>

      {error && <div className="form-error" role="alert">{fail("No se pudo cargar", error)}</div>}

      <Stats
        items={[
          [total, "Pagado en el mes"],
          [String(employees.length - pending.length), "Con sueldo pagado"],
          [String(pending.length), "Sueldo pendiente", pending.length > 0],
        ]}
      />

      <Panel title="Equipo">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Empleado</th><th>Rol</th><th>Sueldo del mes</th><th /></tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td>{ROLE[e.role] ?? e.role}</td>
                  <td>{paidSalary.has(e.id) ? <Badge tone="ok">Pagado</Badge> : <Badge tone="warn">Pendiente</Badge>}</td>
                  <td style={{ textAlign: "right" }}>
                    {!paidSalary.has(e.id) && (
                      <Link href={`/finanzas/sueldos/nuevo?empleado=${e.id}&m=${month}`} className={btn("small")}>Registrar pago</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && <Empty title="No hay empleados activos" text="Crea las cuentas del equipo en Colaboradores." />}
        </div>
      </Panel>

      <Panel title="Pagos del mes">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Empleado</th><th>Tipo</th><th>Cuenta</th><th className="num">Monto</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="clickable">
                  <td>{dateShort(p.paid_date)}</td>
                  <td><Link href={`/finanzas/sueldos/${p.id}`}>{p.employee?.name ?? "—"}</Link></td>
                  <td>{KIND[p.kind] ?? p.kind}</td>
                  <td>{p.account?.name ?? "—"}</td>
                  <td className="num"><strong>{money(p.amount, p.currency)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <Empty title="Sin pagos este mes" text="Registra el sueldo de cada empleado cuando lo pagues." />}
        </div>
      </Panel>
    </>
  );
}
