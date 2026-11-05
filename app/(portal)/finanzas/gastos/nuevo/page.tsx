import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { todayLima } from "@/lib/format";
import { createExpenseAction } from "../../actions";
import ExpenseForm from "../../ExpenseForm";

export default async function NuevoGastoPage() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: users }, { data: accounts }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("users").select("id, name").eq("active", true).order("name"),
    supabase.from("accounts").select("id, name, currency").eq("active", true).order("created_at"),
  ]);
  return (
    <>
      <Link href="/finanzas" className="back"><ChevronLeft /> Finanzas</Link>
      <Topbar title="Agregar gasto" sub="Registra un gasto de la empresa" />
      <ExpenseForm
        action={createExpenseAction}
        users={users ?? []}
        accounts={accounts ?? []}
        initial={{ concept: "", category: "otro", amount: "", currency: accounts?.[0]?.currency ?? "PEN", expense_date: todayLima(), platform: "", paid_by: user?.id ?? "", account_id: accounts?.[0]?.id ?? "", expires_on: "", notes: "" }}
      />
    </>
  );
}
