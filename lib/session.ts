import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuario y perfil de la petición actual. `cache` evita repetir las mismas consultas
 * (layout, páginas, permisos) dentro de una misma carga.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("name, role, active").eq("id", user.id).maybeSingle();
  return data ? { id: user.id, ...data } : null;
});
