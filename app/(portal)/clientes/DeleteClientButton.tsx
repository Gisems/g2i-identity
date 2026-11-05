"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { btn } from "@/components/pv";
import { deleteClientAction } from "./actions";

export default function DeleteClientButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function remove() {
    setError("");
    start(async () => {
      const res = await deleteClientAction(id);
      if (res?.error) setError(res.error);
    });
  }

  if (!confirming) {
    return <button type="button" className={btn()} onClick={() => setConfirming(true)}><Trash2 /> Eliminar</button>;
  }
  return (
    <div role="alertdialog" aria-label="Confirmar eliminación" style={{ flexBasis: "100%", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
      <span style={{ fontSize: 13 }}>
        ¿Eliminar <strong>{name}</strong>? Se borrarán también sus proyectos, pagos, citas y diagnósticos.
      </span>
      <button type="button" className={btn("small")} onClick={() => setConfirming(false)} disabled={pending}>Cancelar</button>
      <button type="button" className={btn("small", "primary")} onClick={remove} disabled={pending}>{pending ? "Eliminando…" : "Sí, eliminar"}</button>
      {error && <span className="form-error" role="alert" style={{ flexBasis: "100%" }}>{error}</span>}
    </div>
  );
}
