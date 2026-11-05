"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import CancelButton from "@/components/CancelButton";
import { useDrawerClose } from "@/components/DrawerShell";
import { btn } from "@/components/pv";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { deleteExpenseAction, type FormState } from "./actions";

export type ExpenseInitial = {
  concept: string;
  category: string;
  amount: string;
  currency: string;
  expense_date: string;
  platform: string;
  paid_by: string;
  account_id: string;
  expires_on: string;
  notes: string;
};


function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function DeleteExpense({ id, concept, onDone }: { id: string; concept: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run() {
    setError("");
    start(async () => {
      const res = await deleteExpenseAction(id);
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <>
      <button type="button" className={btn()} onClick={() => setOpen(true)}>Eliminar</button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="pv sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar este gasto?</DialogTitle>
            <DialogDescription>«{concept}» se borrará y dejará de contar en el balance. No se puede deshacer.</DialogDescription>
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

export default function ExpenseForm({
  action,
  initial,
  expenseId,
  users,
  accounts,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: ExpenseInitial;
  expenseId?: string;
  users: { id: string; name: string }[];
  accounts: { id: string; name: string; currency: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const router = useRouter();
  const close = useDrawerClose();
  const done = () => {
    if (close) close();
    else router.push("/finanzas");
    router.refresh();
  };

  useEffect(() => {
    if (state.ok) done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} style={{ maxWidth: 560 }}>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset style={{ marginBottom: 0 }}>
            <legend>Gasto</legend>
            <Field id="concept" label="Motivo del gasto *">
              <input id="concept" name="concept" required defaultValue={initial.concept} placeholder="Ej. Dominio g2i.pe, Google Ads" />
            </Field>
            <Field id="platform" label="Plataforma o proveedor">
              <input id="platform" name="platform" defaultValue={initial.platform} placeholder="Ej. GoDaddy, Namecheap, Meta Ads" />
            </Field>
            <div className="grid-2">
              <Field id="category" label="Categoría *">
                <select id="category" name="category" defaultValue={initial.category}>
                  {Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field id="paid_by" label="Realizado por">
                <select id="paid_by" name="paid_by" defaultValue={initial.paid_by}>
                  <option value="">— Sin indicar —</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field id="amount" label="Monto *">
                <input id="amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={initial.amount} className="mono" />
              </Field>
              <Field id="currency" label="Moneda *">
                <select id="currency" name="currency" defaultValue={initial.currency}>
                  <option value="PEN">Soles (S/)</option>
                  <option value="USD">Dólares (US$)</option>
                </select>
              </Field>
            </div>
            <div className="grid-2">
              <Field id="expense_date" label="Fecha en que se realizó *">
                <input id="expense_date" name="expense_date" type="date" required defaultValue={initial.expense_date} />
              </Field>
              <Field id="expires_on" label="Vence">
                <input id="expires_on" name="expires_on" type="date" defaultValue={initial.expires_on} />
              </Field>
            </div>
            <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>Si el gasto se renueva (dominio, hosting, licencia), indica cuándo vence para verlo en los próximos vencimientos.</p>
            {accounts.length > 0 && (
              <Field id="account_id" label="Pagado desde la cuenta">
                <select id="account_id" name="account_id" defaultValue={initial.account_id}>
                  <option value="">— Sin cuenta (no descuenta saldo) —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                </select>
              </Field>
            )}
            <Field id="notes" label="Notas">
              <textarea id="notes" name="notes" rows={3} defaultValue={initial.notes} />
            </Field>
          </fieldset>
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : expenseId ? "Guardar cambios" : "Agregar gasto"}</button>
        <CancelButton href="/finanzas" />
        {expenseId && <DeleteExpense id={expenseId} concept={initial.concept} onDone={done} />}
      </div>
    </form>
  );
}
