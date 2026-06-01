"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ORIGENS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" },
  { value: "organico", label: "Orgânico" },
  { value: "whatsapp_ativo", label: "WA ativo" },
  { value: "outro", label: "Outro" },
  { value: "desconhecido", label: "Desconhecido" },
] as const;

type Mensagem = {
  conteudo: string | null;
  remetente: string;
  enviada_em: string;
};

type Props = {
  lead: {
    id: string;
    nome: string;
    telefone: string;
    primeirasMensagens: Mensagem[];
    sugestaoIA: { origem_detectada: string | null; origem_confidence: number | null } | null;
  };
};

export function ClassificarCard({ lead }: Props) {
  const [loading, setLoading] = useState(false);
  const [classificado, setClassificado] = useState(false);
  const router = useRouter();

  async function classificar(origem: string) {
    setLoading(true);
    try {
      await fetch(`/api/leads/${lead.id}/classificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origem }),
      });
      setClassificado(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (classificado) return null;

  const sugestao = lead.sugestaoIA;
  const confidence = sugestao?.origem_confidence
    ? Math.round(Number(sugestao.origem_confidence) * 100)
    : null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">{lead.nome}</p>
          <p className="text-xs text-slate-500">{lead.telefone}</p>
        </div>
        {sugestao?.origem_detectada && (
          <div className="text-right">
            <p className="text-[10px] text-slate-500">Sugestão IA</p>
            <p className="text-xs font-medium text-cyan-300">{sugestao.origem_detectada}</p>
            {confidence && <p className="text-[10px] text-slate-500">{confidence}% confiança</p>}
          </div>
        )}
      </div>

      {/* Primeiras mensagens */}
      {lead.primeirasMensagens.length > 0 && (
        <div className="mb-3 space-y-1 rounded-lg bg-slate-700/30 p-2.5">
          {lead.primeirasMensagens.map((m, i) => (
            <p key={i} className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">
                {m.remetente === "lead" ? "Lead" : "Clínica"}:
              </span>{" "}
              {m.conteudo ?? "[mídia]"}
            </p>
          ))}
        </div>
      )}

      {/* Botões de classificação */}
      <div className="flex flex-wrap gap-1.5">
        {sugestao?.origem_detectada && (
          <Button
            size="sm"
            className="h-7 bg-cyan-600 px-3 text-xs hover:bg-cyan-500"
            onClick={() => classificar(sugestao.origem_detectada!)}
            disabled={loading}
          >
            ✓ {sugestao.origem_detectada}
          </Button>
        )}
        {ORIGENS.filter((o) => o.value !== sugestao?.origem_detectada).map((o) => (
          <Button
            key={o.value}
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            onClick={() => classificar(o.value)}
            disabled={loading}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
