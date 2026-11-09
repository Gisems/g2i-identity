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

/**
 * true si el usuario activó el segundo factor pero esta sesión aún no lo verificó (aal1).
 * Se calcula con el usuario verificado por Supabase (no con la cookie), para que no se pueda saltar.
 */
export const needsMfa = cache(async () => {
  const user = await getSessionUser();
  if (!user) return false;
  const enrolled = user.factors?.some((f) => f.factor_type === "totp" && f.status === "verified");
  if (!enrolled) return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.aal !== "aal2";
});

export const getProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  if (await needsMfa()) return null; // sin verificar el segundo factor no hay perfil: las acciones también se bloquean
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("name, role, active").eq("id", user.id).maybeSingle();
  return data ? { id: user.id, ...data } : null;
});
