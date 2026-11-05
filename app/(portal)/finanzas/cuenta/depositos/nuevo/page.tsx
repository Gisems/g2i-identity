import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Empty, Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { todayLima } from "@/lib/format";
import { adminId } from "@/lib/team";
import DepositForm from "../../DepositForm";

export default async function NuevoDepositoPage() {
  if (!(await adminId())) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("accounts").select("id, name, currency").eq("active", true).order("created_at");
  const accounts = data ?? [];
  return (
    <>
      <Link href="/finanzas/cuenta" className="back"><ChevronLeft /> Cuenta</Link>
      <Topbar title="Agregar depósito" sub="Dinero que entra a la cuenta de la empresa" />
      {accounts.length === 0 ? (
        <Empty title="Primero crea una cuenta" href="/finanzas/cuenta/nueva" action="Crear cuenta" />
      ) : (
        <DepositForm accounts={accounts} initial={{ account_id: accounts[0].id, amount: "", deposit_date: todayLima(), concept: "" }} />
      )}
    </>
  );
}
