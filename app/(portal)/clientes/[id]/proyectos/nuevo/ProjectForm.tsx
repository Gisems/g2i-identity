"use client";

import { useActionState, useMemo, useState } from "react";
import CancelButton from "@/components/CancelButton";
import { btn } from "@/components/pv";
import { genInstallments, type Modality } from "@/lib/installments";
import { dateShort, money } from "@/lib/format";
import type { FormState } from "../actions";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

export default function ProjectForm({
  action,
  services,
  cancelHref,
  today,
  defaults,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  services: { id: string; name: string }[];
  cancelHref: string;
  today: string;
  defaults?: { title?: string; diagnosticId?: string };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [modality, setModality] = useState<Modality>("contado");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("3");
  const [firstDue, setFirstDue] = useState(today);
  const [currency, setCurrency] = useState("PEN");

  const preview = useMemo(() => {
    const a = Number(amount);
    if (!(a > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(firstDue)) return [];
    return genInstallments(modality, a, Number(count) || 1, firstDue);
  }, [modality, amount, count, firstDue]);

  const usesCount = modality === "cuotas" || modality === "recurrente";
  const total = preview.reduce((s, i) => s + i.amount, 0);

  return (
    <form action={formAction} style={{ maxWidth: 820 }}>
      {defaults?.diagnosticId && <input type="hidden" name="diagnostic_id" value={defaults.diagnosticId} />}

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset>
            <legend>Proyecto</legend>
            <Field id="title" label="Título *"><input id="title" name="title" required defaultValue={defaults?.title ?? ""} /></Field>
            <div className="grid-2">
              <Field id="service_id" label="Servicio *">
                <select id="service_id" name="service_id" required defaultValue="">
                  <option value="" disabled>Elige un servicio</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field id="status" label="Estado">
                <select id="status" name="status" defaultValue="propuesta">
                  <option value="propuesta">Propuesta</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="en_curso">En curso</option>
                </select>
              </Field>
              <Field id="start_date" label="Fecha de inicio"><input id="start_date" name="start_date" type="date" /></Field>
            </div>
            <Field id="description" label="Descripción"><textarea id="description" name="description" rows={2} /></Field>
          </fieldset>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset style={{ marginBottom: 0 }}>
            <legend>Plan de pago</legend>
            <div className="grid-2">
              <Field id="modality" label="Modalidad">
                <select id="modality" name="modality" value={modality} onChange={(e) => setModality(e.target.value as Modality)}>
                  <option value="contado">Contado (1 cuota)</option>
                  <option value="adelanto_saldo">Adelanto 50 % y saldo</option>
                  <option value="cuotas">En cuotas mensuales</option>
                  <option value="recurrente">Recurrente (mensual)</option>
                </select>
              </Field>
              <Field id="currency" label="Moneda">
                <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="PEN">Soles (PEN)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </Field>
              <Field id="amount" label={modality === "recurrente" ? "Monto de cada mes *" : "Monto total *"}>
                <input id="amount" name="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="mono" />
              </Field>
              {usesCount && (
                <Field id="count" label={modality === "recurrente" ? "Cantidad de meses" : "Cantidad de cuotas"}>
                  <input id="count" name="count" type="number" min="1" max="60" value={count} onChange={(e) => setCount(e.target.value)} className="mono" />
                </Field>
              )}
              <Field id="first_due" label="Primer vencimiento *">
                <input id="first_due" name="first_due" type="date" required value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
              </Field>
            </div>

            {preview.length > 0 && (
              <div className="summary" style={{ marginTop: 6, marginBottom: 0 }}>
                <strong>Así quedarán las cuotas · total {money(total, currency)}</strong>
                <ul>
                  {preview.map((i) => (
                    <li key={i.number}>
                      <span>{i.concept} <span className="muted">· vence {dateShort(i.due_date)}</span></span>
                      <span className="mono">{money(i.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </fieldset>
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : "Crear proyecto"}</button>
        <CancelButton href={cancelHref} />
      </div>
    </form>
  );
}
