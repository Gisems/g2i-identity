import FormShell from "@/components/FormShell";
import ConfirmDelete from "@/components/ConfirmDelete";
import { createDepositAction, deleteDepositAction, updateDepositAction } from "./actions";

export type DepositInitial = { account_id: string; amount: string; deposit_date: string; concept: string };

export default function DepositForm({ id, initial, accounts }: { id?: string; initial: DepositInitial; accounts: { id: string; name: string; currency: string }[] }) {
  return (
    <FormShell
      legend="Depósito"
      action={id ? updateDepositAction.bind(null, id) : createDepositAction}
      submit={id ? "Guardar cambios" : "Agregar depósito"}
      cancelHref="/finanzas/cuenta"
      extra={id && (
        <ConfirmDelete
          action={deleteDepositAction.bind(null, id)}
          title="¿Eliminar este depósito?"
          text="Se descontará del saldo de la cuenta. No se puede deshacer."
          backHref="/finanzas/cuenta"
        />
      )}
    >
      <div className="field">
        <label htmlFor="account_id">Cuenta *</label>
        <select id="account_id" name="account_id" required defaultValue={initial.account_id}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
        </select>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="amount">Monto *</label>
          <input id="amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={initial.amount} className="mono" />
        </div>
        <div className="field">
          <label htmlFor="deposit_date">Fecha *</label>
          <input id="deposit_date" name="deposit_date" type="date" required defaultValue={initial.deposit_date} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="concept">Motivo</label>
        <input id="concept" name="concept" defaultValue={initial.concept} placeholder="Ej. Aporte de socios, transferencia desde cuenta principal" />
      </div>
    </FormShell>
  );
}
