"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkAccountCurrency } from "@/lib/account";
import { adminId } from "@/lib/team";
import { fail } from "@/lib/errors";

export type FormState = { error?: string; ok?: boolean };

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const KINDS = ["sueldo", "bono", "adelanto", "otro"];
const NO_PERM = "Solo un administrador puede hacer esto.";

async function parse(fd: FormData) {
  const employee = text(fd, "employee_id");
  const kind = text(fd, "kind");
  const period = text(fd, "period");
  const amount = Number(text(fd, "amount"));
  const currency = text(fd, "currency");
  const paid = text(fd, "paid_date");
  const account = text(fd, "account_id");

  if (!employee) return { error: "Elige al empleado." };
  if (!KINDS.includes(kind)) return { error: "Elige el tipo de pago." };
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Indica el mes al que corresponde." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor que 0." };
  if (!["PEN", "USD"].includes(currency)) return { error: "Elige la moneda." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paid)) return { error: "Indica la fecha de pago." };

  const accErr = await checkAccountCurrency(await createClient(), account, currency);
  if (accErr) return { error: accErr };

  return {
    row: {
      employee_id: employee,
      kind,
      period: `${period}-01`,
      amount,
      currency,
      paid_date: paid,
      account_id: account || null,
      notes: text(fd, "notes") || null,
    },
  };
}

export async function createPayrollAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const parsed = await parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_payments").insert(parsed.row);
  if (error) return { error: fail("No se pudo guardar el pago", error) };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

export async function updatePayrollAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const parsed = await parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("payroll_payments").update(parsed.row).eq("id", id);
  if (error) return { error: fail("No se pudo guardar el pago", error) };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

export async function deletePayrollAction(id: string): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const supabase = await createClient();
  const { data, error } = await supabase.from("payroll_payments").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "No se pudo eliminar el pago." };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}
