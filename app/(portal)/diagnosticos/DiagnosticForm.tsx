"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CancelButton from "@/components/CancelButton";
import { useDrawerClose } from "@/components/DrawerShell";
import { Plus, X } from "lucide-react";
import { btn } from "@/components/pv";
import type { FormState } from "./actions";

export type DiagnosticInitial = {
  client_id: string;
  analyzed_url: string;
  status: string;
  requested_date: string;
  delivered_date: string;
  overall_score: string;
  mockup_url: string;
  points: { area: string; priority: string; finding: string }[];
};

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

type Point = { key: number; area: string; priority: string; finding: string };

export default function DiagnosticForm({
  action,
  clients,
  initial,
  editing,
  clientName,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  clients: { id: string; name: string }[];
  initial: DiagnosticInitial;
  editing: boolean;
  clientName?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const router = useRouter();
  const close = useDrawerClose();

  useEffect(() => {
    if (state.ok) (close ?? (() => router.push("/diagnosticos")))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);
  const [clientId, setClientId] = useState(initial.client_id);
  const [points, setPoints] = useState<Point[]>(
    initial.points.length
      ? initial.points.map((p, i) => ({ key: i, ...p }))
      : [{ key: 0, area: "", priority: "media", finding: "" }],
  );
  const [nextKey, setNextKey] = useState(1000);

  return (
    <form action={formAction} style={{ maxWidth: 820 }}>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset>
            <legend>Diagnóstico</legend>
            {editing ? (
              <div className="field">
                <label>Cliente</label>
                <div>{clientName}</div>
              </div>
            ) : (
              <div className="grid-2">
                <Field id="client_id" label="Cliente existente">
                  <select id="client_id" name="client_id" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">— Es un cliente nuevo —</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                {!clientId && (
                  <Field id="new_client_name" label="Nombre del cliente nuevo *">
                    <input id="new_client_name" name="new_client_name" placeholder="Queda como prospecto" />
                  </Field>
                )}
              </div>
            )}
            <Field id="analyzed_url" label="URL analizada *">
              <input id="analyzed_url" name="analyzed_url" required placeholder="https://" defaultValue={initial.analyzed_url} />
            </Field>
            <div className="grid-2">
              <Field id="status" label="Estado">
                <select id="status" name="status" defaultValue={initial.status}>
                  <option value="solicitado">Solicitado</option>
                  <option value="en_analisis">En análisis</option>
                  <option value="entregado">Entregado</option>
                  {initial.status === "convertido" && <option value="convertido">Convertido</option>}
                  <option value="descartado">Descartado</option>
                </select>
              </Field>
              <Field id="overall_score" label="Puntaje (0–100)">
                <input id="overall_score" name="overall_score" type="number" min="0" max="100" step="1" defaultValue={initial.overall_score} className="mono" />
              </Field>
              <Field id="requested_date" label="Fecha de solicitud"><input id="requested_date" name="requested_date" type="date" defaultValue={initial.requested_date} /></Field>
              <Field id="delivered_date" label="Fecha de entrega"><input id="delivered_date" name="delivered_date" type="date" defaultValue={initial.delivered_date} /></Field>
            </div>
            <Field id="mockup_url" label="Link de la propuesta visual">
              <input id="mockup_url" name="mockup_url" type="url" placeholder="https://" defaultValue={initial.mockup_url} />
            </Field>
          </fieldset>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h2>Hallazgos</h2>
          <button type="button" className={btn("small")} onClick={() => { setPoints([...points, { key: nextKey, area: "", priority: "media", finding: "" }]); setNextKey(nextKey + 1); }}>
            <Plus /> Agregar hallazgo
          </button>
        </div>
        <div className="panel-body">
          {points.map((p) => (
            <div key={p.key} className="hallazgo">
              <input name="point_area" placeholder="Área (SEO, Velocidad…)" aria-label="Área" defaultValue={p.area} />
              <select name="point_priority" aria-label="Prioridad" defaultValue={p.priority}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <input name="point_finding" placeholder="Qué se encontró" aria-label="Hallazgo" defaultValue={p.finding} />
              {points.length > 1 ? (
                <button type="button" className={btn("ghost", "small")} aria-label="Quitar hallazgo" onClick={() => setPoints(points.filter((x) => x.key !== p.key))}>
                  <X />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear diagnóstico"}</button>
        <CancelButton href="/diagnosticos" />
      </div>
    </form>
  );
}
