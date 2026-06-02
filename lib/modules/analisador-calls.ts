import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROMPT_VERSION, SYSTEM_PROMPT_ANALISE } from "@/lib/prompts/analyze-call";
import { log } from "@/lib/log";

const MODELO = "gpt-4o";
const BATCH_SIZE = 10;

export type ResultadoAnaliseCall = {
  analisadas: number;
  erros: number;
};

type AnaliseCallIA = {
  classificacao: "EXCELENTE" | "BOM" | "REGULAR" | "INSUFICIENTE";
  score: number;
  performance_por_criterio: Record<string, number>;
  sinais_vermelhos: number[];
  pontos_melhoria: string[];
  diagnostico_ia: string | null;
  acao_recomendada: string | null;
};

let _openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function analisarCallsPendentes(
  supabase: SupabaseClient,
): Promise<ResultadoAnaliseCall> {
  const resultado: ResultadoAnaliseCall = { analisadas: 0, erros: 0 };

  const { data: calls } = await supabase
    .schema("comercial")
    .from("calls")
    .select("id, transcricao, sharepoint_file_name")
    .eq("status_analise", "aguardando_analise")
    .limit(BATCH_SIZE)
    .throwOnError();

  for (const call of calls ?? []) {
    // Marcar em análise
    await supabase
      .schema("comercial")
      .from("calls")
      .update({ status_analise: "em_analise" })
      .eq("id", call.id)
      .throwOnError();

    try {
      await analisarCall(call.id, call.transcricao!, call.sharepoint_file_name, supabase);
      resultado.analisadas++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("analisador_calls.erro", { callId: call.id, erro: msg });

      await supabase
        .schema("comercial")
        .from("calls")
        .update({ status_analise: "erro" })
        .eq("id", call.id);

      resultado.erros++;
    }
  }

  return resultado;
}

async function analisarCall(
  callId: string,
  transcricao: string,
  nomeArquivo: string,
  supabase: SupabaseClient,
) {
  const client = getOpenAIClient();

  const contexto = `Arquivo: ${nomeArquivo}\n\nTranscrição:\n${transcricao}`;

  const response = await client.chat.completions.create({
    model: MODELO,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT_ANALISE },
      { role: "user", content: `Avalie esta call de fechamento:\n\n${contexto}` },
    ],
  });

  const rawText = response.choices[0]?.message?.content?.trim();
  if (!rawText) {
    throw new Error("Resposta OpenAI sem conteúdo de texto");
  }

  const jsonText = rawText.startsWith("```")
    ? rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim()
    : rawText;

  const analise = JSON.parse(jsonText) as AnaliseCallIA;

  log.info("analisador_calls.analise_concluida", {
    callId,
    score: analise.score,
    classificacao: analise.classificacao,
    promptVersion: PROMPT_VERSION,
  });

  // Gravar análise inline na call — transição atômica para 'analisada'
  await supabase
    .schema("comercial")
    .from("calls")
    .update({
      classificacao: analise.classificacao,
      score: analise.score,
      performance_por_criterio: analise.performance_por_criterio ?? {},
      sinais_vermelhos: analise.sinais_vermelhos ?? [],
      pontos_melhoria: analise.pontos_melhoria ?? [],
      diagnostico_ia: analise.diagnostico_ia ?? null,
      acao_recomendada: analise.acao_recomendada ?? null,
      status_analise: "analisada",
    })
    .eq("id", callId)
    .throwOnError();
}
