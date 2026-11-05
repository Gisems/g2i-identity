import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { todayLima } from "@/lib/format";
import { adminId } from "@/lib/team";
import PayrollForm from "../PayrollForm";

export default async function NuevoPagoEmpleadoPage({ searchParams }: PageProps<"/finanzas/sueldos/nuevo">) {
  if (!(await adminId())) notFound();
  const sp = await searchParams;
  const today = todayLima();
  const supabase = await createClient();
  const [{ data: employees }, { data: accounts }] = await Promise.all([
    supabase.from("users").select("id, name").eq("active", true).order("name"),
    supabase.from("accounts").select("id, name, currency").eq("active", true).order("created_at"),
  ]);
  const acc = accounts ?? [];
  const period = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);

  return (
    <>
      <Link href="/finanzas/sueldos" className="back"><ChevronLeft /> Sueldos</Link>
      <Topbar title="Registrar pago a empleado" sub="Sueldo, bono o adelanto" />
      <PayrollForm
        employees={employees ?? []}
        accounts={acc}
        initial={{
          employee_id: typeof sp.empleado === "string" ? sp.empleado : "",
          kind: "sueldo",
          period,
          amount: "",
          currency: acc[0]?.currency ?? "PEN",
          paid_date: today,
          account_id: acc[0]?.id ?? "",
          notes: "",
        }}
      />
    </>
  );
}
