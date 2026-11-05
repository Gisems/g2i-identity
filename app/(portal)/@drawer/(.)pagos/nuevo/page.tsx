import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/pagos/nuevo/page";

export default function Intercepted() {
  return (
    <DrawerShell title="Agregar pago">
      <Page />
    </DrawerShell>
  );
}
