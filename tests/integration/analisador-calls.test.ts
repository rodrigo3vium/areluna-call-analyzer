import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analisarCallsPendentes } from "@/lib/modules/analisador-calls";
import { getTestClient, limparDb } from "./setup";

const MOCK_ANALISE_CALL = {
  classificacao: "bom",
  score_geral: 72,
  fases: {
    preparacao: { score: 80, observacao: "Closer estudou o histórico." },
    abertura: { score: 70, observacao: "Bom rapport inicial." },
    diagnostico: { score: 75, observacao: "Perguntas adequadas." },
    apresentacao_clinica: { score: 80, observacao: "Apresentação clara." },
    apresentacao_investimento: { score: 65, observacao: "Faltou ancoragem de valor." },
    fechamento: { score: 60, observacao: "Não propôs próximos passos concretos." },
    objecoes: { score: 70, observacao: "Contornou bem objeção de preço." },
    sabotadores: { score: 85, observacao: "Sem sabotadores identificados." },
  },
  diagnostico: "Call competente mas com oportunidades de melhoria no fechamento.",
  acao_recomendada: "Treinar apresentação do investimento com ancoragem de valor antes do preço.",
};

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(MOCK_ANALISE_CALL) }],
        usage: { input_tokens: 1000, output_tokens: 200 },
        model: "claude-sonnet-4-6",
      }),
    },
  })),
}));

// Isola o matcher para não depender do RPC de fuzzy
vi.mock("@/lib/modules/matcher-call-lead", () => ({
  matchCallLead: vi.fn().mockResolvedValue(undefined),
  classificarCandidatos: vi.fn(),
}));

const supabase = getTestClient();

beforeEach(async () => {
  await limparDb(supabase);
});

afterEach(async () => {
  await limparDb(supabase);
  vi.clearAllMocks();
});

async function criarCallComTranscricao(overrides: Record<string, unknown> = {}) {
  const { data: call } = await supabase
    .schema("comercial")
    .from("calls")
    .insert({
      titulo: "Call Fechamento — João Silva",
      transcricao: "Olá João, vamos falar sobre o investimento no procedimento...",
      transcricao_origem: "plaud",
      duracao_segundos: 1800,
      match_status: "pendente",
      ...overrides,
    })
    .select("id")
    .single()
    .throwOnError();

  return call!;
}

describe("analisarCallsPendentes", () => {
  it("cria analise_call para call com transcricao não analisada", async () => {
    await criarCallComTranscricao();

    const resultado = await analisarCallsPendentes(supabase);

    expect(resultado.analisadas).toBe(1);
    expect(resultado.erros).toBe(0);

    const { data: analises } = await supabase
      .schema("comercial")
      .from("analises_calls")
      .select("*")
      .throwOnError();

    expect(analises).toHaveLength(1);
    expect(analises![0].classificacao).toBe("bom");
    expect(analises![0].score_geral).toBe(72);
    expect(analises![0].modelo).toBe("claude-sonnet-4-6");
    expect(analises![0].prompt_versao).toBe("v1");
  });

  it("marca analisada_em na call após análise", async () => {
    const call = await criarCallComTranscricao();

    await analisarCallsPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("calls")
      .select("analisada_em")
      .eq("id", call.id)
      .single()
      .throwOnError();

    expect(data!.analisada_em).not.toBeNull();
  });

  it("não re-analisa call já analisada", async () => {
    await criarCallComTranscricao({ analisada_em: new Date().toISOString() });

    const resultado = await analisarCallsPendentes(supabase);

    expect(resultado.analisadas).toBe(0);

    const { data: analises } = await supabase
      .schema("comercial")
      .from("analises_calls")
      .select("id")
      .throwOnError();

    expect(analises).toHaveLength(0);
  });

  it("não analisa call sem transcricao", async () => {
    await supabase
      .schema("comercial")
      .from("calls")
      .insert({
        titulo: "Call sem transcrição",
        match_status: "pendente",
      })
      .throwOnError();

    const resultado = await analisarCallsPendentes(supabase);

    expect(resultado.analisadas).toBe(0);
  });

  it("chama matchCallLead em paralelo com a análise", async () => {
    const { matchCallLead } = await import("@/lib/modules/matcher-call-lead");
    const call = await criarCallComTranscricao();

    await analisarCallsPendentes(supabase);

    expect(matchCallLead).toHaveBeenCalledWith(call.id, supabase);
  });
});
