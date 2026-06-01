"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Configuracoes = {
  nome_clinica: string;
  destinatarios_whatsapp: string[];
  destinatarios_calls: string[];
  threshold_score_baixo: number;
  threshold_alerta_imediato_whatsapp: number;
  janela_analise_mensagens: number;
};

export function ConfigForm({ config }: { config: Configuracoes }) {
  const [form, setForm] = useState({
    nome_clinica: config.nome_clinica,
    destinatarios_whatsapp: config.destinatarios_whatsapp.join(", "),
    destinatarios_calls: config.destinatarios_calls.join(", "),
    threshold_score_baixo: String(config.threshold_score_baixo),
    threshold_alerta_imediato_whatsapp: String(config.threshold_alerta_imediato_whatsapp),
    janela_analise_mensagens: String(config.janela_analise_mensagens),
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
          destinatarios_whatsapp: form.destinatarios_whatsapp
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          destinatarios_calls: form.destinatarios_calls
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          threshold_score_baixo: Number(form.threshold_score_baixo),
          threshold_alerta_imediato_whatsapp: Number(form.threshold_alerta_imediato_whatsapp),
          janela_analise_mensagens: Number(form.janela_analise_mensagens),
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
        <Label className="text-xs text-slate-400">{label}</Label>
        <Input
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          className="h-8 border-slate-700 bg-slate-900 text-xs"
        />
        {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      {field("nome_clinica", "Nome da clínica")}
      {field("destinatarios_whatsapp", "Destinatários — Ronda WhatsApp", "Separados por vírgula")}
      {field("destinatarios_calls", "Destinatários — Ronda Calls", "Separados por vírgula")}
      {field(
        "threshold_score_baixo",
        "Threshold score baixo (dashboard)",
        "Score abaixo deste valor é destacado em vermelho",
      )}
      {field(
        "threshold_alerta_imediato_whatsapp",
        "Threshold alerta imediato WhatsApp",
        "Score abaixo deste valor dispara email imediato",
      )}
      {field(
        "janela_analise_mensagens",
        "Janela de análise (nº de mensagens)",
        "Quantas mensagens recentes enviar para a IA",
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" className="h-8 text-xs" disabled={loading}>
          {loading ? "Salvando…" : "Salvar configurações"}
        </Button>
        {ok && <span className="text-xs text-emerald-400">Salvo ✓</span>}
      </div>
    </form>
  );
}
