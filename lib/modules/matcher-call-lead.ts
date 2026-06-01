import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SYSTEM_PROMPT_MATCH } from "@/lib/prompts/analyze-call";
import { log } from "@/lib/log";

const MODELO = "claude-sonnet-4-6";
const THRESHOLD_AUTO = 0.85;

export type Candidato = {
  id: string;
  nome: string;
  telefone: string;
  score: number;
};

type ClassificacaoCandidatos =
  | { tipo: "sem_candidatos" }
  | { tipo: "alto"; candidato: Candidato }
  | { tipo: "ambiguo"; top3: Candidato[] };

export function classificarCandidatos(
  candidatos: Candidato[],
  threshold: number = THRESHOLD_AUTO,
): ClassificacaoCandidatos {
  if (candidatos.length === 0) return { tipo: "sem_candidatos" };

  const [top] = candidatos;
  if (top.score >= threshold) return { tipo: "alto", candidato: top };
  return { tipo: "ambiguo", top3: candidatos.slice(0, 3) };
}

let _anthropic: Anthropic | null = null;

function getAnthropicClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

export async function matchCallLead(callId: string, supabase: SupabaseClient): Promise<void> {
  const { data: call } = await supabase
    .schema("comercial")
    .from("calls")
    .select("id, telefone_extraido, titulo, transcricao, match_status")
    .eq("id", callId)
    .single()
    .throwOnError();

  if (!call || call.match_status !== "pendente") return;

  // Level 1: Exact phone match
  if (call.telefone_extraido) {
    const { data: leadExato } = await supabase
      .schema("comercial")
      .from("leads")
      .select("id")
      .eq("telefone", call.telefone_extraido)
      .maybeSingle();

    if (leadExato) {
      await confirmarMatch(callId, leadExato.id, "confirmado_auto", supabase);
      return;
    }
  }

  // Level 2: Fuzzy search via pg_trgm RPC
  const { data: candidatosRaw } = await supabase.schema("comercial").rpc("buscar_leads_fuzzy", {
    p_telefone: call.telefone_extraido ?? null,
    p_nome: call.titulo ?? null,
    p_limite: 15,
  });

  const candidatos: Candidato[] = (candidatosRaw ?? []).map(
    (r: { id: string; nome: string; telefone: string; score: number }) => ({
      id: r.id,
      nome: r.nome,
      telefone: r.telefone,
      score: Number(r.score),
    }),
  );

  const classificacao = classificarCandidatos(candidatos);

  if (classificacao.tipo === "sem_candidatos") {
    await supabase
      .schema("comercial")
      .from("calls")
      .update({ match_status: "pendente", match_sugestoes: null })
      .eq("id", callId);
    return;
  }

  if (classificacao.tipo === "alto") {
    await confirmarMatch(callId, classificacao.candidato.id, "confirmado_auto", supabase);
    return;
  }

  // Level 3: Ask Sonnet to decide between ambiguous candidates
  const top3 = classificacao.top3;
  const resultadoIA = await decidirComIA(call, top3);

  if (resultadoIA && resultadoIA.confidence >= THRESHOLD_AUTO && resultadoIA.lead_id) {
    await confirmarMatch(callId, resultadoIA.lead_id, "confirmado_auto", supabase);
  } else {
    const sugestoes = top3.map((c) => ({
      lead_id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      confidence: c.id === resultadoIA?.lead_id ? (resultadoIA?.confidence ?? c.score) : c.score,
    }));

    await supabase
      .schema("comercial")
      .from("calls")
      .update({
        match_status: "sugerido",
        match_sugestoes: sugestoes,
      })
      .eq("id", callId);
  }
}

async function confirmarMatch(
  callId: string,
  leadId: string,
  status: string,
  supabase: SupabaseClient,
) {
  await supabase
    .schema("comercial")
    .from("calls")
    .update({
      lead_id: leadId,
      match_status: status,
      match_confirmado_em: new Date().toISOString(),
    })
    .eq("id", callId)
    .throwOnError();
}

async function decidirComIA(
  call: { titulo: string | null; transcricao: string | null; telefone_extraido: string | null },
  candidatos: Candidato[],
): Promise<{ lead_id: string | null; confidence: number } | null> {
  try {
    const contextoCall = [
      call.titulo ? `Título: ${call.titulo}` : null,
      call.telefone_extraido ? `Telefone extraído: ${call.telefone_extraido}` : null,
      call.transcricao ? `Trecho da transcrição:\n${call.transcricao.slice(0, 800)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const listaCandidatos = candidatos
      .map((c, i) => `${i + 1}. ID: ${c.id} | Nome: ${c.nome} | Telefone: ${c.telefone}`)
      .join("\n");

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODELO,
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT_MATCH,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Call:\n${contextoCall}\n\nCandidatos:\n${listaCandidatos}`,
        },
      ],
    });

    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text) as { lead_id: string | null; confidence: number };
    return parsed;
  } catch (err) {
    log.warn("matcher.ia_fallback", { erro: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
