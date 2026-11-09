"use client";

import { useActionState, useState } from "react";
import CancelButton from "@/components/CancelButton";
import { Plus, X } from "lucide-react";
import { btn } from "@/components/pv";
import type { FormState } from "./actions";

export type ClientInitial = {
  name: string;
  trade_name: string | null;
  ruc: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  status: string;
  industry: string | null;
  current_website: string | null;
  drive_folder_url: string | null;
  description: string | null;
  reps: { id: string; name: string; job_title: string | null; phone: string | null; is_primary: boolean }[];
  colors: { name: string; hex: string }[];
};

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

type Rep = { key: number; id: string; name: string; job_title: string; phone: string };
type Color = { key: number; name: string; hex: string };

export default function ClientForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: ClientInitial;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const editing = Boolean(initial);

  const [reps, setReps] = useState<Rep[]>(
    initial?.reps.length
      ? initial.reps.map((r, i) => ({ key: i, id: r.id, name: r.name, job_title: r.job_title ?? "", phone: r.phone ?? "" }))
      : [{ key: 0, id: "", name: "", job_title: "", phone: "" }],
  );
  const [primary, setPrimary] = useState(Math.max(0, initial?.reps.findIndex((r) => r.is_primary) ?? 0));
  const [colors, setColors] = useState<Color[]>(
    initial?.colors.length ? initial.colors.map((c, i) => ({ key: 1000 + i, ...c })) : [{ key: 1000, name: "", hex: "#004952" }],
  );
  const [nextKey, setNextKey] = useState(2000);

  return (
    <form action={formAction} style={{ maxWidth: 820 }}>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset>
            <legend>Datos de la empresa</legend>
            <Field id="name" label="Nombre / razón social *">
              <input id="name" name="name" required defaultValue={initial?.name} />
            </Field>
            <div className="grid-2">
              <Field id="trade_name" label="Nombre comercial"><input id="trade_name" name="trade_name" defaultValue={initial?.trade_name ?? ""} /></Field>
              <Field id="ruc" label="RUC">
                <input id="ruc" name="ruc" className="mono" inputMode="numeric" maxLength={11} pattern="\d{11}" title="11 dígitos" defaultValue={initial?.ruc ?? ""} />
              </Field>
              <Field id="phone" label="Teléfono"><input id="phone" name="phone" type="tel" defaultValue={initial?.phone ?? ""} /></Field>
              <Field id="email" label="Correo"><input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} /></Field>
              <Field id="city" label="Ciudad"><input id="city" name="city" defaultValue={initial?.city ?? ""} /></Field>
              <Field id="status" label="Estado">
                <select id="status" name="status" defaultValue={initial?.status ?? "prospecto"}>
                  <option value="prospecto">Prospecto</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Desactivado</option>
                  <option value="perdido">Perdido</option>
                </select>
              </Field>
            </div>
          </fieldset>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <h2>Representantes</h2>
          <button type="button" className={btn("small")} onClick={() => { setReps([...reps, { key: nextKey, id: "", name: "", job_title: "", phone: "" }]); setNextKey(nextKey + 1); }}>
            <Plus /> Agregar
          </button>
        </div>
        <div className="panel-body">
          {reps.map((r, i) => (
            <div key={r.key} className="rep-row">
              <input type="hidden" name="rep_id" value={r.id} />
              <div className="grid-3">
                <Field id={`rn${r.key}`} label="Nombre"><input id={`rn${r.key}`} name="rep_name" defaultValue={r.name} /></Field>
                <Field id={`rj${r.key}`} label="Cargo"><input id={`rj${r.key}`} name="rep_job_title" defaultValue={r.job_title} /></Field>
                <Field id={`rp${r.key}`} label="Teléfono"><input id={`rp${r.key}`} name="rep_phone" type="tel" defaultValue={r.phone} /></Field>
              </div>
              <div className="field inline" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <label>
                  <input type="radio" name="rep_primary" value={i} checked={primary === i} onChange={() => setPrimary(i)} />
                  Representante principal
                </label>
                {/* Los ya guardados no se quitan desde aquí: borrar es solo de administradores. */}
                {!r.id && reps.length > 1 && (
                  <button
                    type="button"
                    className={btn("ghost", "small")}
                    onClick={() => { setReps(reps.filter((x) => x.key !== r.key)); if (primary >= reps.length - 1) setPrimary(0); }}
                  >
                    <X /> Quitar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <fieldset>
            <legend>Marca y web</legend>
            <div className="grid-2">
              <Field id="industry" label="Rubro"><input id="industry" name="industry" defaultValue={initial?.industry ?? ""} /></Field>
              <Field id="current_website" label="Web actual">
                <input id="current_website" name="current_website" type="url" placeholder="https://" defaultValue={initial?.current_website ?? ""} />
              </Field>
            </div>
            <Field id="drive_folder_url" label="Carpeta de Drive (logos y material)">
              <input id="drive_folder_url" name="drive_folder_url" type="url" placeholder="https://drive.google.com/…" defaultValue={initial?.drive_folder_url ?? ""} />
            </Field>
            <Field id="description" label="Descripción">
              <textarea id="description" name="description" rows={3} defaultValue={initial?.description ?? ""} />
            </Field>
          </fieldset>

          <fieldset style={{ marginBottom: 0 }}>
            <legend>Colores de marca</legend>
            {colors.map((c) => (
              <div key={c.key} className="color-row">
                <input name="color_name" placeholder="Nombre (ej. Primario)" aria-label="Nombre del color" defaultValue={c.name} />
                <input name="color_hex" type="color" defaultValue={c.hex} aria-label="Color" />
                {colors.length > 1 && (
                  <button type="button" className={btn("ghost", "small")} aria-label="Quitar color" onClick={() => setColors(colors.filter((x) => x.key !== c.key))}>
                    <X />
                  </button>
                )}
              </div>
            ))}
            <button type="button" className={btn("small")} onClick={() => { setColors([...colors, { key: nextKey, name: "", hex: "#004952" }]); setNextKey(nextKey + 1); }}>
              <Plus /> Agregar color
            </button>
          </fieldset>
        </div>
      </section>

      {state.error && <div className="form-error" role="alert">{state.error}</div>}

      <div className="form-actions">
        <button type="submit" className={btn("cta")} disabled={pending}>{pending ? "Guardando…" : submitLabel}</button>
        <CancelButton href={cancelHref} />
      </div>
      {editing && <p className="hint" style={{ marginTop: 12 }}>Para quitar un representante ya guardado, pídeselo a un administrador.</p>}
    </form>
  );
}
