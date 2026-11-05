import type { SupabaseClient } from "@supabase/supabase-js";

export type Account = {
  id: string;
  name: string;
  currency: string;
  opening_balance: number;
  opening_date: string;
  receives_client_payments: boolean;
  active: boolean;
};

export type Movement = {
  key: string;
  date: string;
  kind: "deposito" | "cobro" | "gasto" | "sueldo";
  label: string;
  sub: string | null;
  amount: number; // con signo: + entra, − sale
  href: string | null;
};

const round = (n: number) => Math.round(n * 100) / 100;
const sum = (rows: { amount: number }[]) => round(rows.reduce((t, r) => t + Number(r.amount), 0));

const KIND: Record<string, string> = { sueldo: "Sueldo", bono: "Bono", adelanto: "Adelanto", otro: "Pago" };

/** Saldo = saldo inicial + depósitos + cobros de clientes − gastos − pagos a empleados, desde la fecha de inicio. */
export async function accountSummary(supabase: SupabaseClient, a: Account) {
  const since = a.opening_date;
  const none = Promise.resolve({ data: [] as unknown[], error: null as { message: string } | null });

  const [dep, col, exp, pay] = await Promise.all([
    supabase.from("account_deposits").select("id, amount, deposit_date, concept").eq("account_id", a.id).gte("deposit_date", since),
    a.receives_client_payments
      ? supabase
          .from("installments")
          .select("id, concept, amount, paid_date, payments!inner(projects!inner(title, currency, clients!inner(name, status)))")
          .eq("status", "pagada")
          .gte("paid_date", since)
          .eq("payments.projects.currency", a.currency)
          .neq("payments.projects.clients.status", "inactivo")
      : none,
    supabase.from("expenses").select("id, concept, platform, amount, expense_date").eq("account_id", a.id).gte("expense_date", since),
    supabase.from("payroll_payments").select("id, kind, amount, paid_date, employee:users!employee_id(name)").eq("account_id", a.id).gte("paid_date", since),
  ]);

  type Dep = { id: string; amount: number; deposit_date: string; concept: string | null };
  type Col = { id: string; concept: string | null; amount: number; paid_date: string; payments: { projects: { title: string; clients: { name: string } } } };
  type Exp = { id: string; concept: string; platform: string | null; amount: number; expense_date: string };
  type Pay = { id: string; kind: string; amount: number; paid_date: string; employee: { name: string } | null };

  const deposits = (dep.data ?? []) as unknown as Dep[];
  const collected = (col.data ?? []) as unknown as Col[];
  const expenses = (exp.data ?? []) as unknown as Exp[];
  const payroll = (pay.data ?? []) as unknown as Pay[];

  const totals = {
    opening: round(Number(a.opening_balance)),
    deposits: sum(deposits),
    collected: sum(collected),
    spent: sum(expenses),
    payroll: sum(payroll),
    balance: 0,
  };
  totals.balance = round(totals.opening + totals.deposits + totals.collected - totals.spent - totals.payroll);

  const movements: Movement[] = [
    ...deposits.map((d): Movement => ({ key: `d${d.id}`, date: d.deposit_date, kind: "deposito", label: d.concept || "Depósito", sub: null, amount: Number(d.amount), href: `/finanzas/cuenta/depositos/${d.id}` })),
    ...collected.map((c): Movement => ({ key: `c${c.id}`, date: c.paid_date, kind: "cobro", label: c.payments.projects.clients.name, sub: `${c.payments.projects.title}${c.concept ? ` · ${c.concept}` : ""}`, amount: Number(c.amount), href: null })),
    ...expenses.map((e): Movement => ({ key: `e${e.id}`, date: e.expense_date, kind: "gasto", label: e.concept, sub: e.platform, amount: -Number(e.amount), href: `/finanzas/gastos/${e.id}` })),
    ...payroll.map((p): Movement => ({ key: `p${p.id}`, date: p.paid_date, kind: "sueldo", label: `${KIND[p.kind] ?? "Pago"} · ${p.employee?.name ?? "—"}`, sub: null, amount: -Number(p.amount), href: `/finanzas/sueldos/${p.id}` })),
  ].sort((x, y) => y.date.localeCompare(x.date));

  const error = dep.error ?? col.error ?? exp.error ?? pay.error;
  return { totals, movements, error };
}

/** Si se eligió cuenta, la moneda del monto debe ser la de la cuenta. Devuelve el mensaje de error, o null. */
export async function checkAccountCurrency(supabase: SupabaseClient, accountId: string, currency: string) {
  if (!accountId) return null;
  const { data } = await supabase.from("accounts").select("currency, name").eq("id", accountId).maybeSingle();
  if (!data) return "La cuenta elegida no existe.";
  if (data.currency !== currency) return `La cuenta «${data.name}» es en ${data.currency}; usa esa moneda o elige otra cuenta.`;
  return null;
}
