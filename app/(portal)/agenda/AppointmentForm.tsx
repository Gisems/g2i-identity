"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CancelButton from "@/components/CancelButton";
import { useDrawerClose } from "@/components/DrawerShell";
import { btn } from "@/components/pv";
import type { FormState } from "./actions";

export type AppointmentInitial = {
  client_id: string;
  title: string;
  type: string;
  start_at: string; // YYYY-MM-DDTHH:mm, hora de Lima
  end_at: string;
  modality: string;
  location_or_link: string;
  status: string;
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

export default function AppointmentForm({
  action,
  clients,
  initial,
  editing,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  clients: { id: string; name: string }[];
  initial: AppointmentInitial;
  editing: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const router = useRouter();
  const close = useDrawerClose();

  useEffect(() => {
    if (state.ok) (close ?? (() => router.push("/agenda")))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} style={{ maxWidth: 820 }}>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <div className="grid-2">
            <Field id="client_id" label="Cliente *">
              <select id="client_id" name="client_id" required defaultValue={initial.client_id}>
                <option value="" disabled>Elige un cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field id="type" label="Tipo">
              <select id="type" name="type" defaultValue={initial.type}>
                <option value="reunion_inicial">Reunión inicial</option>
                <option value="presentacion_diagnostico">Presentación de diagnóstico</option>
                <option value="propuesta">Propuesta</option>
                <option value="revision_avance">Revisión de avance</option>
                <option value="entrega">Entrega</option>
                <option value="capacitacion">Capacitación</option>
                <option value="soporte">Soporte</option>
                <option value="cobranza">Cobranza</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
          </div>
          <Field id="title" label="Título *"><input id="title" name="title" required defaultValue={initial.title} /></Field>
          <div className="grid-2">
            <Field id="start_at" label="Inicio (hora de Lima) *">
              <input id="start_at" name="start_at" type="datetime-local" required defaultValue={initial.start_at} />
            </Field>
            <Field id="end_at" label="Fin"><input id="end_at" name="end_at" type="datetime-local" defaultValue={initial.end_at} /></Field>
            <Field id="modality" label="Modalidad">
              <select id="modality" name="modality" defaultValue={initial.modality}>
                <option value="videollamada">Videollamada</option>
                <option value="presencial">Presencial</option>
                <option value="llamada">Llamada</option>
              </select>
            </Field>
            <Field id="location_or_link" label="Lugar o link">
              <input id="location_or_link" name="location_or_link" defaultValue={initial.location_or_link} placeholder="https://meet.google.com/…" />
            </Field>
            {editing && (
              <Field id="status" label="Estado">
                <select id="status" name="status" defaultValue={initial.status}>
                  <option value="agendada">Agendada</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="realizada">Realizada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="reprogramada">Reprogramada</option>
                  <option value="no_asistio">No asistió</option>
                </select>
              </Field>
            )}
          </div>
          <Field id="notes" label="Notas"><textarea id="notes" name="notes" rows={3} defaultValue={initial.notes} /></Field>
          {editing && <p className="hint">Al marcarla como realizada, se registra sola en los seguimientos del cliente.</p>}
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear cita"}</button>
        <CancelButton href="/agenda" />
      </div>
    </form>
  );
}
