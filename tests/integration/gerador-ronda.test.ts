import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gerarRonda } from "@/lib/modules/gerador-ronda";
import { getTestClient, limparDb } from "./setup";

const supabase = getTestClient();

beforeEach(async () => {
  await limparDb(supabase);
});

afterEach(async () => {
  await limparDb(supabase);
});

const PERIODO_INICIO = new Date("2025-01-06T00:00:00.000Z");
const PERIODO_FIM = new Date("2025-01-12T23:59:59.999Z");

async function criarLead(telefone: string) {
  const { data } = await supabase
    .schema("comercial")
    .from("leads")
    .insert({ nome: "Lead Teste", telefone, status: "em_atendimento", status_origem: "sistema" })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

async function criarConversa(leadId: string) {
  const { data } = await supabase
    .schema("comercial")
    .from("conversas")
    .insert({ lead_id: leadId, status: "ativa" })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

async function criarAnaliseWhatsapp(
  conversaId: string,
  score: number,
  opts: { tagsPositivas?: string[]; tagsNegativas?: string[]; origemDetectada?: string } = {},
) {
  await supabase
    .schema("comercial")
    .from("analises_whatsapp")
    .insert({
      conversa_id: conversaId,
      score,
      tags_positivas: opts.tagsPositivas ?? [],
      tags_negativas: opts.tagsNegativas ?? [],
      resumo: null,
      diagnostico: null,
      acao_recomendada: null,
      origem_detectada: opts.origemDetectada ?? null,
      origem_confidence: opts.origemDetectada ? 0.9 : null,
      total_mensagens_analisadas: 10,
      modelo: "claude-sonnet-4-6",
      prompt_versao: "1.0",
      created_at: new Date("2025-01-08T10:00:00.000Z").toISOString(),
    })
    .throwOnError();
}

async function criarCall(leadId: string | null) {
  const { data } = await supabase
    .schema("comercial")
    .from("calls")
    .insert({
      lead_id: leadId,
      titulo: "Call de fechamento",
      transcricao: "Olá, vamos fechar?",
      match_status: "confirmado_auto",
      transcricao_origem: "plaud",
    })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

async function criarAnaliseCall(callId: string, scoreGeral: number, classificacao: string) {
  await supabase
    .schema("comercial")
    .from("analises_calls")
    .insert({
      call_id: callId,
      classificacao,
      score_geral: scoreGeral,
      fases: {
        preparacao: { score: scoreGeral, observacao: "" },
        abertura: { score: scoreGeral, observacao: "" },
        diagnostico: { score: scoreGeral, observacao: "" },
        apresentacao_clinica: { score: scoreGeral, observacao: "" },
        apresentacao_investimento: { score: scoreGeral, observacao: "" },
        fechamento: { score: scoreGeral, observacao: "" },
        objecoes: { score: scoreGeral, observacao: "" },
        sabotadores: { score: scoreGeral, observacao: "" },
      },
      diagnostico: null,
      acao_recomendada: null,
      modelo: "claude-sonnet-4-6",
      prompt_versao: "1.0",
      created_at: new Date("2025-01-08T10:00:00.000Z").toISOString(),
    })
    .throwOnError();
}

describe("gerarRonda whatsapp", () => {
  it("cria ronda vazia quando não há análises no período", async () => {
    const resultado = await gerarRonda("whatsapp", PERIODO_INICIO, PERIODO_FIM, supabase);

    expect(resultado.vazia).toBe(true);
    expect(resultado.rondaId).toBeTruthy();

    const { data: ronda } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("*")
      .eq("id", resultado.rondaId)
      .single()
      .throwOnError();

    expect(ronda!.tipo).toBe("whatsapp");
    expect(ronda!.vazia).toBe(true);
    expect(ronda!.status).toBe("gerada");
    expect((ronda!.snapshot as { total_conversas: number }).total_conversas).toBe(0);
  });

  it("agrega scores, tags e conversas críticas corretamente", async () => {
    const leadId = await criarLead("+5511900000011");
    const conversaId1 = await criarConversa(leadId);
    const conversaId2 = await criarConversa(leadId);
    const conversaId3 = await criarConversa(leadId);

    await criarAnaliseWhatsapp(conversaId1, 80, {
      tagsPositivas: ["proativo", "objetivo"],
      tagsNegativas: [],
    });
    await criarAnaliseWhatsapp(conversaId2, 25, {
      tagsNegativas: ["demora", "sem_foco"],
    });
    await criarAnaliseWhatsapp(conversaId3, 60, {
      tagsNegativas: ["demora"],
      origemDetectada: "instagram",
    });

    const resultado = await gerarRonda("whatsapp", PERIODO_INICIO, PERIODO_FIM, supabase);
    expect(resultado.vazia).toBe(false);

    const { data: ronda } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("snapshot")
      .eq("id", resultado.rondaId)
      .single()
      .throwOnError();

    const snap = ronda!.snapshot as {
      total_conversas: number;
      score_medio: number;
      score_mais_alto: number;
      score_mais_baixo: number;
      top_tags_negativas: { tag: string; total: number }[];
      conversas_criticas: { score: number }[];
    };

    expect(snap.total_conversas).toBe(3);
    expect(snap.score_medio).toBeCloseTo(55, 0);
    expect(snap.score_mais_alto).toBe(80);
    expect(snap.score_mais_baixo).toBe(25);

    const tagDemora = snap.top_tags_negativas.find((t) => t.tag === "demora");
    expect(tagDemora?.total).toBe(2);

    expect(snap.conversas_criticas).toHaveLength(1);
    expect(snap.conversas_criticas[0].score).toBe(25);
  });

  it("idempotente: executar duas vezes não duplica a ronda", async () => {
    const resultado1 = await gerarRonda("whatsapp", PERIODO_INICIO, PERIODO_FIM, supabase);
    const resultado2 = await gerarRonda("whatsapp", PERIODO_INICIO, PERIODO_FIM, supabase);

    expect(resultado1.rondaId).toBe(resultado2.rondaId);

    const { data: rondas } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("id")
      .eq("tipo", "whatsapp")
      .eq("periodo_inicio", PERIODO_INICIO.toISOString())
      .throwOnError();

    expect(rondas).toHaveLength(1);
  });
});

describe("gerarRonda calls", () => {
  it("cria ronda calls vazia quando não há análises", async () => {
    const resultado = await gerarRonda("calls", PERIODO_INICIO, PERIODO_FIM, supabase);

    expect(resultado.vazia).toBe(true);

    const snap = await supabase
      .schema("comercial")
      .from("rondas")
      .select("snapshot")
      .eq("id", resultado.rondaId)
      .single()
      .throwOnError();

    expect((snap.data!.snapshot as { total_calls: number }).total_calls).toBe(0);
  });

  it("agrega scores e classificações de calls corretamente", async () => {
    const leadId = await criarLead("+5511900000022");
    const callId1 = await criarCall(leadId);
    const callId2 = await criarCall(leadId);
    const callId3 = await criarCall(null);

    await criarAnaliseCall(callId1, 85, "excelente");
    await criarAnaliseCall(callId2, 20, "insuficiente");
    await criarAnaliseCall(callId3, 65, "regular");

    const resultado = await gerarRonda("calls", PERIODO_INICIO, PERIODO_FIM, supabase);
    expect(resultado.vazia).toBe(false);

    const { data: ronda } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("snapshot")
      .eq("id", resultado.rondaId)
      .single()
      .throwOnError();

    const snap = ronda!.snapshot as {
      total_calls: number;
      score_medio: number;
      distribuicao_classificacao: { classificacao: string; total: number }[];
      calls_insuficientes: { score: number }[];
    };

    expect(snap.total_calls).toBe(3);
    expect(snap.score_medio).toBeCloseTo(56.7, 0);

    const insuf = snap.distribuicao_classificacao.find((d) => d.classificacao === "insuficiente");
    expect(insuf?.total).toBe(1);

    expect(snap.calls_insuficientes).toHaveLength(1);
    expect(snap.calls_insuficientes[0].score).toBe(20);
  });

  it("whatsapp e calls do mesmo período são rondas independentes", async () => {
    await gerarRonda("whatsapp", PERIODO_INICIO, PERIODO_FIM, supabase);
    await gerarRonda("calls", PERIODO_INICIO, PERIODO_FIM, supabase);

    const { data: rondas } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("tipo")
      .eq("periodo_inicio", PERIODO_INICIO.toISOString())
      .throwOnError();

    expect(rondas).toHaveLength(2);
    const tipos = rondas!.map((r) => r.tipo).sort();
    expect(tipos).toEqual(["calls", "whatsapp"]);
  });
});
