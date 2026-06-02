"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Phone, Users, ScrollText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calls", href: "/calls", icon: Phone },
  { label: "Closers", href: "/closers", icon: Users },
  { label: "Rondas", href: "/rondas", icon: ScrollText },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
