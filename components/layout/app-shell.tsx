import { Activity } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Atlas OS</span>
            <span className="text-xs text-muted-foreground">Comercial</span>
          </div>
        </div>
        <SidebarNav />
      </aside>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
