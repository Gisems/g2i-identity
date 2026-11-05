import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/cuenta/depositos/nuevo/page";

export default function Intercepted() {
  return (
    <DrawerShell title="Agregar depósito">
      <Page />
    </DrawerShell>
  );
}
