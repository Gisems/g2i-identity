import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import ClientForm from "../ClientForm";
import { createClientAction } from "../actions";

export default function NuevoClientePage() {
  return (
    <>
      <Link href="/clientes" className="back"><ChevronLeft /> Clientes</Link>
      <Topbar title="Nuevo cliente" sub="Registra una empresa, sus contactos y su marca" />
      <ClientForm action={createClientAction} submitLabel="Guardar cliente" cancelHref="/clientes" />
    </>
  );
}
