/**
 * Content-Security-Policy con nonce (una por petición, la genera proxy.ts).
 *
 * - script-src: solo 'self' + el nonce de esta petición ('strict-dynamic' deja que esos scripts carguen
 *   a los suyos). Es lo que frena un XSS: un <script> inyectado no tiene el nonce y no se ejecuta.
 * - style-src lleva 'unsafe-inline' porque el código usa atributos style={{...}}, que un nonce no cubre;
 *   los estilos son mucho menos peligrosos que los scripts.
 * - Fontshare (Satoshi) se carga desde fuera: api.fontshare.com (CSS) y cdn.fontshare.com (fuentes).
 * - connect-src incluye Supabase porque el navegador inicia sesión y cambia la contraseña directo con él.
 */
export function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
    "img-src 'self' blob: data:",
    "font-src 'self' https://cdn.fontshare.com",
    `connect-src 'self' ${supabase}${isDev ? " ws:" : ""}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
