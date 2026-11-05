import { createClient } from "@/lib/supabase/server";

/**
 * Solo la persona cuyo correo está en SUPER_ADMIN_EMAIL (y que además sea admin activo)
 * puede ver y usar la sección de colaboradores. Otros admins no.
 * Devuelve el id del usuario, o null si no tiene permiso.
 */
export async function teamManagerId(): Promise<string | null> {
  const owner = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!owner) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== owner) return null;
  const { data } = await supabase.from("users").select("role, active").eq("id", user.id).maybeSingle();
  return data?.active && data.role === "admin" ? user.id : null;
}
