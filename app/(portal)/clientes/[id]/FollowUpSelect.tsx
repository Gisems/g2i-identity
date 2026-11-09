"use client";

import { useState, useTransition } from "react";
import { setFollowUpAdminAction } from "../actions";

/** Selector del administrador que le hace seguimiento al cliente. Se guarda al elegir. */
export default function FollowUpSelect({
  clientId,
  current,
  admins,
}: {
  clientId: string;
  current: string | null;
  admins: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    const previous = value;
    setValue(next);
    setError("");
    startTransition(async () => {
      const res = await setFollowUpAdminAction(clientId, next || null);
      if (res.error) {
        setValue(previous);
        setError(res.error);
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
      <label htmlFor="follow-up-admin" className="hint" style={{ margin: 0 }}>Seguimiento</label>
      <select id="follow-up-admin" value={value} disabled={pending} onChange={(e) => onChange(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
        <option value="">Sin asignar</option>
        {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      {error && <span role="alert" className="late">{error}</span>}
    </div>
  );
}
