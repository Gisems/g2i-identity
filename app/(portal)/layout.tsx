import { redirect } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { teamManagerId } from "@/lib/team";
import "../portal.css";

export default async function PortalLayout({ children, drawer }: { children: React.ReactNode; drawer: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Debe existir en public.users y estar activo (RLS ya lo exige para leer datos).
  const { data: perfil } = await supabase
    .from("users")
    .select("name, role, active")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil || !perfil.active) {
    await supabase.auth.signOut();
    redirect("/login?error=sin-acceso");
  }

  const canManageTeam = !!(await teamManagerId());

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
