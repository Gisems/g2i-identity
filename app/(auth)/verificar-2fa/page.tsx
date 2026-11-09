"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import OtpInput from "@/components/OtpInput";
import { Label } from "@/components/ui/label";

// Segundo paso del inicio de sesión: pide el código de la app autenticadora.
export default function Verificar2faPage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    createClient()
      .auth.mfa.listFactors()
      .then(({ data, error }) => {
        const factor = data?.totp[0];
        if (error || !factor) router.replace("/");
        else setFactorId(factor.id);
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError("");
    if (!/^\d{6}$/.test(code)) return setError("Escribe los 6 dígitos del código.");
    setLoading(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      setLoading(false);
      setCode("");
      return setError("Código incorrecto o vencido. Prueba con el siguiente.");
    }
    router.replace("/");
    router.refresh();
  }

  async function salir() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthCard title="Verificación en dos pasos" subtitle="Abre tu app autenticadora e ingresa el código de 6 dígitos">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otp-0">Código</Label>
          <OtpInput value={code} onChange={setCode} disabled={loading} autoFocus />
        </div>
        {error && <p role="alert" className="text-sm text-error-text">{error}</p>}
        <Button type="submit" variant="accent" disabled={loading || !factorId} className="w-full">{loading ? "Verificando…" : "Verificar"}</Button>
      </form>
      <button type="button" onClick={() => void salir()} className="text-center text-sm text-primary hover:underline">Cerrar sesión</button>
    </AuthCard>
  );
}
