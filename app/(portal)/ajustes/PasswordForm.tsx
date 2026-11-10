"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { btn } from "@/components/pv";

export default function PasswordForm() {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk(false);
    if (next.length < 8) return setError("La nueva contraseña debe tener al menos 8 caracteres.");
    if (next !== again) return setError("Las contraseñas no coinciden.");
    setBusy(true);

    const { error: updErr } = await createClient().auth.updateUser({ password: next });
    setBusy(false);
    if (updErr) {
      return setError(
        updErr.code === "weak_password"
          ? "La contraseña no cumple los requisitos (usa mayúsculas, minúsculas, números y un símbolo como ! @ # $). Evita claves comunes."
          : updErr.code === "same_password"
            ? "La nueva contraseña debe ser distinta de la actual."
            : "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
      );
    }
    setNext("");
    setAgain("");
    setOk(true);
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 420 }}>
      {error && <div className="form-error" role="alert">{error}</div>}
      {ok && <div className="form-ok" role="status">Contraseña actualizada.</div>}
      <div className="field">
        <label htmlFor="next">Nueva contraseña</label>
        <div style={{ position: "relative" }}>
          <input id="next" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} style={{ paddingRight: 40 }} />
          <button
            type="button"
            aria-label={show ? "Ocultar contraseñas" : "Mostrar contraseñas"}
            aria-pressed={show}
            onClick={() => setShow((v) => !v)}
            style={{ position: "absolute", top: 0, bottom: 0, right: 8, display: "flex", alignItems: "center", background: "none", border: 0, padding: 4, cursor: "pointer", color: "inherit", opacity: 0.7 }}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="hint">Mínimo 8 caracteres, con mayúsculas, minúsculas, números y un símbolo (! @ # $ …).</p>
      </div>
      <div className="field">
        <label htmlFor="again">Repite la nueva contraseña</label>
        <div style={{ position: "relative" }}>
          <input id="again" type={show ? "text" : "password"} autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} style={{ paddingRight: 40 }} />
          <button
            type="button"
            aria-label={show ? "Ocultar contraseñas" : "Mostrar contraseñas"}
            aria-pressed={show}
            onClick={() => setShow((v) => !v)}
            style={{ position: "absolute", top: 0, bottom: 0, right: 8, display: "flex", alignItems: "center", background: "none", border: 0, padding: 4, cursor: "pointer", color: "inherit", opacity: 0.7 }}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <button type="submit" className={btn("cta")} disabled={busy}>{busy ? "Guardando…" : "Cambiar contraseña"}</button>
    </form>
  );
}
