import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { isoToLimaLocal } from "@/lib/format";
import { updateAppointmentAction } from "../actions";
import AppointmentForm from "../AppointmentForm";

export default async function EditarCitaPage({ params }: PageProps<"/agenda/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [appt, clients] = await Promise.all([
    supabase.from("appointments").select("*").eq("id", id).maybeSingle(),
    supabase.from("clients").select("id, name").order("name"),
  ]);
  if (!appt.data) notFound();
  const a = appt.data;

  return (
    <>
      <Link href="/agenda" className="back"><ChevronLeft /> Agenda</Link>
      <Topbar title="Editar cita" sub={a.title} />
      <AppointmentForm
        action={updateAppointmentAction.bind(null, id)}
        clients={clients.data ?? []}
        editing
        initial={{
          client_id: a.client_id,
          title: a.title,
          type: a.type,
          start_at: isoToLimaLocal(a.start_at),
          end_at: isoToLimaLocal(a.end_at),
          modality: a.modality,
          location_or_link: a.location_or_link ?? "",
          status: a.status,
          notes: a.notes ?? "",
        }}
      />
    </>
  );
}
