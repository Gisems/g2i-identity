import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/colaboradores/nuevo/page";

export default function Intercepted() {
  return (
    <DrawerShell title="Crear colaborador">
      <Page />
    </DrawerShell>
  );
}
