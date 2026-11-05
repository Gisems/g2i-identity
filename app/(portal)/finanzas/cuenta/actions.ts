"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminId } from "@/lib/team";

export type FormState = { error?: string; ok?: boolean };

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NO_PERM = "Solo un administrador puede hacer esto.";

function parseAccount(fd: FormData) {
  const name = text(fd, "name");
  const currency = text(fd, "currency");
  const opening = Number(text(fd, "opening_balance") || "0");
  const date = text(fd, "opening_date");
  if (!name) return { error: "El nombre de la cuenta es obligatorio." };
  if (!["PEN", "USD"].includes(currency)) return { error: "Elige la moneda." };
  if (!Number.isFinite(opening)) return { error: "El saldo inicial no es válido." };
  if (!DATE.test(date)) return { error: "Indica desde qué fecha se cuenta el saldo." };
  return { row: { name, currency, opening_balance: opening, opening_date: date, receives_client_payments: fd.get("receives_client_payments") === "on" } };
}

export async function createAccountAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const parsed = parseAccount(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert(parsed.row);
  if (error) return { error: /duplicate|unique/i.test(error.message) ? "Ya existe una cuenta con ese nombre." : `No se pudo crear la cuenta: ${error.message}` };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

export async function updateAccountAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const parsed = parseAccount(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update(parsed.row).eq("id", id);
  if (error) return { error: /duplicate|unique/i.test(error.message) ? "Ya existe una cuenta con ese nombre." : `No se pudo guardar la cuenta: ${error.message}` };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

function parseDeposit(fd: FormData) {
  const account = text(fd, "account_id");
  const amount = Number(text(fd, "amount"));
  const date = text(fd, "deposit_date");
  if (!account) return { error: "Elige la cuenta." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor que 0." };
  if (!DATE.test(date)) return { error: "Indica la fecha del depósito." };
  return { row: { account_id: account, amount, deposit_date: date, concept: text(fd, "concept") || null } };
}

export async function createDepositAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const parsed = parseDeposit(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("account_deposits").insert(parsed.row);
  if (error) return { error: `No se pudo guardar el depósito: ${error.message}` };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

export async function updateDepositAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const parsed = parseDeposit(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("account_deposits").update(parsed.row).eq("id", id);
  if (error) return { error: `No se pudo guardar el depósito: ${error.message}` };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

export async function deleteDepositAction(id: string): Promise<FormState> {
  if (!(await adminId())) return { error: NO_PERM };
  const supabase = await createClient();
  const { data, error } = await supabase.from("account_deposits").delete().eq("id", id).select("id");
  if (error || !data?.length) return { error: "No se pudo eliminar el depósito." };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}
