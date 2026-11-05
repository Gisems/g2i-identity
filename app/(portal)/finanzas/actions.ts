"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { checkAccountCurrency } from "@/lib/account";

export type FormState = { error?: string; ok?: boolean };


const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function parse(fd: FormData) {
  const concept = text(fd, "concept");
  const category = text(fd, "category");
  const currency = text(fd, "currency");
  const amount = Number(text(fd, "amount"));
  const date = text(fd, "expense_date");

  if (!concept) return { error: "El concepto es obligatorio." };
  if (!(category in EXPENSE_CATEGORIES)) return { error: "Elige una categoría." };
  if (!["PEN", "USD"].includes(currency)) return { error: "Elige la moneda." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor que 0." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Indica la fecha en que se realizó el gasto." };
  const expires = text(fd, "expires_on");
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return { error: "La fecha de vencimiento no es válida." };
  if (expires && expires < date) return { error: "El vencimiento no puede ser anterior a la fecha del gasto." };

  const account = text(fd, "account_id");
  const accErr = await checkAccountCurrency(await createClient(), account, currency);
  if (accErr) return { error: accErr };

  return {
    row: {
      concept,
      category,
      currency,
      amount,
      expense_date: date,
      platform: text(fd, "platform") || null,
      paid_by: text(fd, "paid_by") || null,
      account_id: account || null,
      expires_on: expires || null,
      notes: text(fd, "notes") || null,
    },
  };
}

export async function createExpenseAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = await parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert(parsed.row);
  if (error) return { error: `No se pudo guardar el gasto: ${error.message}` };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

export async function updateExpenseAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = await parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update(parsed.row).eq("id", id);
  if (error) return { error: `No se pudo guardar el gasto: ${error.message}` };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}

export async function deleteExpenseAction(id: string): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").delete().eq("id", id).select("id");
  if (error) return { error: `No se pudo eliminar el gasto: ${error.message}` };
  if (!data?.length) return { error: "No se pudo eliminar el gasto." };
  revalidatePath("/finanzas", "layout");
  return { ok: true };
}
