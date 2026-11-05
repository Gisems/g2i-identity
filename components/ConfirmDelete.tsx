"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDrawerClose } from "@/components/DrawerShell";
import { btn } from "@/components/pv";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Botón "Eliminar" que pide confirmación en un modal. `action` es una server action ya enlazada al id. */
export default function ConfirmDelete({
  action,
  title,
  text,
  backHref,
}: {
  action: () => Promise<{ error?: string; ok?: boolean }>;
  title: string;
  text: string;
  backHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const close = useDrawerClose();

  function run() {
    setError("");
    start(async () => {
      const res = await action();
      if (res.error) return setError(res.error);
      if (close) close();
      else router.push(backHref);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" className={btn()} onClick={() => setOpen(true)}>Eliminar</button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="pv sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{text}</DialogDescription>
          </DialogHeader>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="form-actions" style={{ justifyContent: "flex-end" }}>
            <button type="button" className={btn()} onClick={() => setOpen(false)} disabled={pending}>Cancelar</button>
            <button type="button" className={btn("primary")} onClick={run} disabled={pending}>{pending ? "Eliminando…" : "Sí, eliminar"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
