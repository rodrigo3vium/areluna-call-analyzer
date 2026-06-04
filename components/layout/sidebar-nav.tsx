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
    <nav className="mt-12 flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 border-l-2 px-4 py-3 text-[13px] font-medium transition-colors",
              active
                ? "border-gold-500 bg-white/5 text-cream"
                : "border-transparent text-cream/70 hover:bg-white/5 hover:text-cream",
            )}
          >
            <Icon
              className={cn("h-4 w-4 shrink-0 [stroke-width:1.6]", active && "text-gold-500")}
              aria-hidden
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
