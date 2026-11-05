import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Topbar } from "@/components/pv";
import { createClient } from "@/lib/supabase/server";
import { todayLima } from "@/lib/format";
import PaymentForm, { type PendingInstallment } from "./PaymentForm";

type Raw = {
  id: string;
  concept: string | null;
  amount: number;
  due_date: string;
  payments: { projects: { id: string; title: string; currency: string; clients: { id: string; name: string } } };
};

export default async function AgregarPagoPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installments")
    .select("id, concept, amount, due_date, payments!inner(projects!inner(id, title, currency, clients!inner(id, name)))")
    .eq("status", "pendiente")
    .order("due_date");

  const back = <Link href="/pagos" className="back"><ChevronLeft /> Pagos</Link>;

  if (error) {
    return (
      <>
        {back}
        <div className="form-error" role="alert">No se pudieron cargar las cuotas: {error.message}</div>
      </>
    );
  }

  const items: PendingInstallment[] = ((data ?? []) as unknown as Raw[]).map((r) => ({
    id: r.id,
    concept: r.concept,
    amount: Number(r.amount),
    due_date: r.due_date,
    project_id: r.payments.projects.id,
    project_title: r.payments.projects.title,
    currency: r.payments.projects.currency,
    client_id: r.payments.projects.clients.id,
    client_name: r.payments.projects.clients.name,
  }));

  return (
    <>
      {back}
      <Topbar title="Agregar pago" sub="Registra el pago de una cuota pendiente" />
      {items.length === 0 ? (
        <EmptyState
          title="No hay cuotas pendientes"
          text="Los pagos se registran contra la cuota de un proyecto. Crea un proyecto con su plan de pago desde la ficha de un cliente y sus cuotas aparecerán aquí."
          href="/clientes"
          action="Ir a clientes"
        />
      ) : (
        <PaymentForm items={items} today={todayLima()} />
      )}
    </>
  );
}
