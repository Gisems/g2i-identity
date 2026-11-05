import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Badge, Empty, Panel, Stats, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { dateShort, money } from "@/lib/format";
import { accountSummary, type Account } from "@/lib/account";
import { adminId } from "@/lib/team";
import FinanceNav from "../FinanceNav";

const KIND: Record<string, string> = { deposito: "Depósito", cobro: "Cobro de cliente", gasto: "Gasto", sueldo: "Pago a empleado" };

export default async function CuentaPage() {
  if (!(await adminId())) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("*").eq("active", true).order("created_at");
  const accounts = (data ?? []) as Account[];
  const summaries = await Promise.all(accounts.map((a) => accountSummary(supabase, a)));

  return (
    <>
      <Topbar
        title="Finanzas"
        sub="Cuenta de la empresa"
        actions={
          <>
            {accounts.length > 0 && <Link href="/finanzas/cuenta/depositos/nuevo" className={btn()}><Plus /> Agregar depósito</Link>}
            <Link href="/finanzas/cuenta/nueva" className={btn("cta")}><Plus /> Crear cuenta</Link>
          </>
        }
      />
      <FinanceNav current="cuenta" admin />
      {error && <div className="form-error" role="alert">No se pudieron cargar las cuentas: {error.message}</div>}

      {accounts.length === 0 && (
        <Panel>
          <Empty
            title="Aún no hay una cuenta"
            text="Crea la cuenta de la empresa con su saldo inicial para ver cuánto se va gastando."
            href="/finanzas/cuenta/nueva"
            action="Crear cuenta"
          />
        </Panel>
      )}

      {accounts.map((a, i) => {
        const { totals: t, movements, error: sErr } = summaries[i];
        return (
          <div key={a.id} style={{ marginBottom: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 8px" }}>
              <h2 style={{ margin: 0 }}>{a.name}</h2>
              <Badge>{a.currency}</Badge>
              <span className="muted" style={{ fontSize: 13 }}>desde {dateShort(a.opening_date)}</span>
              <Link href={`/finanzas/cuenta/${a.id}`} className={btn("small", "ghost")} aria-label={`Editar ${a.name}`}><Pencil size={14} /> Editar</Link>
            </div>
            {sErr && <div className="form-error" role="alert">No se pudo calcular el saldo: {sErr.message}</div>}
            <Stats
              items={[
                [money(t.balance, a.currency), "Saldo actual", t.balance < 0],
                [money(t.opening, a.currency), "Saldo inicial"],
                [money(t.deposits + t.collected, a.currency), "Ingresos (depósitos + cobros)"],
                [money(t.spent, a.currency), "Gastos"],
                [money(t.payroll, a.currency), "Pagos a empleados"],
              ]}
            />
            <Panel title="Movimientos">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th className="num">Monto</th></tr>
                  </thead>
                  <tbody>
                    {movements.slice(0, 100).map((m) => (
                      <tr key={m.key} className={m.href ? "clickable" : ""}>
                        <td>{dateShort(m.date)}</td>
                        <td>{KIND[m.kind]}</td>
                        <td>
                          {m.href ? <Link href={m.href}>{m.label}</Link> : m.label}
                          {m.sub && <div className="cell-sub">{m.sub}</div>}
                        </td>
                        <td className={`num ${m.amount < 0 ? "late" : ""}`}><strong>{m.amount < 0 ? "−" : "+"} {money(Math.abs(m.amount), a.currency)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {movements.length === 0 && (
                  <Empty title="Sin movimientos" text="Aquí aparecen los depósitos, cobros, gastos y sueldos pagados desde esta cuenta." />
                )}
              </div>
            </Panel>
          </div>
        );
      })}
    </>
  );
}
