import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROMPT_VERSION, SYSTEM_PROMPT_ANALISE } from "@/lib/prompts/analyze-call";
import { matchCallLead } from "@/lib/modules/matcher-call-lead";
import { dispararAlertaSeNecessario } from "@/lib/modules/alerta-imediato";
import { log } from "@/lib/log";

const MODELO = "claude-sonnet-4-6";
const BATCH_SIZE = 10;

export type ResultadoAnaliseCall = {
  analisadas: number;
  erros: number;
};

type AnaliseCallIA = {
  classificacao: "excelente" | "bom" | "regular" | "insuficiente";
  score_geral: number;
  fases: Record<string, { score: number; observacao: string }>;
  diagnostico: string | null;
  acao_recomendada: string | null;
};

let _anthropic: Anthropic | null = null;

function getAnthropicClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

export async function analisarCallsPendentes(
  supabase: SupabaseClient,
): Promise<ResultadoAnaliseCall> {
  const resultado: ResultadoAnaliseCall = { analisadas: 0, erros: 0 };

  const { data: calls } = await supabase
    .schema("comercial")
    .from("calls")
    .select("id, transcricao, titulo")
    .not("transcricao", "is", null)
    .is("analisada_em", null)
    .limit(BATCH_SIZE)
    .throwOnError();

  for (const call of calls ?? []) {
    try {
      // Análise e match rodam em paralelo
      await Promise.all([
        analisarCall(call.id, call.transcricao!, call.titulo, supabase),
        matchCallLead(call.id, supabase),
      ]);
      resultado.analisadas++;
    } catch (err) {
      log.error("analisador_calls.erro", {
        callId: call.id,
        erro: err instanceof Error ? err.message : String(err),
      });
      resultado.erros++;
    }
  }

  return resultado;
}

async function analisarCall(
  callId: string,
  transcricao: string,
  titulo: string | null,
  supabase: SupabaseClient,
) {
  const client = getAnthropicClient();

  const contexto = titulo
    ? `Título da call: ${titulo}\n\nTranscrição:\n${transcricao}`
    : transcricao;

  const response = await client.messages.create({
    model: MODELO,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT_ANALISE,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Avalie esta call de fechamento:\n\n${contexto}`,
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Resposta Anthropic sem conteúdo de texto");
  }

  const analise = JSON.parse(textBlock.text) as AnaliseCallIA;

  await supabase
    .schema("comercial")
    .from("analises_calls")
    .insert({
      call_id: callId,
      classificacao: analise.classificacao,
      score_geral: analise.score_geral,
      fases: analise.fases ?? {},
      diagnostico: analise.diagnostico ?? null,
      acao_recomendada: analise.acao_recomendada ?? null,
      modelo: MODELO,
      prompt_versao: PROMPT_VERSION,
      tokens_entrada: response.usage?.input_tokens ?? null,
      tokens_saida: response.usage?.output_tokens ?? null,
    })
    .throwOnError();

  await supabase
    .schema("comercial")
    .from("calls")
    .update({ analisada_em: new Date().toISOString() })
    .eq("id", callId)
    .throwOnError();

  // Alerta imediato se score baixo
  const { data: call } = await supabase
    .schema("comercial")
    .from("calls")
    .select("lead_id, leads(nome, telefone)")
    .eq("id", callId)
    .single();

  if (call?.lead_id) {
    const leadsRaw = call.leads;
    const lead = (Array.isArray(leadsRaw) ? leadsRaw[0] : leadsRaw) as {
      nome: string;
      telefone: string;
    } | null;
    if (lead) {
      await dispararAlertaSeNecessario(
        "call",
        call.lead_id as string,
        lead.nome,
        lead.telefone,
        analise.score_geral,
        supabase,
      );
    }
  }
}
