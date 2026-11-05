"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CancelButton from "@/components/CancelButton";
import { useDrawerClose } from "@/components/DrawerShell";
import { btn } from "@/components/pv";
import { createCollaboratorAction, type FormState } from "./actions";

export default function CollaboratorForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCollaboratorAction, {});
  const router = useRouter();
  const close = useDrawerClose();

  useEffect(() => {
    if (state.ok) (close ?? (() => router.push("/colaboradores")))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={action} style={{ maxWidth: 560 }}>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset style={{ marginBottom: 0 }}>
            <legend>Colaborador</legend>
            <div className="field">
              <label htmlFor="name">Nombre *</label>
              <input id="name" name="name" required autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="email">Correo *</label>
              <input id="email" name="email" type="email" required autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="role">Rol *</label>
              <select id="role" name="role" defaultValue="ventas">
                <option value="ventas">Ventas</option>
                <option value="dev">Desarrollo</option>
                <option value="diseño">Diseño</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              Se crea la cuenta sin contraseña conocida. El colaborador entra al portal con
              «Olvidé mi contraseña» y define la suya desde el correo que recibe.
            </p>
          </fieldset>
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Creando…" : "Crear colaborador"}</button>
        <CancelButton href="/colaboradores" />
      </div>
    </form>
  );
}
