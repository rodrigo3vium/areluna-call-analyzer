import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col bg-primary-900 px-7 pb-10 pt-9 text-cream md:flex">
        <div className="flex flex-col leading-tight">
          <span className="font-serif text-2xl font-light tracking-[0.32em] text-cream">
            ARELUNA
          </span>
          <span className="eyebrow mt-1 text-[10px] tracking-[0.18em] text-gold-500">
            ATLAS · COMERCIAL OS
          </span>
        </div>
        <SidebarNav />
      </aside>
      <main className="md:pl-[240px]">
        <div className="mx-auto min-h-screen max-w-[1400px] px-12 py-10">{children}</div>
      </main>
    </div>
  );
}
