import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Panel, Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { updateDiagnosticAction } from "../actions";
import DiagnosticForm from "../DiagnosticForm";

type Point = { area?: string; priority?: string; finding?: string };

export default async function EditarDiagnosticoPage({ params }: PageProps<"/diagnosticos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: d } = await supabase.from("diagnostics").select("*, clients(name)").eq("id", id).maybeSingle();
  if (!d) notFound();

  const points = ((d.improvement_points ?? []) as Point[]).map((p) => ({
    area: p.area ?? "",
    priority: p.priority ?? "media",
    finding: p.finding ?? "",
  }));
  const clientName = (d.clients as { name: string } | null)?.name;

  return (
    <>
      <Link href="/diagnosticos" className="back"><ChevronLeft /> Diagnósticos</Link>
      <Topbar title="Editar diagnóstico" sub={clientName} />
      {d.request_notes && (
        <Panel title="Lo que escribió el cliente al solicitarlo">
          <div className="panel-body" style={{ whiteSpace: "pre-wrap" }}>{d.request_notes}</div>
        </Panel>
      )}
      <DiagnosticForm
        action={updateDiagnosticAction.bind(null, id)}
        clients={[]}
        editing
        clientName={clientName}
        initial={{
          client_id: d.client_id,
          analyzed_url: d.analyzed_url,
          status: d.status,
          requested_date: d.requested_date ?? "",
          delivered_date: d.delivered_date ?? "",
          overall_score: d.overall_score == null ? "" : String(d.overall_score),
          mockup_url: d.mockup_url ?? "",
          points,
        }}
      />
    </>
  );
}
