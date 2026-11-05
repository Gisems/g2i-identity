import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/sueldos/[id]/page";

export default function Intercepted(props: PageProps<"/finanzas/sueldos/[id]">) {
  return (
    <DrawerShell title="Editar pago">
      <Page {...props} />
    </DrawerShell>
  );
}
