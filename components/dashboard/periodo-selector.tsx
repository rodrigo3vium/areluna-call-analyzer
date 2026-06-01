"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERIODOS = [
  { label: "7 dias", value: "7" },
  { label: "30 dias", value: "30" },
  { label: "90 dias", value: "90" },
] as const;

export function PeriodoSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const atual = searchParams.get("dias") ?? "7";

  function selecionar(dias: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dias", dias);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800/60 p-1">
      {PERIODOS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          onClick={() => selecionar(p.value)}
          className={cn(
            "h-7 px-3 text-xs font-medium",
            atual === p.value
              ? "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
              : "text-slate-400 hover:text-slate-200",
          )}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
