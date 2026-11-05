// Destinos permitidos tras confirmar un enlace del correo. Cualquier otro valor cae en "/".
const ALLOWED = new Set(["/", "/actualizar-clave"]);

export function safeNext(value: string | null): string {
  return value && ALLOWED.has(value) ? value : "/";
}
