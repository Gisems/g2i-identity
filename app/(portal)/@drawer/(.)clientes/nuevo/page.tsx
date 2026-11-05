import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/clientes/nuevo/page";

export default function Intercepted() {
  return (
    <DrawerShell title="Nuevo cliente">
      <Page />
    </DrawerShell>
  );
}
