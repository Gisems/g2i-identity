import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { adminId } from "@/lib/team";
import PayrollForm from "../PayrollForm";

export default async function EditarPagoEmpleadoPage({ params }: PageProps<"/finanzas/sueldos/[id]">) {
  if (!(await adminId())) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: p }, { data: employees }, { data: accounts }] = await Promise.all([
    supabase.from("payroll_payments").select("*").eq("id", id).maybeSingle(),
    supabase.from("users").select("id, name").order("name"),
    supabase.from("accounts").select("id, name, currency").order("created_at"),
  ]);
  if (!p) notFound();
  return (
    <>
      <Link href="/finanzas/sueldos" className="back"><ChevronLeft /> Sueldos</Link>
      <Topbar title="Editar pago" />
      <PayrollForm
        id={id}
        employees={employees ?? []}
        accounts={accounts ?? []}
        initial={{
          employee_id: p.employee_id,
          kind: p.kind,
          period: String(p.period).slice(0, 7),
          amount: String(p.amount),
          currency: p.currency,
          paid_date: p.paid_date,
          account_id: p.account_id ?? "",
          notes: p.notes ?? "",
        }}
      />
    </>
  );
}
