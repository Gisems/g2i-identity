import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/cuenta/[id]/page";

export default function Intercepted(props: PageProps<"/finanzas/cuenta/[id]">) {
  return (
    <DrawerShell title="Editar cuenta">
      <Page {...props} />
    </DrawerShell>
  );
}
