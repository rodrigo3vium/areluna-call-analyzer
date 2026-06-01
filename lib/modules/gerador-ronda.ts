import type { SupabaseClient } from "@supabase/supabase-js";
import { log } from "@/lib/log";

export type TipoRonda = "whatsapp" | "calls";

export type SnapshotWhatsapp = {
  tipo: "whatsapp";
  periodo: { inicio: string; fim: string };
  total_conversas: number;
  score_medio: number | null;
  score_mais_alto: number | null;
  score_mais_baixo: number | null;
  distribuicao_score: { faixa: string; total: number }[];
  top_tags_negativas: { tag: string; total: number }[];
  top_tags_positivas: { tag: string; total: number }[];
  conversas_criticas: {
    conversa_id: string;
    lead_nome: string | null;
    score: number;
    resumo: string | null;
  }[];
  origens: { origem: string; total: number }[];
};

export type SnapshotCalls = {
  tipo: "calls";
  periodo: { inicio: string; fim: string };
  total_calls: number;
  score_medio: number | null;
  distribuicao_classificacao: { classificacao: string; total: number }[];
  media_por_fase: Record<string, number | null>;
  calls_insuficientes: {
    call_id: string;
    lead_nome: string | null;
    score: number;
    diagnostico: string | null;
  }[];
};

export type ResultadoGeracaoRonda = {
  tipo: TipoRonda;
  rondaId: string;
  vazia: boolean;
};

export async function gerarRonda(
  tipo: TipoRonda,
  periodoInicio: Date,
  periodoFim: Date,
  supabase: SupabaseClient,
): Promise<ResultadoGeracaoRonda> {
  const inicio = periodoInicio.toISOString();
  const fim = periodoFim.toISOString();

  const snapshot =
    tipo === "whatsapp"
      ? await gerarSnapshotWhatsapp(inicio, fim, supabase)
      : await gerarSnapshotCalls(inicio, fim, supabase);

  const vazia =
    tipo === "whatsapp"
      ? (snapshot as SnapshotWhatsapp).total_conversas === 0
      : (snapshot as SnapshotCalls).total_calls === 0;

  const { data: ronda } = await supabase
    .schema("comercial")
    .from("rondas")
    .upsert(
      {
        tipo,
        periodo_inicio: inicio,
        periodo_fim: fim,
        snapshot,
        vazia,
        status: "gerada",
      },
      { onConflict: "tipo,periodo_inicio", ignoreDuplicates: false },
    )
    .select("id")
    .single()
    .throwOnError();

  log.info("gerador_ronda.gerado", { tipo, inicio, fim, vazia, rondaId: ronda!.id });

  return { tipo, rondaId: ronda!.id, vazia };
}

async function gerarSnapshotWhatsapp(
  inicio: string,
  fim: string,
  supabase: SupabaseClient,
): Promise<SnapshotWhatsapp> {
  const { data: analises } = await supabase
    .schema("comercial")
    .from("analises_whatsapp")
    .select(
      `
      score,
      tags_positivas,
      tags_negativas,
      resumo,
      origem_detectada,
      conversa_id,
      conversas!inner(lead_id, leads(nome))
    `,
    )
    .gte("created_at", inicio)
    .lte("created_at", fim);

  if (!analises?.length) {
    return {
      tipo: "whatsapp",
      periodo: { inicio, fim },
      total_conversas: 0,
      score_medio: null,
      score_mais_alto: null,
      score_mais_baixo: null,
      distribuicao_score: [],
      top_tags_negativas: [],
      top_tags_positivas: [],
      conversas_criticas: [],
      origens: [],
    };
  }

  const scores = analises.map((a) => Number(a.score));
  const scoreMedio = scores.reduce((a, b) => a + b, 0) / scores.length;

  const faixas = [
    { faixa: "0-30", min: 0, max: 30 },
    { faixa: "31-50", min: 31, max: 50 },
    { faixa: "51-70", min: 51, max: 70 },
    { faixa: "71-85", min: 71, max: 85 },
    { faixa: "86-100", min: 86, max: 100 },
  ];

  const distribuicao_score = faixas.map(({ faixa, min, max }) => ({
    faixa,
    total: scores.filter((s) => s >= min && s <= max).length,
  }));

  const tagCount = (field: "tags_positivas" | "tags_negativas") => {
    const counts: Record<string, number> = {};
    analises.forEach((a) => {
      (a[field] as string[]).forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, total]) => ({ tag, total }));
  };

  const conversas_criticas = analises
    .filter((a) => Number(a.score) < 40)
    .sort((a, b) => Number(a.score) - Number(b.score))
    .slice(0, 5)
    .map((a) => {
      const conv = a.conversas as unknown as {
        lead_id: string | null;
        leads: { nome: string } | null;
      } | null;
      return {
        conversa_id: a.conversa_id as string,
        lead_nome: conv?.leads?.nome ?? null,
        score: Number(a.score),
        resumo: a.resumo as string | null,
      };
    });

  const origemCount: Record<string, number> = {};
  analises.forEach((a) => {
    const o = (a.origem_detectada as string | null) ?? "desconhecida";
    origemCount[o] = (origemCount[o] ?? 0) + 1;
  });
  const origens = Object.entries(origemCount)
    .sort((a, b) => b[1] - a[1])
    .map(([origem, total]) => ({ origem, total }));

  return {
    tipo: "whatsapp",
    periodo: { inicio, fim },
    total_conversas: analises.length,
    score_medio: Math.round(scoreMedio * 10) / 10,
    score_mais_alto: Math.max(...scores),
    score_mais_baixo: Math.min(...scores),
    distribuicao_score,
    top_tags_negativas: tagCount("tags_negativas"),
    top_tags_positivas: tagCount("tags_positivas"),
    conversas_criticas,
    origens,
  };
}

