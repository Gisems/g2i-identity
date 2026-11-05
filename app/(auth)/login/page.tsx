"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    params.get("error") === "enlace"
      ? "El enlace expiró o no es válido."
      : params.get("error") === "sin-acceso"
        ? "Tu usuario no tiene acceso al portal."
        : "",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Ingresa un correo válido.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return setError("Correo o contraseña incorrectos.");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard title="Iniciar sesión" subtitle="Acceso solo para el equipo de G2I Digital">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="tu@g2i.pe" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-1 my-auto"
              onClick={() => setShow((v) => !v)}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-error-text">{error}</p>}
        <Button type="submit" variant="accent" disabled={loading} className="w-full">
          {loading ? "Ingresando…" : "Ingresar"}
        </Button>
        <Link href="/recuperar" className="text-center text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
