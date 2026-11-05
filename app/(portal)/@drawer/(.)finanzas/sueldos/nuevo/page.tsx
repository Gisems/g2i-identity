import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/sueldos/nuevo/page";

export default function Intercepted(props: PageProps<"/finanzas/sueldos/nuevo">) {
  return (
    <DrawerShell title="Registrar pago a empleado">
      <Page {...props} />
    </DrawerShell>
  );
}
