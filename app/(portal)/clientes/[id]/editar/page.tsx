import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import ClientForm, { type ClientInitial } from "../../ClientForm";
import { updateClientAction } from "../../actions";
import { createClient } from "@/lib/supabase/server";

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();

  const [client, reps, details] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("representatives").select("*").eq("client_id", id).order("created_at"),
    supabase.from("client_details").select("*").eq("client_id", id).maybeSingle(),
  ]);
  if (!client.data) notFound();
  const c = client.data;
  const d = details.data;

  const initial: ClientInitial = {
    name: c.name,
    trade_name: c.trade_name,
    ruc: c.ruc,
    phone: c.phone,
    email: c.email,
    city: c.city,
    status: c.status,
    source: c.source,
    industry: d?.industry ?? null,
    current_website: d?.current_website ?? null,
    drive_folder_url: d?.drive_folder_url ?? null,
    description: d?.description ?? null,
    reps: (reps.data ?? []).map((r) => ({ id: r.id, name: r.name, job_title: r.job_title, phone: r.phone, is_primary: r.is_primary })),
    colors: ((d?.brand_colors ?? []) as { name: string; hex: string }[]).map((x) => ({ name: x.name, hex: x.hex })),
  };

  return (
    <>
      <Link href={`/clientes/${id}`} className="back"><ChevronLeft /> {c.name}</Link>
      <Topbar title="Editar cliente" sub={c.name} />
      <ClientForm
        action={updateClientAction.bind(null, id)}
        initial={initial}
        submitLabel="Guardar cambios"
        cancelHref={`/clientes/${id}`}
      />
    </>
  );
}
