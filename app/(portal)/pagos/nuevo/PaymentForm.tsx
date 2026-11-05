"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CancelButton from "@/components/CancelButton";
import { useDrawerClose } from "@/components/DrawerShell";
import { btn } from "@/components/pv";
import { dateShort, money } from "@/lib/format";
import { addPaymentAction, type PaymentState } from "../actions";

export type PendingInstallment = {
  id: string;
  concept: string | null;
  amount: number;
  due_date: string;
  project_id: string;
  project_title: string;
  currency: string;
  client_id: string;
  client_name: string;
};

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

export default function PaymentForm({ items, today }: { items: PendingInstallment[]; today: string }) {
  const router = useRouter();
  const close = useDrawerClose();
  const [state, action, pending] = useActionState<PaymentState, FormData>(addPaymentAction, {});
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    if (state.ok) (close ?? (() => router.push("/pagos")))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  const clients = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((i) => m.set(i.client_id, i.client_name));
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const projects = useMemo(() => {
    const m = new Map<string, string>();
    items.filter((i) => i.client_id === clientId).forEach((i) => m.set(i.project_id, i.project_title));
    return [...m].map(([id, title]) => ({ id, title }));
  }, [items, clientId]);

  const installments = items.filter((i) => i.project_id === projectId);

  return (
    <form action={action} style={{ maxWidth: 820 }}>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset>
            <legend>¿Qué se pagó?</legend>
            <div className="grid-3">
              <Field id="client" label="Cliente">
                <select id="client" value={clientId} onChange={(e) => { setClientId(e.target.value); setProjectId(""); }}>
                  <option value="">Elige un cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field id="project" label="Proyecto">
                <select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!clientId}>
                  <option value="">Elige un proyecto</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </Field>
              <Field id="installment_id" label="Cuota">
                <select id="installment_id" name="installment_id" required disabled={!projectId} defaultValue="" key={projectId}>
                  <option value="">Elige una cuota</option>
                  {installments.map((i) => (
                    <option key={i.id} value={i.id}>{i.concept ?? "Cuota"} · {money(i.amount, i.currency)} · vence {dateShort(i.due_date)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset style={{ marginBottom: 0 }}>
            <legend>Datos del pago</legend>
            <div className="grid-2">
              <Field id="paid_date" label="Fecha de pago *"><input id="paid_date" name="paid_date" type="date" required defaultValue={today} /></Field>
              <Field id="payment_method" label="Método *">
                <select id="payment_method" name="payment_method" defaultValue="transferencia">
                  <option value="transferencia">Transferencia</option>
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </Field>
            </div>
            <Field id="operation_number" label="Número de operación"><input id="operation_number" name="operation_number" className="mono" /></Field>
          </fieldset>
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : "Registrar pago"}</button>
        <CancelButton href="/pagos" />
      </div>
    </form>
  );
}
