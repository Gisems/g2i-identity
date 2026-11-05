"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

const STATUSES = ["solicitado", "en_analisis", "entregado", "convertido", "descartado"];
const PRIORITIES = ["alta", "media", "baja"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function parse(fd: FormData) {
  const url = text(fd, "analyzed_url");
  const status = text(fd, "status") || "solicitado";
  const scoreRaw = text(fd, "overall_score");
  const score = scoreRaw === "" ? null : Number(scoreRaw);

  if (!url) return { error: "Indica la URL analizada." };
  if (!STATUSES.includes(status)) return { error: "Estado no válido." };
  if (score !== null && !(Number.isInteger(score) && score >= 0 && score <= 100)) {
    return { error: "El puntaje debe ser un número entero de 0 a 100." };
  }

  const areas = fd.getAll("point_area").map(String);
  const priorities = fd.getAll("point_priority").map(String);
  const findings = fd.getAll("point_finding").map(String);
  const improvement_points = findings
    .map((finding, i) => ({
      area: areas[i]?.trim() || "General",
      priority: PRIORITIES.includes(priorities[i]) ? priorities[i] : "media",
      finding: finding.trim(),
    }))
    .filter((p) => p.finding);

  return {
    row: {
      analyzed_url: url,
      status,
      requested_date: text(fd, "requested_date") || undefined,
      delivered_date: text(fd, "delivered_date") || null,
      overall_score: score,
      mockup_url: text(fd, "mockup_url") || null,
      improvement_points,
    },
  };
}

export async function createDiagnosticAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let clientId = text(fd, "client_id");
  const newName = text(fd, "new_client_name");
  if (!clientId && !newName) return { error: "Elige un cliente o escribe el nombre de uno nuevo." };

  // Un diagnóstico para alguien que aún no es cliente lo registra como prospecto con origen "diagnóstico".
  if (!clientId) {
    const { data: created, error } = await supabase
      .from("clients")
      .insert({ name: newName, status: "prospecto", source: "diagnostico" })
      .select("id")
      .single();
    if (error) return { error: `No se pudo crear el cliente: ${error.message}` };
    clientId = created.id;
  }

  const { error } = await supabase
    .from("diagnostics")
    .insert({ ...parsed.row, client_id: clientId, manager_id: user?.id ?? null });
  if (error) return { error: `No se pudo guardar el diagnóstico: ${error.message}` };

  revalidatePath("/diagnosticos");
  revalidatePath("/clientes", "layout");
  revalidatePath("/");
  return { ok: true };
}

export async function updateDiagnosticAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parse(fd);
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();

  const { error } = await supabase.from("diagnostics").update(parsed.row).eq("id", id);
  if (error) return { error: `No se pudo guardar el diagnóstico: ${error.message}` };

  revalidatePath("/diagnosticos");
  revalidatePath("/clientes", "layout");
  revalidatePath("/");
  return { ok: true };
}
