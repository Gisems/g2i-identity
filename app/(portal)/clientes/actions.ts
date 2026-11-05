"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

const val = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

function parseCommon(fd: FormData) {
  const name = val(fd, "name");
  const ruc = val(fd, "ruc");
  if (!name) return { error: "El nombre es obligatorio." as const };
  if (ruc && !/^\d{11}$/.test(ruc)) return { error: "El RUC debe tener 11 dígitos." as const };

  const client = {
    name,
    trade_name: val(fd, "trade_name"),
    ruc,
    phone: val(fd, "phone"),
    email: val(fd, "email"),
    city: val(fd, "city"),
    status: val(fd, "status") ?? "prospecto",
    source: val(fd, "source"),
  };

  const ids = fd.getAll("rep_id").map(String);
  const names = fd.getAll("rep_name").map(String);
  const titles = fd.getAll("rep_job_title").map(String);
  const phones = fd.getAll("rep_phone").map(String);
  const primary = Number(fd.get("rep_primary") ?? 0);
  const reps = names
    .map((n, i) => ({
      id: ids[i] || null,
      name: n.trim(),
      job_title: titles[i]?.trim() || null,
      phone: phones[i]?.trim() || null,
      is_primary: i === primary,
    }))
    .filter((r) => r.name);
  if (reps.length && !reps.some((r) => r.is_primary)) reps[0].is_primary = true;

  const colorNames = fd.getAll("color_name").map(String);
  const brand_colors = fd
    .getAll("color_hex")
    .map(String)
    .map((hex, i) => ({ name: colorNames[i]?.trim() || `Color ${i + 1}`, hex }))
    .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c.hex));

  const details = {
    industry: val(fd, "industry"),
    current_website: val(fd, "current_website"),
    description: val(fd, "description"),
    drive_folder_url: val(fd, "drive_folder_url"),
    brand_colors,
  };

  return { client, reps, details };
}

const dupMessage = (code?: string, message?: string) =>
  code === "23505" ? "Ya existe un cliente con ese RUC." : `No se pudo guardar: ${message}`;

export async function createClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseCommon(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { client, reps, details } = parsed;
  const supabase = await createClient();

  // owner_id lo asigna la base con el usuario logueado
  const { data: created, error } = await supabase.from("clients").insert(client).select("id").single();
  if (error) return { error: dupMessage(error.code, error.message) };

  const [repRes, detRes] = await Promise.all([
    reps.length
      ? supabase.from("representatives").insert(reps.map(({ id: _id, ...r }) => ({ ...r, client_id: created.id })))
      : Promise.resolve({ error: null }),
    supabase.from("client_details").insert({ client_id: created.id, ...details }),
  ]);
  revalidatePath("/clientes");
  redirect(`/clientes/${created.id}${repRes.error || detRes.error ? "?aviso=parcial" : ""}`);
}

export async function updateClientAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseCommon(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { client, reps, details } = parsed;
  const supabase = await createClient();

  const { error } = await supabase.from("clients").update(client).eq("id", id);
  if (error) return { error: dupMessage(error.code, error.message) };

  const { error: detErr } = await supabase.from("client_details").upsert({ client_id: id, ...details });
  if (detErr) return { error: `Se guardó el cliente, pero no los detalles de marca: ${detErr.message}` };

  // Un solo principal por cliente: se limpia antes de marcar el nuevo.
  if (reps.length) {
    const cleared = await supabase.from("representatives").update({ is_primary: false }).eq("client_id", id);
    if (cleared.error) return { error: `No se pudieron actualizar los representantes: ${cleared.error.message}` };
    for (const { id: repId, ...r } of reps) {
      const res = repId
        ? await supabase.from("representatives").update(r).eq("id", repId).eq("client_id", id)
        : await supabase.from("representatives").insert({ ...r, client_id: id });
      if (res.error) return { error: `No se pudo guardar el representante ${r.name}: ${res.error.message}` };
    }
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}
