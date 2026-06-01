"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EmailTesteButton() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  async function enviar() {
    setLoading(true);
    setResultado(null);
    try {
      const res = await fetch("/api/configuracoes/email-teste", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; message: string };
      setResultado({ ok: data.ok, msg: data.message });
    } catch {
      setResultado({ ok: false, msg: "Erro de rede" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        onClick={enviar}
        disabled={loading}
      >
        {loading ? "Enviando…" : "Enviar email de teste"}
      </Button>
      {resultado && (
        <span className={`text-xs ${resultado.ok ? "text-emerald-400" : "text-red-400"}`}>
          {resultado.msg}
        </span>
      )}
    </div>
  );
}
