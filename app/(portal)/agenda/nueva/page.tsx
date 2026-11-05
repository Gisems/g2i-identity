import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { createAppointmentAction } from "../actions";
import AppointmentForm from "../AppointmentForm";

export default async function NuevaCitaPage({ searchParams }: PageProps<"/agenda/nueva">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("id, name").neq("status", "inactivo").order("name");

  return (
    <>
      <Link href="/agenda" className="back"><ChevronLeft /> Agenda</Link>
      <Topbar title="Agregar cita" sub="Agenda una reunión con un cliente o prospecto" />
      <AppointmentForm
        action={createAppointmentAction}
        clients={clients ?? []}
        editing={false}
        initial={{
          client_id: typeof sp.cliente === "string" ? sp.cliente : "",
          title: "",
          type: "reunion_inicial",
          start_at: "",
          end_at: "",
          modality: "videollamada",
          location_or_link: "",
          status: "agendada",
          notes: "",
        }}
      />
    </>
  );
}
