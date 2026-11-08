"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { genInstallments, type Modality } from "@/lib/installments";
import { fail } from "@/lib/errors";

export type FormState = { error?: string };

const MODALITIES: Modality[] = ["contado", "adelanto_saldo", "cuotas", "recurrente"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createProjectAction(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const title = text(fd, "title");
  const serviceId = text(fd, "service_id");
  const currency = text(fd, "currency") === "USD" ? "USD" : "PEN";
  const status = text(fd, "status") || "propuesta";
  const modality = text(fd, "modality") as Modality;
  const amount = Number(text(fd, "amount"));
  const count = Number(text(fd, "count") || 1);
  const firstDue = text(fd, "first_due");
  const diagnosticId = text(fd, "diagnostic_id");

  if (!title) return { error: "El título es obligatorio." };
  if (!serviceId) return { error: "Elige un servicio." };
  if (!MODALITIES.includes(modality)) return { error: "Elige una modalidad de pago." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor que 0." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDue)) return { error: "Indica la fecha del primer vencimiento." };
  if ((modality === "cuotas" || modality === "recurrente") && !(count >= 1 && count <= 60)) {
    return { error: "La cantidad de cuotas debe estar entre 1 y 60." };
  }

  const installments = genInstallments(modality, amount, count, firstDue);
  // En recurrente el monto que se escribe es el de cada mes.
  const total = installments.reduce((sum, i) => sum + Math.round(i.amount * 100), 0) / 100;

  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      client_id: clientId,
      service_id: serviceId,
      title,
      description: text(fd, "description") || null,
      status,
      total_amount: total,
      currency,
      start_date: text(fd, "start_date") || null,
    })
    .select("id")
    .single();
  if (error) return { error: fail("No se pudo crear el proyecto", error) };

  const { data: plan, error: planErr } = await supabase
    .from("payments")
    .insert({
      project_id: project.id,
      modality,
      installment_count: installments.length,
      periodicity: modality === "recurrente" ? "mensual" : null,
      currency,
    })
    .select("id")
    .single();
  if (planErr) return { error: fail("El proyecto se creó, pero no su plan de pago", planErr) };

  const { error: instErr } = await supabase
    .from("installments")
    .insert(installments.map((i) => ({ ...i, payment_id: plan.id })));
  if (instErr) return { error: fail("El proyecto y el plan se crearon, pero no las cuotas", instErr) };

  // Un proyecto aprobado o en curso vuelve activo al cliente.
  if (status === "aprobado" || status === "en_curso") {
    await supabase.from("clients").update({ status: "activo" }).eq("id", clientId);
  }
  // Si viene de un diagnóstico, queda convertido y apunta al proyecto.
  if (diagnosticId) {
    await supabase
      .from("diagnostics")
      .update({ status: "convertido", converted_project_id: project.id })
      .eq("id", diagnosticId);
    revalidatePath("/diagnosticos");
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/pagos");
  redirect(`/clientes/${clientId}?tab=proyectos`);
}
