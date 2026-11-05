import FormShell from "@/components/FormShell";
import ConfirmDelete from "@/components/ConfirmDelete";
import { createPayrollAction, deletePayrollAction, updatePayrollAction } from "./actions";

export type PayrollInitial = {
  employee_id: string;
  kind: string;
  period: string; // YYYY-MM
  amount: string;
  currency: string;
  paid_date: string;
  account_id: string;
  notes: string;
};

export default function PayrollForm({
  id,
  initial,
  employees,
  accounts,
}: {
  id?: string;
  initial: PayrollInitial;
  employees: { id: string; name: string }[];
  accounts: { id: string; name: string; currency: string }[];
}) {
  return (
    <FormShell
      legend="Pago a empleado"
      action={id ? updatePayrollAction.bind(null, id) : createPayrollAction}
      submit={id ? "Guardar cambios" : "Registrar pago"}
      cancelHref="/finanzas/sueldos"
      extra={id && (
        <ConfirmDelete
          action={deletePayrollAction.bind(null, id)}
          title="¿Eliminar este pago?"
          text="Se borrará el registro y, si salió de una cuenta, se devolverá el monto a su saldo. No se puede deshacer."
          backHref="/finanzas/sueldos"
        />
      )}
    >
      <div className="grid-2">
        <div className="field">
          <label htmlFor="employee_id">Empleado *</label>
          <select id="employee_id" name="employee_id" required defaultValue={initial.employee_id}>
            <option value="">Elige un empleado</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="kind">Tipo *</label>
          <select id="kind" name="kind" defaultValue={initial.kind}>
            <option value="sueldo">Sueldo</option>
            <option value="bono">Bono</option>
            <option value="adelanto">Adelanto</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="period">Mes que corresponde *</label>
          <input id="period" name="period" type="month" required defaultValue={initial.period} />
        </div>
        <div className="field">
          <label htmlFor="paid_date">Fecha de pago *</label>
          <input id="paid_date" name="paid_date" type="date" required defaultValue={initial.paid_date} />
        </div>
        <div className="field">
          <label htmlFor="amount">Monto *</label>
          <input id="amount" name="amount" type="number" min="0.01" step="0.01" required defaultValue={initial.amount} className="mono" />
        </div>
        <div className="field">
          <label htmlFor="currency">Moneda *</label>
          <select id="currency" name="currency" defaultValue={initial.currency}>
            <option value="PEN">Soles (S/)</option>
            <option value="USD">Dólares (US$)</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="account_id">Pagado desde la cuenta</label>
        <select id="account_id" name="account_id" defaultValue={initial.account_id}>
          <option value="">— Sin cuenta (no descuenta saldo) —</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="notes">Notas</label>
        <textarea id="notes" name="notes" rows={2} defaultValue={initial.notes} />
      </div>
    </FormShell>
  );
}
