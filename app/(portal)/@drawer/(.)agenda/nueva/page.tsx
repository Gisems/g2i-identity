import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/agenda/nueva/page";

export default function Intercepted(props: PageProps<"/agenda/nueva">) {
  return (
    <DrawerShell title="Agregar cita">
      <Page {...props} />
    </DrawerShell>
  );
}
