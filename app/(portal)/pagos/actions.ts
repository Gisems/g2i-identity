"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PaymentState = { error?: string; ok?: boolean };

const METHODS = ["transferencia", "yape", "plin", "tarjeta", "efectivo", "otro"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * Registra o corrige una cuota. Con fecha de pago queda "pagada"; sin fecha vuelve a "pendiente"
 * (así también sirve para deshacer un pago puesto por error).
 */
export async function saveInstallmentAction(id: string, _prev: PaymentState, fd: FormData): Promise<PaymentState> {
  const amount = Number(text(fd, "amount"));
  const dueDate = text(fd, "due_date");
  const paidDate = text(fd, "paid_date");
  const method = text(fd, "payment_method");
  const operation = text(fd, "operation_number");

  if (!Number.isFinite(amount) || amount < 0) return { error: "El monto no es válido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: "Indica la fecha de vencimiento." };
  if (paidDate && !METHODS.includes(method)) return { error: "Elige el método de pago." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("installments")
    .update({
      amount,
      due_date: dueDate,
      paid_date: paidDate || null,
      payment_method: paidDate ? method : null,
      operation_number: paidDate ? operation || null : null,
      status: paidDate ? "pagada" : "pendiente",
    })
    .eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/pagos");
  revalidatePath("/clientes", "layout");
  return { ok: true };
}

/** "Agregar pago": registra el pago de una cuota pendiente elegida en el formulario. */
export async function addPaymentAction(_prev: PaymentState, fd: FormData): Promise<PaymentState> {
  const id = text(fd, "installment_id");
  const paidDate = text(fd, "paid_date");
  const method = text(fd, "payment_method");
  const operation = text(fd, "operation_number");

  if (!id) return { error: "Elige la cuota que se pagó." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) return { error: "Indica la fecha de pago." };
  if (!METHODS.includes(method)) return { error: "Elige el método de pago." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("installments")
    .update({ paid_date: paidDate, payment_method: method, operation_number: operation || null, status: "pagada" })
    .eq("id", id)
    .eq("status", "pendiente");
  if (error) return { error: `No se pudo registrar el pago: ${error.message}` };

  revalidatePath("/pagos");
  revalidatePath("/clientes", "layout");
  return { ok: true };
}
