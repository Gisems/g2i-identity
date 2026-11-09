"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OtpInput from "@/components/OtpInput";
import { Badge, btn } from "@/components/pv";

type Status = "loading" | "off" | "enrolling" | "on";

export default function MfaPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createClient()
      .auth.mfa.listFactors()
      .then(({ data, error }) => {
        if (error) {
          setError("No se pudo consultar el segundo factor.");
          return setStatus("off");
        }
        const factor = data.totp[0];
        setFactorId(factor?.id ?? "");
        setStatus(factor ? "on" : "off");
      });
  }, []);

  async function start() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    // Si quedó un intento a medias, se descarta (el nombre del factor debe ser único).
    const all = await supabase.auth.mfa.listFactors();
    for (const f of all.data?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Portal G2I", issuer: "Portal G2I" });
    setBusy(false);
    if (error || !data) {
      return setError(
        error?.code === "mfa_totp_enroll_not_enabled"
          ? "El segundo factor no está habilitado en Supabase (Authentication → Multi-Factor)."
          : "No se pudo iniciar la activación. Inténtalo de nuevo.",
      );
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setCode("");
    setStatus("enrolling");
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Escribe los 6 dígitos del código.");
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return setError("Código incorrecto o vencido. Prueba con el siguiente.");
    setQr("");
    setSecret("");
    setStatus("on");
    router.refresh();
  }

  async function cancel() {
    await createClient().auth.mfa.unenroll({ factorId });
    setQr("");
    setSecret("");
    setFactorId("");
    setStatus("off");
  }

  async function disable() {
    setBusy(true);
    setError("");
    const { error } = await createClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    setConfirmOff(false);
    if (error) return setError("No se pudo desactivar. Inténtalo de nuevo.");
    setFactorId("");
    setStatus("off");
    router.refresh();
  }

  if (status === "loading") return <p className="hint">Cargando…</p>;

  return (
    <div style={{ maxWidth: 480 }}>
      {error && <div className="form-error" role="alert">{error}</div>}

      {status === "off" && (
        <>
          <p style={{ marginTop: 0 }}>
            <Badge tone="neutral">Desactivado</Badge>
          </p>
          <p className="hint" style={{ marginBottom: 14 }}>
            Además de la contraseña, el portal pedirá un código de 6 dígitos de una app autenticadora (Google Authenticator, Authy, Microsoft Authenticator…).
          </p>
          <button type="button" className={btn("cta")} onClick={() => void start()} disabled={busy}>{busy ? "Preparando…" : "Activar segundo factor"}</button>
        </>
      )}

      {status === "enrolling" && (
        <form onSubmit={confirm}>
          <p style={{ marginTop: 0 }}><strong>1.</strong> Escanea este código con tu app autenticadora.</p>
          {/* QR en SVG (data URI) generado por Supabase */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR para la app autenticadora" width={180} height={180} style={{ background: "#fff", padding: 8, borderRadius: 8 }} />
          <p className="hint">¿No puedes escanear? Escribe esta clave en la app: <code style={{ userSelect: "all" }}>{secret}</code></p>
          <p><strong>2.</strong> Escribe el código de 6 dígitos que muestra la app.</p>
          <div className="field">
            <label htmlFor="mfa-code-0">Código</label>
            <OtpInput idPrefix="mfa-code" value={code} onChange={setCode} disabled={busy} autoFocus />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" className={btn("cta")} disabled={busy}>{busy ? "Verificando…" : "Activar"}</button>
            <button type="button" className={btn()} onClick={() => void cancel()} disabled={busy}>Cancelar</button>
          </div>
        </form>
      )}

      {status === "on" && (
        <>
          <p style={{ marginTop: 0 }}>
            <Badge tone="ok">Activado</Badge>
          </p>
          <p className="hint" style={{ marginBottom: 14 }}>Al iniciar sesión se te pedirá el código de tu app autenticadora.</p>
          {confirmOff ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span>¿Desactivar el segundo factor?</span>
              <button type="button" className={btn("small")} onClick={() => void disable()} disabled={busy}>{busy ? "Desactivando…" : "Sí, desactivar"}</button>
              <button type="button" className={btn("small")} onClick={() => setConfirmOff(false)} disabled={busy}>No</button>
            </div>
          ) : (
            <button type="button" className={btn()} onClick={() => setConfirmOff(true)}>Desactivar</button>
          )}
        </>
      )}
    </div>
  );
}
