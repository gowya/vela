"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseIcon, UsersIcon, ClipboardTextIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userName: string;
}

const navItems = [
  { href: "/", label: "Tableau de bord", icon: HouseIcon },
  { href: "/patients", label: "Patients", icon: UsersIcon },
  { href: "/consultations", label: "Suivi consultations", icon: ClipboardTextIcon },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export function AppSidebar({ userName }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-5 my-5 ml-5 flex h-[calc(100dvh-2.5rem)] w-20 shrink-0 flex-col items-center gap-8 rounded-2xl bg-background py-6 shadow-sm ring-1 ring-foreground/10">
      <Link
        href="/account"
        aria-label="Paramètres du compte"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-transform duration-200 hover:scale-105 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {getInitials(userName)}
      </Link>

      <nav className="flex flex-col items-center gap-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="group flex w-16 flex-col items-center gap-1 rounded-xl py-1 text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="relative flex h-8 w-14 items-center justify-center">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-full bg-accent transition-all duration-300 ease-out",
                    isActive
                      ? "scale-100 opacity-100"
                      : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-60"
                  )}
                />
                <Icon
                  size={20}
                  weight={isActive ? "fill" : "regular"}
                  className={cn(
                    "relative z-10 transition-colors duration-200",
                    isActive && "text-accent-foreground"
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-center text-[0.65rem] leading-tight transition-colors duration-200",
                  isActive && "font-medium text-foreground"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
