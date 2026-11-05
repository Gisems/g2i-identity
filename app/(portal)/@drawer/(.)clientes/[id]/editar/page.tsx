import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/clientes/[id]/editar/page";

export default function Intercepted(props: PageProps<"/clientes/[id]/editar">) {
  return (
    <DrawerShell title="Editar cliente">
      <Page {...props} />
    </DrawerShell>
  );
}
