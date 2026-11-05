import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/clientes/[id]/proyectos/nuevo/page";

export default function Intercepted(props: PageProps<"/clientes/[id]/proyectos/nuevo">) {
  return (
    <DrawerShell title="Nuevo proyecto">
      <Page {...props} />
    </DrawerShell>
  );
}
