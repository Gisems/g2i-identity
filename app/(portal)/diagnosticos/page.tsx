import Link from "next/link";
import { Plus } from "lucide-react";
import { Chips, DIAGNOSTIC_STATUS, Empty, Panel, Stats, StatusBadge, Topbar, btn } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { dateShort } from "@/lib/format";

type Row = {
  id: string;
  analyzed_url: string;
  requested_date: string;
  status: string;
  overall_score: number | null;
  improvement_points: unknown[];
  converted_project_id: string | null;
  clients: { id: string; name: string };
};

const scoreTone = (n: number) => (n >= 70 ? "ok" : n >= 40 ? "warn" : "bad");

export default async function DiagnosticosPage({ searchParams }: PageProps<"/diagnosticos">) {
  const sp = await searchParams;
  const filter = typeof sp.f === "string" ? sp.f : "todos";

  const supabase = await createClient();
  const [diag, follow] = await Promise.all([
    supabase
      .from("diagnostics")
      .select("id, analyzed_url, requested_date, status, overall_score, improvement_points, converted_project_id, clients!inner(id, name)")
      .neq("clients.status", "inactivo")
      .order("requested_date", { ascending: false }),
    supabase.from("follow_ups").select("diagnostic_id").not("diagnostic_id", "is", null),
  ]);

  const all = (diag.data ?? []) as unknown as Row[];
  const followCount = new Map<string, number>();
  for (const f of follow.data ?? []) followCount.set(f.diagnostic_id, (followCount.get(f.diagnostic_id) ?? 0) + 1);

  const inProgress = (d: Row) => d.status === "solicitado" || d.status === "en_analisis";
  const n = (fn: (d: Row) => boolean) => all.filter(fn).length;
  const delivered = n((d) => ["entregado", "convertido", "descartado"].includes(d.status));
  const converted = n((d) => d.status === "convertido");

  const chips: [string, string, number][] = [
    ["todos", "Todos", all.length],
    ["curso", "En curso", n(inProgress)],
    ["entregado", "Entregados", n((d) => d.status === "entregado")],
    ["convertido", "Convertidos", converted],
    ["descartado", "Descartados", n((d) => d.status === "descartado")],
  ];

  const rows = all.filter((d) => filter === "todos" || (filter === "curso" ? inProgress(d) : d.status === filter));
  const error = diag.error ?? follow.error;

  return (
    <>
      <Topbar
        title="Diagnósticos gratuitos"
        sub="Análisis de la web actual, puntos de mejora y propuesta visual"
        actions={<Link href="/diagnosticos/nuevo" className={btn("cta")}><Plus /> Agregar diagnóstico</Link>}
      />

      <Stats
        items={[
          [String(all.length), "Solicitados"],
          [String(n(inProgress)), "Por entregar"],
          [String(delivered), "Entregados"],
          [`${Math.round((converted / Math.max(1, delivered)) * 100)}%`, "Se convirtieron en proyecto"],
        ]}
      />

      {error && <div className="form-error" role="alert">No se pudieron cargar los diagnósticos: {error.message}</div>}

      <Panel>
        <div className="filters">
          <Chips items={chips} current={filter} href={(f) => `/diagnosticos?f=${f}`} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Web analizada</th>
                <th>Solicitado</th>
                <th>Puntaje</th>
                <th className="num">Hallazgos</th>
                <th className="num">Seguimientos</th>
                <th>Estado</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const canConvert = !d.converted_project_id && d.status !== "descartado" && d.status !== "convertido";
                return (
                  <tr key={d.id} className="clickable">
                    <td className="cell-main"><Link href={`/clientes/${d.clients.id}`}>{d.clients.name}</Link></td>
                    <td className="mono" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.analyzed_url}</td>
                    <td>{dateShort(d.requested_date)}</td>
                    <td>
                      {d.overall_score == null ? (
                        <span className="muted">—</span>
                      ) : (
                        <div className="score">
                          <div className={`bar ${scoreTone(d.overall_score)}`} role="img" aria-label={`Puntaje ${d.overall_score} de 100`}>
                            <i style={{ width: `${d.overall_score}%` }} />
                          </div>
                          <span>{d.overall_score}</span>
                        </div>
                      )}
                    </td>
                    <td className="num">{d.improvement_points?.length ?? 0}</td>
                    <td className="num">{followCount.get(d.id) ?? 0}</td>
                    <td><StatusBadge map={DIAGNOSTIC_STATUS} value={d.status} /></td>
                    <td>
                      <div className="row-actions">
                        {canConvert && (
                          <Link href={`/clientes/${d.clients.id}/proyectos/nuevo?diagnostico=${d.id}`} className={btn("small", "primary")}>
                            Convertir en proyecto
                          </Link>
                        )}
                        <Link href={`/diagnosticos/${d.id}`} className={btn("small")}>Editar</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <Empty
              title={all.length === 0 ? "Aún no hay diagnósticos" : "No hay diagnósticos con ese estado"}
              text="Los diagnósticos gratuitos que registres aparecerán aquí, con su puntaje y sus hallazgos."
              href={all.length === 0 ? "/diagnosticos/nuevo" : undefined}
              action={all.length === 0 ? "Agregar diagnóstico" : undefined}
            />
          )}
        </div>
      </Panel>
    </>
  );
}
