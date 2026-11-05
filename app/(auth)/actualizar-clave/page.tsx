"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ActualizarClavePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Usa al menos 8 caracteres.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setLoading(false);
      return setError("No se pudo actualizar la contraseña.");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle="Elige una contraseña segura">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-error-text">{error}</p>}
        <Button type="submit" variant="accent" disabled={loading} className="w-full">{loading ? "Guardando…" : "Guardar"}</Button>
      </form>
    </AuthCard>
  );
}
