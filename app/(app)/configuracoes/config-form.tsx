"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Configuracoes = {
  nome_clinica: string;
  destinatarios_calls: string[];
  threshold_score_baixo: number;
};

export function ConfigForm({ config }: { config: Configuracoes }) {
  const [form, setForm] = useState({
    nome_clinica: config.nome_clinica,
    destinatarios_calls: config.destinatarios_calls.join(", "),
    threshold_score_baixo: String(config.threshold_score_baixo),
  });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const router = useRouter();

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setOk(false);
    try {
      const res = await fetch("/api/configuracoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_clinica: form.nome_clinica.trim(),
          destinatarios_calls: form.destinatarios_calls
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          threshold_score_baixo: Number(form.threshold_score_baixo),
        }),
      });
      if (res.ok) {
        setOk(true);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  function field(key: keyof typeof form, label: string, hint?: string) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          className="h-8 border-border bg-surface text-xs"
        />
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      {field("nome_clinica", "Nome da empresa")}
      {field("destinatarios_calls", "Destinatários — Ronda Calls", "Separados por vírgula")}
      {field(
        "threshold_score_baixo",
        "Threshold score baixo (dashboard)",
        "Score abaixo deste valor é destacado em vermelho",
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={loading}>
          {loading ? "Salvando…" : "Salvar configurações"}
        </Button>
        {ok && <span className="text-xs text-success">Salvo ✓</span>}
      </div>
    </form>
  );
}