async function gerarSnapshotCalls(
  inicio: string,
  fim: string,
  supabase: SupabaseClient,
): Promise<SnapshotCalls> {
  const { data: analises } = await supabase
    .schema("comercial")
    .from("analises_calls")
    .select(
      `
      score_geral,
      classificacao,
      fases,
      diagnostico,
      call_id,
      calls!inner(lead_id, leads(nome))
    `,
    )
    .gte("created_at", inicio)
    .lte("created_at", fim);

  if (!analises?.length) {
    return {
      tipo: "calls",
      periodo: { inicio, fim },
      total_calls: 0,
      score_medio: null,
      distribuicao_classificacao: [],
      media_por_fase: {},
      calls_insuficientes: [],
    };
  }

  const scores = analises.map((a) => Number(a.score_geral));
  const scoreMedio = scores.reduce((a, b) => a + b, 0) / scores.length;

  const classCount: Record<string, number> = {};
  analises.forEach((a) => {
    const c = a.classificacao as string;
    classCount[c] = (classCount[c] ?? 0) + 1;
  });
  const distribuicao_classificacao = Object.entries(classCount).map(([classificacao, total]) => ({
    classificacao,
    total,
  }));

  const fasesNomes = [
    "preparacao",
    "abertura",
    "diagnostico",
    "apresentacao_clinica",
    "apresentacao_investimento",
    "fechamento",
    "objecoes",
    "sabotadores",
  ];
  const media_por_fase: Record<string, number | null> = {};
  for (const fase of fasesNomes) {
    const vals = analises
      .map((a) => {
        const f = a.fases as Record<string, { score?: number }> | null;
        return f?.[fase]?.score ?? null;
      })
      .filter((v): v is number => v !== null);
    media_por_fase[fase] = vals.length
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : null;
  }

  const calls_insuficientes = analises
    .filter((a) => a.classificacao === "insuficiente")
    .sort((a, b) => Number(a.score_geral) - Number(b.score_geral))
    .slice(0, 5)
    .map((a) => {
      const call = a.calls as unknown as {
        lead_id: string | null;
        leads: { nome: string } | null;
      } | null;
      return {
        call_id: a.call_id as string,
        lead_nome: call?.leads?.nome ?? null,
        score: Number(a.score_geral),
        diagnostico: a.diagnostico as string | null,
      };
    });

  return {
    tipo: "calls",
    periodo: { inicio, fim },
    total_calls: analises.length,
    score_medio: Math.round(scoreMedio * 10) / 10,
    distribuicao_classificacao,
    media_por_fase,
    calls_insuficientes,
  };
}

export function calcularPeriodoSemanaAnterior(): { inicio: Date; fim: Date } {
  const agora = new Date();
  const diaSemana = agora.getDay(); // 0 = domingo, 1 = segunda...
  // segunda-feira desta semana
  const segundaFeira = new Date(agora);
  segundaFeira.setDate(agora.getDate() - ((diaSemana + 6) % 7));
  segundaFeira.setHours(0, 0, 0, 0);

  const inicio = new Date(segundaFeira);
  inicio.setDate(segundaFeira.getDate() - 7);

  const fim = new Date(segundaFeira);
  fim.setMilliseconds(-1);

  return { inicio, fim };
}
