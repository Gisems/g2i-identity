import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/agenda/[id]/page";

export default function Intercepted(props: PageProps<"/agenda/[id]">) {
  return (
    <DrawerShell title="Editar cita">
      <Page {...props} />
    </DrawerShell>
  );
}
