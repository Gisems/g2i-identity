import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { todayLima } from "@/lib/format";
import { adminId } from "@/lib/team";
import AccountForm from "../AccountForm";

export default async function NuevaCuentaPage() {
  if (!(await adminId())) notFound();
  return (
    <>
      <Link href="/finanzas/cuenta" className="back"><ChevronLeft /> Cuenta</Link>
      <Topbar title="Crear cuenta" sub="La cuenta de la empresa para gastos y sueldos" />
      <AccountForm initial={{ name: "", currency: "PEN", opening_balance: "0", opening_date: todayLima(), receives_client_payments: true }} />
    </>
  );
}
