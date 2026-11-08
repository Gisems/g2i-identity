/**
 * Solo permite enlaces http(s). Evita guardar `javascript:`, `data:` u otros esquemas que luego
 * se pintarían en un <a href>. `allowBare` admite "ejemplo.com" (sin esquema) para campos libres.
 */
export function isHttpUrl(value: string, allowBare = false): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return allowBare && !/^[a-z][a-z0-9+.-]*:/i.test(value);
  }
}
