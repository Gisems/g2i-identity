"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { btn } from "@/components/pv";
import { saveInstallmentAction, type PaymentState } from "./actions";

export type InstallmentRow = {
  id: string;
  concept: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  payment_method: string | null;
  operation_number: string | null;
};

function Form({ row, today, onDone }: { row: InstallmentRow; today: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(saveInstallmentAction.bind(null, row.id), {});

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action}>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="paid_date">Fecha de pago</label>
          <input id="paid_date" name="paid_date" type="date" defaultValue={row.paid_date ?? today} />
        </div>
        <div className="field">
          <label htmlFor="payment_method">Método</label>
          <select id="payment_method" name="payment_method" defaultValue={row.payment_method ?? "transferencia"}>
            <option value="transferencia">Transferencia</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="efectivo">Efectivo</option>
            <option value="otro">Otro</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="operation_number">Número de operación</label>
        <input id="operation_number" name="operation_number" className="mono" defaultValue={row.operation_number ?? ""} />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="amount">Monto</label>
          <input id="amount" name="amount" type="number" min="0" step="0.01" required defaultValue={row.amount} className="mono" />
        </div>
        <div className="field">
          <label htmlFor="due_date">Vencimiento</label>
          <input id="due_date" name="due_date" type="date" required defaultValue={row.due_date} />
        </div>
      </div>
      <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>Deja la fecha de pago vacía para dejar la cuota como pendiente.</p>
      {state.error && <div className="form-error" role="alert">{state.error}</div>}
      <div className="form-actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" className={btn()} onClick={onDone}>Cancelar</button>
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export default function PaymentDialog({ row, today, label, primary }: { row: InstallmentRow; today: string; label: string; primary?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={btn("small", ...(primary ? ["primary"] : []))} onClick={() => setOpen(true)}>{label}</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="pv sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{row.paid_date ? "Editar pago" : "Registrar pago"}</DialogTitle>
            <DialogDescription>{row.concept ?? "Cuota"}</DialogDescription>
          </DialogHeader>
          {open && <Form row={row} today={today} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
