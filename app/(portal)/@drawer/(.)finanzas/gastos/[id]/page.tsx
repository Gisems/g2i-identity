import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/gastos/[id]/page";

export default function Intercepted(props: PageProps<"/finanzas/gastos/[id]">) {
  return (
    <DrawerShell title="Editar gasto">
      <Page {...props} />
    </DrawerShell>
  );
}
