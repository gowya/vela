"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  HouseIcon,
  UsersIcon,
  ClipboardTextIcon,
  CalendarCheckIcon,
  UserIcon,
  CreditCardIcon,
  BellIcon,
  ChatCircleTextIcon,
  SignOutIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
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
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  userName: string;
  // Vrai tant qu'aucune offre payante n'existe : tout le monde est "freemium"
  // par défaut. À brancher sur le vrai statut d'abonnement une fois les
  // offres payantes en place.
  isFreemium?: boolean;
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

export function AppSidebar({ userName, isFreemium = true }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="flex-row items-center justify-center px-2 pt-1">
        <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarMenu className="gap-1 p-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton isActive={isActive} tooltip={label} render={<Link href={href} />}>
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
                {isFreemium && (
                  <>
                    <DropdownMenuItem
                      onClick={() => toast.info("Les abonnements arrivent bientôt.")}
                    >
                      <SparkleIcon size={14} />
                      Passer à l&apos;offre Pro
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem render={<Link href="/account" />}>
                  <UserIcon size={14} />
                  Compte
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account?tab=billing" />}>
                  <CreditCardIcon size={14} />
                  Facturation
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account?tab=notifications" />}>
                  <BellIcon size={14} />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account?tab=feedback" />}>
                  <ChatCircleTextIcon size={14} />
                  Retours
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
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
