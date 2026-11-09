import type { NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/middleware";

// "Report-Only": el navegador avisa en la consola de lo que bloquearía, pero no bloquea nada.
// Cuando no haya avisos al usar el portal, cambia a true para que la política se aplique de verdad.
const ENFORCE_CSP = false;

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const header = ENFORCE_CSP ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

  // Next lee el nonce de este header de la petición y lo pone en sus scripts.
  request.headers.set("x-nonce", nonce);
  request.headers.set(header, csp);

  const response = await updateSession(request);
  response.headers.set(header, csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
