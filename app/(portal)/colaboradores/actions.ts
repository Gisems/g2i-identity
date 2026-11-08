"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { teamManagerId } from "@/lib/team";
import { fail } from "@/lib/errors";

export type FormState = { error?: string; ok?: boolean };

const ROLES = ["admin", "ventas", "dev", "diseño"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function createCollaboratorAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (!(await teamManagerId())) return { error: "No tienes permiso para crear colaboradores." };

  const name = text(fd, "name");
  const email = text(fd, "email").toLowerCase();
  const role = text(fd, "role");
  if (!name) return { error: "El nombre es obligatorio." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Escribe un correo válido." };
  if (!ROLES.includes(role)) return { error: "Elige un rol." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[createAdminClient]", (e as Error).message);
    return { error: "El servidor no está configurado para crear cuentas." };
  }

  // Contraseña aleatoria que nadie conoce: el colaborador define la suya con "Olvidé mi contraseña".
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: randomBytes(24).toString("base64url"),
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    const dup = /already|registered|exists/i.test(error?.message ?? "");
    return { error: dup ? "Ya existe una cuenta con ese correo." : fail("No se pudo crear la cuenta", error ?? { message: "createUser sin usuario" }) };
  }

  const { error: insErr } = await admin.from("users").insert({ id: data.user.id, name, email, role });
  if (insErr) {
    await admin.auth.admin.deleteUser(data.user.id); // no dejar una cuenta sin perfil
    return { error: fail("No se pudo guardar el perfil", insErr) };
  }

  revalidatePath("/colaboradores");
  return { ok: true };
}

export async function setCollaboratorActiveAction(id: string, active: boolean) {
  const managerId = await teamManagerId();
  if (!managerId || managerId === id) return; // nadie se desactiva a sí mismo
  const supabase = await createClient();
  await supabase.from("users").update({ active }).eq("id", id);
  revalidatePath("/colaboradores");
}
