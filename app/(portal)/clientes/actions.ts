"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/session";
import { NO_ACCESS, adminId, teamMemberId } from "@/lib/team";
import { isHttpUrl } from "@/lib/url";
import { fail } from "@/lib/errors";

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
  const website = val(fd, "current_website");
  const drive = val(fd, "drive_folder_url");
  if (website && !isHttpUrl(website)) return { error: "La web actual debe empezar con http:// o https://." as const };
  if (drive && !isHttpUrl(drive)) return { error: "La carpeta de Drive debe ser un enlace http:// o https://." as const };

  const client = {
    name,
    trade_name: val(fd, "trade_name"),
    ruc,
    phone: val(fd, "phone"),
    email: val(fd, "email"),
    city: val(fd, "city"),
    status: val(fd, "status") ?? "prospecto",
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
    current_website: website,
    description: val(fd, "description"),
    drive_folder_url: drive,
    brand_colors,
  };

  return { client, reps, details };
}

const dupMessage = (error: { code?: string; message: string }) =>
  error.code === "23505" ? "Ya existe un cliente con ese RUC." : fail("No se pudo guardar", error);

export async function createClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const profile = await getProfile();
  if (!profile?.active) return { error: NO_ACCESS };
  const parsed = parseCommon(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { client, reps, details } = parsed;
  const supabase = await createClient();

  // Origen: el nombre de quien lo crea desde el portal ("web" lo pone la landing).
  const { data: created, error } = await supabase.from("clients").insert({ ...client, source: profile.name }).select("id").single();
  if (error) return { error: dupMessage(error) };

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
  if (!(await teamMemberId())) return { error: NO_ACCESS };
  const parsed = parseCommon(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { client, reps, details } = parsed;
  const supabase = await createClient();

  const { error } = await supabase.from("clients").update(client).eq("id", id);
  if (error) return { error: dupMessage(error) };

  const { error: detErr } = await supabase.from("client_details").upsert({ client_id: id, ...details });
  if (detErr) return { error: fail("Se guardó el cliente, pero no los detalles de marca", detErr) };

  // Un solo principal por cliente: se limpia antes de marcar el nuevo.
  if (reps.length) {
    const cleared = await supabase.from("representatives").update({ is_primary: false }).eq("client_id", id);
    if (cleared.error) return { error: fail("No se pudieron actualizar los representantes", cleared.error) };
    for (const { id: repId, ...r } of reps) {
      const res = repId
        ? await supabase.from("representatives").update(r).eq("id", repId).eq("client_id", id)
        : await supabase.from("representatives").insert({ ...r, client_id: id });
      if (res.error) return { error: fail(`No se pudo guardar el representante ${r.name}`, res.error) };
    }
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

/** Oculta al cliente (estado "inactivo") o lo reactiva. No borra nada: proyectos, pagos y citas se conservan. */
export async function setClientActiveAction(id: string, active: boolean): Promise<{ error?: string }> {
  if (!(await teamMemberId())) return { error: NO_ACCESS };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ status: active ? "activo" : "inactivo" })
    .eq("id", id)
    .select("id");
  if (error) return { error: fail("No se pudo actualizar el cliente", error) };
  if (!data?.length) return { error: "No se encontró el cliente." };
  revalidatePath("/clientes", "layout");
  revalidatePath("/");
  if (!active) redirect("/clientes");
  return {};
}

/** Asigna (o quita, con null) el administrador que le hace seguimiento al cliente. Solo lo hacen los administradores. */
export async function setFollowUpAdminAction(clientId: string, userId: string | null): Promise<{ error?: string }> {
  if (!(await adminId())) return { error: NO_ACCESS };
  const supabase = await createClient();

  if (userId) {
    const { data: target } = await supabase.from("users").select("id").eq("id", userId).eq("role", "admin").eq("active", true).maybeSingle();
    if (!target) return { error: "Elige un administrador activo." };
  }

  const { data, error } = await supabase.from("clients").update({ follow_up_admin_id: userId }).eq("id", clientId).select("id");
  if (error) return { error: fail("No se pudo asignar el seguimiento", error) };
  if (!data?.length) return { error: NO_ACCESS };

  revalidatePath(`/clientes/${clientId}`);
  return {};
}
