import FormShell from "@/components/FormShell";
import { createAccountAction, updateAccountAction } from "./actions";

export type AccountInitial = { name: string; currency: string; opening_balance: string; opening_date: string; receives_client_payments: boolean };

export default function AccountForm({ id, initial }: { id?: string; initial: AccountInitial }) {
  return (
    <FormShell
      legend="Cuenta"
      action={id ? updateAccountAction.bind(null, id) : createAccountAction}
      submit={id ? "Guardar cambios" : "Crear cuenta"}
      cancelHref="/finanzas/cuenta"
    >
      <div className="field">
        <label htmlFor="name">Nombre *</label>
        <input id="name" name="name" required defaultValue={initial.name} placeholder="Ej. Cuenta G2I gastos" />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="currency">Moneda *</label>
          <select id="currency" name="currency" defaultValue={initial.currency}>
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares (US$)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="opening_balance">Saldo inicial</label>
          <input id="opening_balance" name="opening_balance" type="number" step="0.01" defaultValue={initial.opening_balance} className="mono" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="opening_date">Contar movimientos desde *</label>
        <input id="opening_date" name="opening_date" type="date" required defaultValue={initial.opening_date} />
      </div>
      <p className="hint" style={{ marginTop: -6, marginBottom: 14 }}>
        El saldo inicial es lo que había en la cuenta en esa fecha. Solo cuentan los depósitos, gastos, sueldos y cobros desde ese día.
      </p>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        <input type="checkbox" name="receives_client_payments" defaultChecked={initial.receives_client_payments} />
        Esta cuenta recibe los cobros de clientes (suma las cuotas pagadas en la misma moneda)
      </label>
    </FormShell>
  );
}
