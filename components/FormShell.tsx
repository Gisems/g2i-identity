"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CancelButton from "@/components/CancelButton";
import { useDrawerClose } from "@/components/DrawerShell";
import { btn } from "@/components/pv";

export type ShellState = { error?: string; ok?: boolean };

/** Formulario estándar del portal: panel con campos, error, Guardar/Cancelar y cierre del panel lateral al guardar. */
export default function FormShell({
  action,
  submit,
  cancelHref,
  legend,
  children,
  extra,
}: {
  action: (prev: ShellState, fd: FormData) => Promise<ShellState>;
  submit: string;
  cancelHref: string;
  legend: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<ShellState, FormData>(action, {});
  const router = useRouter();
  const close = useDrawerClose();

  useEffect(() => {
    if (state.ok) {
      if (close) close();
      else router.push(cancelHref);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} style={{ maxWidth: 560 }}>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset style={{ marginBottom: 0 }}>
            <legend>{legend}</legend>
            {children}
          </fieldset>
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : submit}</button>
        <CancelButton href={cancelHref} />
        {extra}
      </div>
    </form>
  );
}
