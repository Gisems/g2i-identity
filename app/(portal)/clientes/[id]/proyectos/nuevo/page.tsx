import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { todayLima } from "@/lib/format";
import { createProjectAction } from "../actions";
import ProjectForm from "./ProjectForm";

export default async function NuevoProyectoPage({ params, searchParams }: PageProps<"/clientes/[id]/proyectos/nuevo">) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const [client, services] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", id).maybeSingle(),
    supabase.from("services").select("id, name").eq("active", true).order("name"),
  ]);
  if (!client.data) notFound();

  const diagnosticId = typeof sp.diagnostico === "string" ? sp.diagnostico : undefined;

  return (
    <>
      <Link href={`/clientes/${id}?tab=proyectos`} className="back"><ChevronLeft /> {client.data.name}</Link>
      <Topbar title="Nuevo proyecto" sub={`Cliente: ${client.data.name}`} />
      <ProjectForm
        action={createProjectAction.bind(null, id)}
        services={services.data ?? []}
        cancelHref={`/clientes/${id}?tab=proyectos`}
        today={todayLima()}
        defaults={{ diagnosticId }}
      />
    </>
  );
}
