import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analisarConversasPendentes } from "@/lib/modules/analisador-whatsapp";
import { getTestClient, limparDb } from "./setup";

const MOCK_ANALISE = {
  score: 75,
  tags_positivas: ["resposta_rapida", "empatia"],
  tags_negativas: ["sem_follow_up"],
  resumo: "Lead pediu informações sobre o procedimento e a secretária respondeu bem.",
  diagnostico: "Atendimento adequado com boa apresentação do procedimento.",
  acao_recomendada: "Fazer follow-up em 48h para confirmar agendamento.",
  lead_status: "agendou",
  origem_detectada: "instagram",
  origem_confidence: 0.9,
};

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(MOCK_ANALISE) }],
        usage: { input_tokens: 500, output_tokens: 100 },
        model: "claude-sonnet-4-6",
      }),
    },
  })),
}));

const supabase = getTestClient();

const INSTANCE_NAME = "analise-test-instance";
const WEBHOOK_SECRET = "analise-secret";

async function criarFixtures() {
  await supabase
    .schema("comercial")
    .from("evolution_instances")
    .insert({
      apelido: "Instância Analise",
      evolution_url: "http://localhost:8080",
      evolution_api_key: "evo-key",
      instance_name: INSTANCE_NAME,
      webhook_secret: WEBHOOK_SECRET,
    })
    .throwOnError();

  const { data: instance } = await supabase
    .schema("comercial")
    .from("evolution_instances")
    .select("id")
    .eq("instance_name", INSTANCE_NAME)
    .single()
    .throwOnError();

  const { data: lead } = await supabase
    .schema("comercial")
    .from("leads")
    .insert({ nome: "Maria Teste", telefone: "+5511988887777" })
    .select("id")
    .single()
    .throwOnError();

  const duasHorasAtras = new Date(Date.now() - 7_200_000).toISOString();

  const { data: conversa } = await supabase
    .schema("comercial")
    .from("conversas")
    .insert({
      lead_id: lead!.id,
      evolution_instance_id: instance!.id,
      numero_whatsapp: "+5511988887777",
      status: "ativa",
      ultima_mensagem_em: duasHorasAtras,
    })
    .select("id")
    .single()
    .throwOnError();

  await supabase
    .schema("comercial")
    .from("mensagens")
    .insert([
      {
        conversa_id: conversa!.id,
        tipo: "texto",
        fonte: "humano",
        conteudo: "Oi, vi vocês no Instagram. Quero saber sobre rinoplastia.",
        remetente: "lead",
        enviada_em: new Date(Date.now() - 7_200_000).toISOString(),
      },
      {
        conversa_id: conversa!.id,
        tipo: "texto",
        fonte: "humano",
        conteudo: "Olá! Claro, posso te explicar tudo. Já fez alguma avaliação antes?",
        remetente: "clinica",
        enviada_em: new Date(Date.now() - 7_100_000).toISOString(),
      },
    ])
    .throwOnError();

  return { lead: lead!, conversa: conversa! };
}

beforeEach(async () => {
  await limparDb(supabase);
});

afterEach(async () => {
  await limparDb(supabase);
  vi.clearAllMocks();
});

describe("analisarConversasPendentes", () => {
  it("cria linha em analises_whatsapp para conversa idle 1h+", async () => {
    await criarFixtures();

    const resultado = await analisarConversasPendentes(supabase);

    expect(resultado.analisadas).toBe(1);
    expect(resultado.erros).toBe(0);

    const { data: analises } = await supabase
      .schema("comercial")
      .from("analises_whatsapp")
      .select("*")
      .throwOnError();

    expect(analises).toHaveLength(1);
    expect(analises![0].score).toBe(75);
    expect(analises![0].tags_positivas).toContain("resposta_rapida");
    expect(analises![0].modelo).toBe("claude-sonnet-4-6");
    expect(analises![0].prompt_versao).toBe("v1");
  });

  it("denormaliza score e ultima_analise_em para conversas", async () => {
    const { conversa } = await criarFixtures();

    await analisarConversasPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("conversas")
      .select("ultimo_score, ultima_analise_em")
      .eq("id", conversa.id)
      .single()
      .throwOnError();

    expect(Number(data!.ultimo_score)).toBe(75);
    expect(data!.ultima_analise_em).not.toBeNull();
  });

  it("classifica origem do lead quando confidence >= 0.8", async () => {
    const { lead } = await criarFixtures();

    await analisarConversasPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("leads")
      .select("origem, origem_status, origem_confidence")
      .eq("id", lead.id)
      .single()
      .throwOnError();

    expect(data!.origem).toBe("instagram");
    expect(data!.origem_status).toBe("detectado");
    expect(Number(data!.origem_confidence)).toBe(0.9);
  });

  it("não classifica origem quando confidence < 0.8", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    (Anthropic as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...MOCK_ANALISE, origem_confidence: 0.6 }),
            },
          ],
          usage: { input_tokens: 500, output_tokens: 100 },
          model: "claude-sonnet-4-6",
        }),
      },
    }));

    const { lead } = await criarFixtures();

    await analisarConversasPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("leads")
      .select("origem_status")
      .eq("id", lead.id)
      .single()
      .throwOnError();

    expect(data!.origem_status).toBe("pendente");
  });

  it("avança status do lead quando IA sugere status de maior prioridade", async () => {
    const { lead } = await criarFixtures();

    await analisarConversasPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("leads")
      .select("status")
      .eq("id", lead.id)
      .single()
      .throwOnError();

    expect(data!.status).toBe("agendou");
  });

  it("não analisa conversa com ultima_mensagem_em recente (< 1h)", async () => {
    await supabase
      .schema("comercial")
      .from("evolution_instances")
      .insert({
        apelido: "Instância Recente",
        evolution_url: "http://localhost:8080",
        evolution_api_key: "evo-key",
        instance_name: "recente-instance",
        webhook_secret: "secret",
      })
      .throwOnError();

    const { data: instance } = await supabase
      .schema("comercial")
      .from("evolution_instances")
      .select("id")
      .eq("instance_name", "recente-instance")
      .single()
      .throwOnError();

    await supabase
      .schema("comercial")
      .from("conversas")
      .insert({
        evolution_instance_id: instance!.id,
        numero_whatsapp: "+5511911112222",
        status: "ativa",
        ultima_mensagem_em: new Date().toISOString(),
      })
      .throwOnError();

    const resultado = await analisarConversasPendentes(supabase);

    expect(resultado.analisadas).toBe(0);
  });

  it("não re-analisa conversa onde ultima_analise_em >= ultima_mensagem_em", async () => {
    const { conversa } = await criarFixtures();

    const agora = new Date().toISOString();
    await supabase
      .schema("comercial")
      .from("conversas")
      .update({ ultima_analise_em: agora })
      .eq("id", conversa.id)
      .throwOnError();

    const resultado = await analisarConversasPendentes(supabase);

    expect(resultado.analisadas).toBe(0);

    const { data: analises } = await supabase
      .schema("comercial")
      .from("analises_whatsapp")
      .select("id")
      .throwOnError();

    expect(analises).toHaveLength(0);
  });
});
