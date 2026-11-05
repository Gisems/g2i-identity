import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/diagnosticos/nuevo/page";

export default function Intercepted(props: PageProps<"/diagnosticos/nuevo">) {
  return (
    <DrawerShell title="Agregar diagnóstico">
      <Page {...props} />
    </DrawerShell>
  );
}
