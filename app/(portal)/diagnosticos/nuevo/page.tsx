import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { todayLima } from "@/lib/format";
import { createDiagnosticAction } from "../actions";
import DiagnosticForm from "../DiagnosticForm";

export default async function NuevoDiagnosticoPage({ searchParams }: PageProps<"/diagnosticos/nuevo">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").order("name");

  return (
    <>
      <Link href="/diagnosticos" className="back"><ChevronLeft /> Diagnósticos</Link>
      <Topbar title="Agregar diagnóstico" sub="Análisis de la web actual, puntos de mejora y propuesta visual" />
      <DiagnosticForm
        action={createDiagnosticAction}
        clients={clients ?? []}
        editing={false}
        initial={{
          client_id: typeof sp.cliente === "string" ? sp.cliente : "",
          analyzed_url: "",
          status: "solicitado",
          requested_date: todayLima(),
          delivered_date: "",
          overall_score: "",
          mockup_url: "",
          points: [],
        }}
      />
    </>
  );
}
