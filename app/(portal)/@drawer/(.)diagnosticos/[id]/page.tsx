import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/diagnosticos/[id]/page";

export default function Intercepted(props: PageProps<"/diagnosticos/[id]">) {
  return (
    <DrawerShell title="Editar diagnóstico">
      <Page {...props} />
    </DrawerShell>
  );
}
