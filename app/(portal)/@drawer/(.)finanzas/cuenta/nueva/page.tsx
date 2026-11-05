import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/cuenta/nueva/page";

export default function Intercepted() {
  return (
    <DrawerShell title="Crear cuenta">
      <Page />
    </DrawerShell>
  );
}
