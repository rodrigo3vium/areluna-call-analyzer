import type { SupabaseClient } from "@supabase/supabase-js";
import type { SnapshotCalls } from "@/lib/types";
import { log } from "@/lib/log";

export type ResultadoGeracaoRonda = {
  rondaId: string;
  vazia: boolean;
};

export async function gerarRonda(
  periodoInicio: Date,
  periodoFim: Date,
  supabase: SupabaseClient,
): Promise<ResultadoGeracaoRonda> {
  const inicio = periodoInicio.toISOString();
  const fim = periodoFim.toISOString();

  const snapshot = await gerarSnapshotCalls(inicio, fim, supabase);
  const vazia = snapshot.total_calls === 0;

  const { data: ronda } = await supabase
    .schema("comercial")
    .from("rondas")
    .upsert(
      {
        tipo: "calls" as const,
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

  log.info("gerador_ronda.gerado", { inicio, fim, vazia, rondaId: ronda!.id });

  return { rondaId: ronda!.id, vazia };
}

async function gerarSnapshotCalls(
  inicio: string,
  fim: string,
  supabase: SupabaseClient,
): Promise<SnapshotCalls> {
  const { data: calls } = await supabase
    .schema("comercial")
    .from("calls")
    .select(
      `
      id,
      score,
      classificacao,
      diagnostico_ia,
      data_gravacao,
      closer_id,
      closers(id, nome)
    `,
    )
    .eq("status_analise", "analisada")
    .gte("data_gravacao", inicio)
    .lte("data_gravacao", fim);

  if (!calls?.length) {
    return {
      total_calls: 0,
      score_medio: null,
      distribuicao_classificacao: { EXCELENTE: 0, BOM: 0, REGULAR: 0, INSUFICIENTE: 0 },
      por_closer: [],
      calls_insuficientes: [],
    };
  }

  const scores = calls.filter((c) => c.score !== null).map((c) => Number(c.score));
  const scoreMedio = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const distribuicao_classificacao = { EXCELENTE: 0, BOM: 0, REGULAR: 0, INSUFICIENTE: 0 };
  for (const call of calls) {
    const c = call.classificacao as keyof typeof distribuicao_classificacao | null;
    if (c && c in distribuicao_classificacao) distribuicao_classificacao[c]++;
  }

  // Agrupamento por closer
  const closerMap = new Map<
    string,
    { closer_id: string; closer_nome: string; total: number; scores: number[] }
  >();
  for (const call of calls) {
    const closerRaw = call.closers;
    const closer = (Array.isArray(closerRaw) ? closerRaw[0] : closerRaw) as
      | { id: string; nome: string }
      | null
      | undefined;
    if (!closer) continue;
    const entry = closerMap.get(closer.id) ?? {
      closer_id: closer.id,
      closer_nome: closer.nome,
      total: 0,
      scores: [],
    };
    entry.total++;
    if (call.score !== null) entry.scores.push(Number(call.score));
    closerMap.set(closer.id, entry);
  }
  const por_closer = Array.from(closerMap.values())
    .map(({ scores: s, ...rest }) => ({
      ...rest,
      score_medio: s.length
        ? Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.total - a.total);

  const calls_insuficientes = calls
    .filter((c) => c.classificacao === "INSUFICIENTE")
    .sort((a, b) => Number(a.score ?? 0) - Number(b.score ?? 0))
    .slice(0, 5)
    .map((c) => {
      const closerRaw2 = c.closers;
      const closer2 = (Array.isArray(closerRaw2) ? closerRaw2[0] : closerRaw2) as
        | { id: string; nome: string }
        | null
        | undefined;
      return {
        id: c.id,
        closer_nome: closer2?.nome ?? null,
        score: c.score !== null ? Number(c.score) : null,
        data_gravacao: c.data_gravacao as string | null,
        diagnostico_ia: c.diagnostico_ia as string | null,
      };
    });

  return {
    total_calls: calls.length,
    score_medio: scoreMedio,
    distribuicao_classificacao,
    por_closer,
    calls_insuficientes,
  };
}

export function calcularPeriodoSemanaAnterior(): { inicio: Date; fim: Date } {
  const agora = new Date();
  const diaSemana = agora.getDay();
  const segundaFeira = new Date(agora);
  segundaFeira.setDate(agora.getDate() - ((diaSemana + 6) % 7));
  segundaFeira.setHours(0, 0, 0, 0);

  const inicio = new Date(segundaFeira);
  inicio.setDate(segundaFeira.getDate() - 7);

  const fim = new Date(segundaFeira);
  fim.setMilliseconds(-1);

  return { inicio, fim };
}
