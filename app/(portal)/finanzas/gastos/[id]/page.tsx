import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { adminId } from "@/lib/team";
import { updateExpenseAction } from "../../actions";
import ExpenseForm from "../../ExpenseForm";

export default async function EditarGastoPage({ params }: PageProps<"/finanzas/gastos/[id]">) {
  if (!(await adminId())) notFound();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: e }, { data: users }, { data: accounts }] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", id).maybeSingle(),
    supabase.from("users").select("id, name").order("name"),
    supabase.from("accounts").select("id, name, currency").order("created_at"),
  ]);
  if (!e) notFound();

  return (
    <>
      <Link href="/finanzas" className="back"><ChevronLeft /> Finanzas</Link>
      <Topbar title="Editar gasto" sub={e.concept} />
      <ExpenseForm
        action={updateExpenseAction.bind(null, id)}
        expenseId={id}
        users={users ?? []}
        accounts={accounts ?? []}
        initial={{
          concept: e.concept,
          category: e.category,
          amount: String(e.amount),
          currency: e.currency,
          expense_date: e.expense_date,
          platform: e.platform ?? "",
          paid_by: e.paid_by ?? "",
          account_id: e.account_id ?? "",
          expires_on: e.expires_on ?? "",
          notes: e.notes ?? "",
        }}
      />
    </>
  );
}
