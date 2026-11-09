"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NO_ACCESS, teamMemberId } from "@/lib/team";
import { genInstallments, type InstallmentDraft, type Modality } from "@/lib/installments";
import { fail } from "@/lib/errors";
import { todayLima } from "@/lib/format";
import { PROJECT_SERVICES } from "@/lib/services";

export type FormState = { error?: string };

const MODALITIES: Modality[] = ["contado", "adelanto_saldo", "cuotas", "recurrente"];
const STATUSES = ["solicitado", "propuesta", "aprobado", "en_curso", "en_revision", "entregado", "pausado", "cancelado"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

type Plan = { modality: Modality; currency: "PEN" | "USD"; installments: InstallmentDraft[]; total: number; free?: boolean };

/**
 * El plan de pago es opcional: mientras no se acuerde el precio, el proyecto queda sin monto ni plan
 * y se completa después desde "Editar proyecto". Si se escribe un monto, el plan se valida completo.
 * Un monto de 0 es un proyecto gratis: queda con un plan de una sola cuota en 0, ya pagada (nada que cobrar).
 */
function parsePlan(fd: FormData): { error: string } | { plan: Plan | null } {
  const amountText = text(fd, "amount");
  if (!amountText) return { plan: null };

  const currency = text(fd, "currency") === "USD" ? "USD" : "PEN";
  const modality = text(fd, "modality") as Modality;
  const amount = Number(amountText);
  const count = Number(text(fd, "count") || 1);
  const firstDue = text(fd, "first_due");

  if (!MODALITIES.includes(modality)) return { error: "Elige una modalidad de pago." };
  if (!Number.isFinite(amount) || amount < 0) return { error: "El monto no es válido." };
  if (amount === 0) {
    const due = /^\d{4}-\d{2}-\d{2}$/.test(firstDue) ? firstDue : todayLima();
    return { plan: { modality: "contado", currency, installments: [{ number: 1, concept: "Gratis", amount: 0, due_date: due }], total: 0, free: true } };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDue)) return { error: "Indica la fecha del primer vencimiento." };
  if ((modality === "cuotas" || modality === "recurrente") && !(count >= 1 && count <= 60)) {
    return { error: "La cantidad de cuotas debe estar entre 1 y 60." };
  }

  const installments = genInstallments(modality, amount, count, firstDue);
  // En recurrente el monto que se escribe es el de cada mes.
  const total = installments.reduce((sum, i) => sum + Math.round(i.amount * 100), 0) / 100;
  return { plan: { modality, currency, installments, total } };
}

function parseCommon(fd: FormData) {
  const title = text(fd, "title");
  const services = [...new Set(fd.getAll("services").map(String))].filter((s) =>
    (PROJECT_SERVICES as readonly string[]).includes(s),
  );
  const status = text(fd, "status") || "propuesta";
  if (!title) return { error: "El título es obligatorio." as const };
  if (!services.length) return { error: "Elige al menos un servicio." as const };
  if (!STATUSES.includes(status)) return { error: "El estado no es válido." as const };
  return {
    row: { title, services, status, description: text(fd, "description") || null, start_date: text(fd, "start_date") || null },
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Guarda el plan de pago y sus cuotas de un proyecto que todavía no tiene plan. */
async function savePlan(supabase: Supabase, projectId: string, plan: Plan): Promise<string | null> {
  const { data: pay, error: planErr } = await supabase
    .from("payments")
    .insert({
      project_id: projectId,
      modality: plan.modality,
      installment_count: plan.installments.length,
      periodicity: plan.modality === "recurrente" ? "mensual" : null,
      currency: plan.currency,
    })
    .select("id")
    .single();
  if (planErr) return fail("No se pudo crear el plan de pago", planErr);

  const { error: instErr } = await supabase
    .from("installments")
    .insert(plan.installments.map((i) => ({ ...i, payment_id: pay.id, ...(plan.free ? { paid_date: i.due_date, payment_method: "otro", status: "pagada" } : {}) })));
  if (instErr) return fail("Se creó el plan, pero no las cuotas", instErr);

  const { error: totalErr } = await supabase
    .from("projects")
    .update({ total_amount: plan.total, currency: plan.currency })
    .eq("id", projectId);
  if (totalErr) return fail("Se creó el plan, pero no se pudo guardar el monto del proyecto", totalErr);
  return null;
}

export async function createProjectAction(clientId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await teamMemberId())) return { error: NO_ACCESS };
  const common = parseCommon(fd);
  if ("error" in common) return { error: common.error };
  const parsedPlan = parsePlan(fd);
  if ("error" in parsedPlan) return { error: parsedPlan.error };
  const { plan } = parsedPlan;
  const diagnosticId = text(fd, "diagnostic_id");

  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ ...common.row, client_id: clientId, total_amount: plan?.total ?? 0, currency: plan?.currency ?? "PEN" })
    .select("id")
    .single();
  if (error) return { error: fail("No se pudo crear el proyecto", error) };

  if (plan) {
    const planError = await savePlan(supabase, project.id, plan);
    if (planError) return { error: planError };
  }

  // Un proyecto aprobado o en curso vuelve activo al cliente.
  if (common.row.status === "aprobado" || common.row.status === "en_curso") {
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

/** Edita el proyecto. Si todavía no tiene plan de pago y se escribe un monto, se crea el plan. */
export async function updateProjectAction(clientId: string, projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await teamMemberId())) return { error: NO_ACCESS };
  const common = parseCommon(fd);
  if ("error" in common) return { error: common.error };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id, payments(id)")
    .eq("id", projectId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!existing) return { error: "No se encontró el proyecto." };

  // Con plan ya creado el formulario no muestra esos campos; se ignoran aunque lleguen.
  const parsedPlan = existing.payments ? { plan: null } : parsePlan(fd);
  if ("error" in parsedPlan) return { error: parsedPlan.error };

  const { error } = await supabase.from("projects").update(common.row).eq("id", projectId).eq("client_id", clientId);
  if (error) return { error: fail("No se pudo guardar el proyecto", error) };

  if (parsedPlan.plan) {
    const planError = await savePlan(supabase, projectId, parsedPlan.plan);
    if (planError) return { error: planError };
  }

  if (common.row.status === "aprobado" || common.row.status === "en_curso") {
    await supabase.from("clients").update({ status: "activo" }).eq("id", clientId);
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/pagos");
  redirect(`/clientes/${clientId}?tab=proyectos`);
}
