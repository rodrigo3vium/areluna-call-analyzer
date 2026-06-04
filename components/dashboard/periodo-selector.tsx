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
    <div className="flex gap-1 rounded-pill border border-border bg-sand p-1">
      {PERIODOS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          onClick={() => selecionar(p.value)}
          className={cn(
            "h-8 px-4 text-xs font-medium",
            atual === p.value
              ? "bg-primary-800 text-cream hover:bg-primary-800"
              : "text-muted-foreground hover:bg-gold-200 hover:text-foreground",
          )}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
