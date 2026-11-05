"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, LayoutDashboard, LogOut, ScanSearch, Users, Wallet, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type Item = { label: string; href: string; icon: LucideIcon };

const menu: { label: string; items: Item[] }[] = [
  {
    label: "Principal",
    items: [
      { label: "Panel", href: "/", icon: LayoutDashboard },
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Agenda", href: "/agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Diagnósticos", href: "/diagnosticos", icon: ScanSearch },
      { label: "Pagos", href: "/pagos", icon: Wallet },
    ],
  },
];

export default function AppSidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-1">
        <Link href="/" aria-label="G2I digital, inicio" onClick={() => setOpenMobile(false)}>
          <BrandLogo variant="inverse" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {menu.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wide text-sidebar-foreground/50 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                      isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-4 group-data-[collapsible=icon]:px-1">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 group-data-[collapsible=icon]:flex-none">
            <UserAvatar name={name} tone="accent" className="size-9 text-sm" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">{role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
            aria-label="Cerrar sesión"
            className="ml-auto text-sidebar-foreground group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
