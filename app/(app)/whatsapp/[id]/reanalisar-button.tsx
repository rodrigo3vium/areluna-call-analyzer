"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ReanalisarButton({ conversaId }: { conversaId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function reanalisar() {
    setLoading(true);
    try {
      await fetch(`/api/conversas/${conversaId}/reanalisar`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={reanalisar} disabled={loading} className="text-xs">
      {loading ? "Analisando…" : "Re-analisar"}
    </Button>
  );
}
