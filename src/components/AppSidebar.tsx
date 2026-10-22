"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  HouseIcon,
  UsersIcon,
  ClipboardTextIcon,
  CalendarCheckIcon,
  UserIcon,
  ChatCircleTextIcon,
  SignOutIcon,
} from "@phosphor-icons/react";
import { Logo } from "@/components/ui/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  userName: string;
}

const navItems = [
  { href: "/", label: "Tableau de bord", icon: HouseIcon },
  { href: "/appointments", label: "Rendez-vous", icon: CalendarCheckIcon },
  { href: "/patients", label: "Patients", icon: UsersIcon },
  { href: "/consultations", label: "Consultations", icon: ClipboardTextIcon },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

// Les entrées Facturation, Notifications et « Passer à l'offre Pro » sont
// retirées du menu tant que ces fonctionnalités n'existent pas : elles
// menaient à des écrans vides ou à un simple « bientôt ».
export function AppSidebar({ userName }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // Sur mobile la barre est un panneau par-dessus la page : on le referme
  // dès qu'on choisit une destination.
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="flex-row items-center justify-between gap-2 px-3 pt-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <Link
          href="/"
          onClick={closeOnMobile}
          aria-label="Vela, tableau de bord"
          className="flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 group-data-[collapsible=icon]:hidden"
        >
          <Logo size={44} />
        </Link>
        <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarMenu className="gap-1 p-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={label}
                  render={<Link href={href} onClick={closeOnMobile} />}
                >
                  <Icon size={18} weight={isActive ? "fill" : "regular"} />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton />}>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[0.6rem] font-medium text-sidebar-primary-foreground">
                  {getInitials(userName)}
                </span>
                <span className="truncate">{userName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuItem render={<Link href="/account" onClick={closeOnMobile} />}>
                  <UserIcon size={14} />
                  Compte
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href="/account?tab=feedback" onClick={closeOnMobile} />}
                >
                  <ChatCircleTextIcon size={14} />
                  Retours
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <SignOutIcon size={14} />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

// Sous 768px la barre latérale est masquée : cette barre en haut de page est
// le seul accès à la navigation.
export function AppMobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
      <SidebarTrigger aria-label="Ouvrir le menu" className="size-10 text-foreground" />
      <Link
        href="/"
        aria-label="Vela, tableau de bord"
        className="flex rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <Logo size={40} />
      </Link>
    </header>
  );
}
