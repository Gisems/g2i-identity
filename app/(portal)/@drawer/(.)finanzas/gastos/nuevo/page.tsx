import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/gastos/nuevo/page";

export default function Intercepted() {
  return (
    <DrawerShell title="Agregar gasto">
      <Page />
    </DrawerShell>
  );
}
