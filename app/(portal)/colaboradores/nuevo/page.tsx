import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { teamManagerId } from "@/lib/team";
import CollaboratorForm from "../CollaboratorForm";

export default async function NuevoColaboradorPage() {
  if (!(await teamManagerId())) notFound();
  return (
    <>
      <Link href="/colaboradores" className="back"><ChevronLeft /> Colaboradores</Link>
      <Topbar title="Crear colaborador" sub="Crea la cuenta de un miembro del equipo" />
      <CollaboratorForm />
    </>
  );
}
