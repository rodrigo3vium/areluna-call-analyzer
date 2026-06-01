"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Sugestao = {
  lead_id: string;
  nome: string;
  telefone: string;
  confidence: number;
};

type Props = {
  callId: string;
  matchStatus: string;
  leadAtual: { id: string; nome: string; telefone: string } | null;
  sugestoes: Sugestao[];
};

export function MatchActions({ callId, matchStatus, sugestoes }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const podeConfirmar = ["pendente", "sugerido"].includes(matchStatus);
  const podeMarcarsemLead = matchStatus !== "sem_lead";

  async function executar(acao: string, lead_id?: string) {
    setLoading(true);
    try {
      await fetch(`/api/calls/${callId}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, lead_id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!podeConfirmar && !podeMarcarsemLead) return null;

  return (
    <div className="space-y-2">
      {sugestoes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Sugestões IA
          </p>
          {sugestoes.map((s) => (
            <div
              key={s.lead_id}
              className="flex items-center justify-between rounded-lg bg-slate-700/40 px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">{s.nome}</p>
                <p className="text-[10px] text-slate-500">
                  {s.telefone} · {Math.round(s.confidence * 100)}%
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-6 shrink-0 px-2 text-[10px]"
                onClick={() => executar("confirmar", s.lead_id)}
                disabled={loading}
              >
                Confirmar
              </Button>
            </div>
          ))}
        </div>
      )}

      {podeMarcarsemLead && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-slate-500 hover:text-slate-300"
          onClick={() => executar("sem_lead")}
          disabled={loading}
        >
          Marcar como sem lead
        </Button>
      )}
    </div>
  );
}
