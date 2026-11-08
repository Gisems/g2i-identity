"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { limaLocalToIso } from "@/lib/format";
import { fail } from "@/lib/errors";

export type FormState = { error?: string; ok?: boolean };

const TYPES = ["reunion_inicial", "presentacion_diagnostico", "propuesta", "revision_avance", "entrega", "capacitacion", "soporte", "cobranza", "otro"];
const MODALITIES = ["presencial", "videollamada", "llamada"];
const STATUSES = ["agendada", "confirmada", "realizada", "cancelada", "reprogramada", "no_asistio"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function parse(fd: FormData) {
  const clientId = text(fd, "client_id");
  const title = text(fd, "title");
  const start = text(fd, "start_at");
  const end = text(fd, "end_at");
  const type = text(fd, "type");
  const modality = text(fd, "modality");
  const status = text(fd, "status") || "agendada";

  if (!clientId) return { error: "Elige un cliente." };
  if (!title) return { error: "El título es obligatorio." };
  if (!start) return { error: "Indica la fecha y hora de inicio." };
  if (!TYPES.includes(type)) return { error: "Elige el tipo de cita." };
  if (!MODALITIES.includes(modality)) return { error: "Elige la modalidad." };
  if (!STATUSES.includes(status)) return { error: "Estado no válido." };

  const startIso = limaLocalToIso(start);
  const endIso = end ? limaLocalToIso(end) : null;
  if (endIso && endIso <= startIso) return { error: "La hora de fin debe ser posterior al inicio." };

  return {
    row: {
      client_id: clientId,
      title,
      type,
      start_at: startIso,
      end_at: endIso,
      modality,
      location_or_link: text(fd, "location_or_link") || null,
      status,
      notes: text(fd, "notes") || null,
    },
  };
}

export async function createAppointmentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("appointments").insert({ ...parsed.row, manager_id: user?.id ?? null });
  if (error) return { error: fail("No se pudo guardar la cita", error) };

  revalidatePath("/agenda");
  revalidatePath("/clientes", "layout");
  revalidatePath("/");
  return { ok: true };
}

export async function updateAppointmentAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();

  const { error } = await supabase.from("appointments").update(parsed.row).eq("id", id);
  if (error) return { error: fail("No se pudo guardar la cita", error) };

  revalidatePath("/agenda");
  revalidatePath("/clientes", "layout");
  revalidatePath("/");
  return { ok: true };
}

/** Marca la cita como realizada; la base crea sola su seguimiento. */
export async function markDoneAction(id: string) {
  const supabase = await createClient();
  await supabase.from("appointments").update({ status: "realizada" }).eq("id", id);
  revalidatePath("/agenda");
  revalidatePath("/clientes", "layout");
}
