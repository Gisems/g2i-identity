import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser, needsMfa } from "@/lib/session";
import "../portal.css";

export default async function PortalLayout({ children, drawer }: { children: React.ReactNode; drawer: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (await needsMfa()) redirect("/verificar-2fa");

  // Debe existir en public.users y estar activo (RLS ya lo exige para leer datos).
  const perfil = await getProfile();
  if (!perfil || !perfil.active) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?error=sin-acceso");
  }

  const canManageTeam = perfil.role === "admin";

  return (
    <SidebarProvider>
      <AppSidebar name={perfil.name} role={perfil.role} canManageTeam={canManageTeam} />
      <SidebarInset className="pv-shell">
        <header className="flex items-center gap-3 border-b bg-background px-4 py-2 md:px-7">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
        </header>
        <main className="pv pv-main flex-1">{children}</main>
        {drawer}
      </SidebarInset>
    </SidebarProvider>
  );
}
