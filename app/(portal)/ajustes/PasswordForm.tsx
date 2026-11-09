"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btn } from "@/components/pv";

export default function PasswordForm() {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
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
          ? "La contraseña no cumple los requisitos (usa mayúsculas, minúsculas y números)."
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
        <input id="next" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
        <p className="hint">Mínimo 8 caracteres, con mayúsculas, minúsculas y números.</p>
      </div>
      <div className="field">
        <label htmlFor="again">Repite la nueva contraseña</label>
        <input id="again" type="password" autoComplete="new-password" required value={again} onChange={(e) => setAgain(e.target.value)} />
      </div>
      <button type="submit" className={btn("cta")} disabled={busy}>{busy ? "Guardando…" : "Cambiar contraseña"}</button>
    </form>
  );
}
