"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/actualizar-clave`,
    });
    setLoading(false);
    if (error) return setError("No pudimos enviar el correo. Intenta de nuevo en unos minutos.");
    setSent(true);
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un enlace a tu correo">
      {sent ? (
        <p className="text-sm text-success-text">Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" required placeholder="tu@g2i.pe" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-error-text">{error}</p>}
          <Button type="submit" variant="accent" disabled={loading} className="w-full">{loading ? "Enviando…" : "Enviar enlace"}</Button>
        </form>
      )}
      <Link href="/login" className="text-center text-sm text-primary hover:underline">Volver a iniciar sesión</Link>
    </AuthCard>
  );
}
