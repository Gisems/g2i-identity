import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge, Empty, Panel, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";
import { teamManagerId } from "@/lib/team";
import { setCollaboratorActiveAction } from "./actions";
import { fail } from "@/lib/errors";

const ROLE: Record<string, string> = { admin: "Administrador", ventas: "Ventas", dev: "Desarrollo", "diseño": "Diseño" };

export default async function ColaboradoresPage() {
  const me = await teamManagerId();
  if (!me) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.from("users").select("id, name, email, role, active, created_at").order("created_at");
  const rows = data ?? [];
  const activos = rows.filter((r) => r.active).length;

  return (
    <>
      <Topbar
        title="Colaboradores"
        sub={`${activos} activo${activos === 1 ? "" : "s"}`}
        actions={<Link href="/colaboradores/nuevo" className={btn("cta")}><Plus /> Crear colaborador</Link>}
      />
      {error && <div className="form-error" role="alert">{fail("No se pudo cargar", error)}</div>}
      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Alta</th><th>Estado</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong>{u.id === me && " (tú)"}</td>
                  <td>{u.email}</td>
                  <td>{ROLE[u.role] ?? u.role}</td>
                  <td>{dateShort(u.created_at)}</td>
                  <td><Badge tone={u.active ? "ok" : "neutral"}>{u.active ? "Activo" : "Desactivado"}</Badge></td>
                  <td style={{ textAlign: "right" }}>
                    {u.id !== me && u.role !== "admin" && (
                      <form action={setCollaboratorActiveAction.bind(null, u.id, !u.active)}>
                        <button type="submit" className={btn("small")}>{u.active ? "Desactivar" : "Activar"}</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <Empty title="Aún no hay colaboradores" text="Crea la primera cuenta del equipo." />}
        </div>
      </Panel>
    </>
  );
}
