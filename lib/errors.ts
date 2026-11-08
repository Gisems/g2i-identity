type DbError = { code?: string; message: string };

// Motivos que se pueden mostrar sin revelar nombres de tablas, columnas ni restricciones.
const REASONS: Record<string, string> = {
  "23505": "ya existe un registro con esos datos.",
  "23503": "hace referencia a un dato que no existe o que está en uso.",
  "23502": "falta un dato obligatorio.",
  "23514": "algún dato no es válido.",
  "22P02": "algún dato no es válido.",
  "22007": "alguna fecha no es válida.",
  "42501": "no tienes permiso para hacerlo.",
};

/**
 * Mensaje seguro para mostrar al usuario. El detalle técnico del error (Postgres/Supabase) solo se
 * registra en el servidor; al navegador llega únicamente un motivo genérico según el código.
 */
export function fail(prefix: string, error: DbError): string {
  console.error(`[${prefix}]`, error.code ?? "", error.message);
  return `${prefix}: ${REASONS[error.code ?? ""] ?? "inténtalo de nuevo."}`;
}
