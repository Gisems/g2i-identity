import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { todayLima } from "@/lib/format";
import { updateProjectAction } from "../../actions";
import ProjectForm from "../../nuevo/ProjectForm";

export default async function EditarProyectoPage({ params }: PageProps<"/clientes/[id]/proyectos/[projectId]/editar">) {
  const { id, projectId } = await params;
  const supabase = await createClient();

  const [client, project] = await Promise.all([
    supabase.from("clients").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("projects")
      .select("id, title, description, status, start_date, services, payments(id)")
      .eq("id", projectId)
      .eq("client_id", id)
      .maybeSingle(),
  ]);
  if (!client.data || !project.data) notFound();
  const p = project.data;

  return (
    <>
      <Link href={`/clientes/${id}?tab=proyectos`} className="back"><ChevronLeft /> {client.data.name}</Link>
      <Topbar title="Editar proyecto" sub={`Cliente: ${client.data.name}`} />
      <ProjectForm
        action={updateProjectAction.bind(null, id, projectId)}
        cancelHref={`/clientes/${id}?tab=proyectos`}
        today={todayLima()}
        submitLabel="Guardar cambios"
        hasPlan={Boolean(p.payments)}
        initial={{
          title: p.title,
          services: (p.services ?? []) as string[],
          status: p.status,
          description: p.description ?? "",
          start_date: p.start_date ?? "",
        }}
      />
    </>
  );
}
