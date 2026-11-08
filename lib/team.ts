import { getProfile } from "@/lib/session";

export const NO_ACCESS = "Tu usuario no tiene acceso a esta acción.";

/** Id del usuario si es un miembro activo del equipo (cualquier rol), o null. */
export async function teamMemberId(): Promise<string | null> {
  const p = await getProfile();
  return p?.active ? p.id : null;
}

/** Id del usuario si es admin activo (cuentas, sueldos y colaboradores), o null. */
export async function adminId(): Promise<string | null> {
  const p = await getProfile();
  return p?.active && p.role === "admin" ? p.id : null;
}

/** Cualquier admin activo puede gestionar colaboradores. */
export async function teamManagerId(): Promise<string | null> {
  return adminId();
}
