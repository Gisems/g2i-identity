import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { adminId } from "@/lib/team";
import DepositForm from "../../DepositForm";

export default async function EditarDepositoPage({ params }: PageProps<"/finanzas/cuenta/depositos/[id]">) {
  if (!(await adminId())) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: d }, { data: accounts }] = await Promise.all([
    supabase.from("account_deposits").select("*").eq("id", id).maybeSingle(),
    supabase.from("accounts").select("id, name, currency").order("created_at"),
  ]);
  if (!d) notFound();
  return (
    <>
      <Link href="/finanzas/cuenta" className="back"><ChevronLeft /> Cuenta</Link>
      <Topbar title="Editar depósito" sub={d.concept ?? undefined} />
      <DepositForm
        id={id}
        accounts={accounts ?? []}
        initial={{ account_id: d.account_id, amount: String(d.amount), deposit_date: d.deposit_date, concept: d.concept ?? "" }}
      />
    </>
  );
}
