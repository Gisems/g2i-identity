import { createClient } from "@supabase/supabase-js";

/** Cliente con la llave de servicio: se salta RLS. Úsalo solo en el servidor y tras verificar permisos. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
