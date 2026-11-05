"use client";

import { useState, useTransition } from "react";
import { EyeOff, RotateCcw } from "lucide-react";
import { btn } from "@/components/pv";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setClientActiveAction } from "./actions";

export default function ArchiveClientButton({ id, name, inactive }: { id: string; name: string; inactive: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(active: boolean) {
    setError("");
    start(async () => {
      const res = await setClientActiveAction(id, active);
      if (res?.error) setError(res.error);
      else setOpen(false);
    });
  }

  // Ya desactivado: se reactiva con un clic.
  if (inactive) {
    return (
      <>
        <button type="button" className={btn()} onClick={() => run(true)} disabled={pending}>
          <RotateCcw /> {pending ? "Reactivando…" : "Reactivar"}
        </button>
        {error && <div className="form-error" role="alert">{error}</div>}
      </>
    );
  }

  return (
    <>
      <button type="button" className={btn()} onClick={() => setOpen(true)}><EyeOff /> Desactivar</button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="pv sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Desactivar a {name}?</DialogTitle>
            <DialogDescription>
              El cliente se ocultará de la lista, del panel, de pagos, agenda y diagnósticos, y no cuenta en ningún cálculo. No se borra nada: sus proyectos, pagos,
              citas y diagnósticos se conservan. Podrás verlo en la lista «Desactivados» y reactivarlo cuando quieras.
            </DialogDescription>
          </DialogHeader>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="form-actions" style={{ justifyContent: "flex-end" }}>
            <button type="button" className={btn()} onClick={() => setOpen(false)} disabled={pending}>Cancelar</button>
            <button type="button" className={btn("primary")} onClick={() => run(false)} disabled={pending}>
              {pending ? "Desactivando…" : "Sí, desactivar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
