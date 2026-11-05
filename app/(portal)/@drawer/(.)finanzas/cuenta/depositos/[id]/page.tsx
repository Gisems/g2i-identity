import DrawerShell from "@/components/DrawerShell";
import Page from "@/app/(portal)/finanzas/cuenta/depositos/[id]/page";

export default function Intercepted(props: PageProps<"/finanzas/cuenta/depositos/[id]">) {
  return (
    <DrawerShell title="Editar depósito">
      <Page {...props} />
    </DrawerShell>
  );
}
