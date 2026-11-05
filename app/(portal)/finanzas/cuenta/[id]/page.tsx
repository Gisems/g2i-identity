import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { adminId } from "@/lib/team";
import AccountForm from "../AccountForm";

export default async function EditarCuentaPage({ params }: PageProps<"/finanzas/cuenta/[id]">) {
  if (!(await adminId())) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from("accounts").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();
  return (
    <>
      <Link href="/finanzas/cuenta" className="back"><ChevronLeft /> Cuenta</Link>
      <Topbar title="Editar cuenta" sub={a.name} />
      <AccountForm
        id={id}
        initial={{
          name: a.name,
          currency: a.currency,
          opening_balance: String(a.opening_balance),
          opening_date: a.opening_date,
          receives_client_payments: a.receives_client_payments,
        }}
      />
    </>
  );
}
