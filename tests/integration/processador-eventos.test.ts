import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processarEventosPendentes } from "@/lib/modules/processador-eventos";
import { getTestClient, limparDb } from "./setup";

// Mock externos: Whisper e email de alerta
vi.mock("@/lib/modules/whisper", () => ({
  transcreverAudio: vi.fn().mockResolvedValue("transcrição mock do áudio"),
}));
vi.mock("@/lib/modules/email-alerta", () => ({
  notificarDeadLetter: vi.fn().mockResolvedValue(undefined),
}));

const supabase = getTestClient();

const INSTANCE_NAME = "proc-test-instance";
const WEBHOOK_SECRET = "proc-secret";
beforeEach(async () => {
  await limparDb(supabase);

  await supabase
    .schema("comercial")
    .from("evolution_instances")
    .insert({
      apelido: "Instância Processador",
      evolution_url: "http://localhost:8080",
      evolution_api_key: "evo-key",
      instance_name: INSTANCE_NAME,
      webhook_secret: WEBHOOK_SECRET,
    })
    .throwOnError();
});

afterEach(async () => {
  await limparDb(supabase);
  vi.clearAllMocks();
});

function makeEvolutionEvento(overrides: Record<string, unknown> = {}) {
  const messageId = `MSG_${Date.now()}_${Math.random()}`;
  return {
    fonte: "evolution",
    external_id: `${INSTANCE_NAME}_${messageId}`,
    payload: {
      event: "messages.upsert",
      instance: INSTANCE_NAME,
      data: {
        key: {
          remoteJid: "5511999999999@s.whatsapp.net",
          fromMe: false,
          id: messageId,
        },
        pushName: "João Teste",
        message: { conversation: "Quero agendar uma consulta" },
        messageType: "conversation",
        messageTimestamp: Math.floor(Date.now() / 1000),
      },
    },
    ...overrides,
  };
}

function makePlaudEvento(overrides: Record<string, unknown> = {}) {
  const plaudId = `plaud-${Date.now()}`;
  return {
    fonte: "zapier_plaud",
    external_id: plaudId,
    payload: {
      id: plaudId,
      title: "Call Fechamento",
      transcript: "Olá, vamos conversar sobre o investimento...",
      duration: 1800,
      phone: "+5511888887777",
      created_at: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe("processarEventosPendentes — eventos Evolution", () => {
  it("cria Lead, Conversa e Mensagem a partir de evento de texto", async () => {
    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .insert(makeEvolutionEvento())
      .throwOnError();

    const resultado = await processarEventosPendentes(supabase);
    expect(resultado.processados).toBe(1);
    expect(resultado.erros).toBe(0);

    // Lead criado
    const { data: leads } = await supabase
      .schema("comercial")
      .from("leads")
      .select("*")
      .throwOnError();
    expect(leads).toHaveLength(1);
    expect(leads![0].telefone).toBe("+5511999999999");

    // Conversa criada
    const { data: conversas } = await supabase
      .schema("comercial")
      .from("conversas")
      .select("*")
      .throwOnError();
    expect(conversas).toHaveLength(1);
    expect(conversas![0].lead_id).toBe(leads![0].id);

    // Mensagem criada
    const { data: mensagens } = await supabase
      .schema("comercial")
      .from("mensagens")
      .select("*")
      .throwOnError();
    expect(mensagens).toHaveLength(1);
    expect(mensagens![0].conteudo).toBe("Quero agendar uma consulta");
    expect(mensagens![0].tipo).toBe("texto");
    expect(mensagens![0].fonte).toBe("humano");
  });

  it("reutiliza Lead existente quando telefone já está cadastrado", async () => {
    // Evento 1
    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .insert(makeEvolutionEvento())
      .throwOnError();
    await processarEventosPendentes(supabase);

    // Evento 2 — mesmo número, nova mensagem
    const evento2 = makeEvolutionEvento();
    (evento2.payload.data.message as Record<string, unknown>)["conversation"] = "Segunda mensagem";
    await supabase.schema("comercial").from("eventos_brutos").insert(evento2).throwOnError();
    await processarEventosPendentes(supabase);

    const { data: leads } = await supabase
      .schema("comercial")
      .from("leads")
      .select("id")
      .throwOnError();
    expect(leads).toHaveLength(1); // mesmo lead

    const { data: mensagens } = await supabase
      .schema("comercial")
      .from("mensagens")
      .select("id")
      .throwOnError();
    expect(mensagens).toHaveLength(2); // duas mensagens
  });

  it("marca evento como processado após sucesso", async () => {
    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .insert(makeEvolutionEvento())
      .throwOnError();

    await processarEventosPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("status")
      .single()
      .throwOnError();

    expect(data!.status).toBe("processado");
  });

  it("incrementa tentativas e mantém pendente após erro", async () => {
    // Evento com instance inexistente para forçar erro de processamento
    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .insert({
        fonte: "evolution",
        external_id: "bad-event-001",
        payload: {
          event: "messages.upsert",
          instance: "instancia-inexistente",
          data: {
            key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: false, id: "MSG001" },
            messageType: "conversation",
            message: { conversation: "teste" },
          },
        },
      })
      .throwOnError();

    await processarEventosPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("status, tentativas")
      .single()
      .throwOnError();

    expect(data!.tentativas).toBe(1);
    expect(data!.status).toBe("erro");
  });

  it("promove para dead_letter após 5 tentativas e notifica BA", async () => {
    const { notificarDeadLetter } = await import("@/lib/modules/email-alerta");

    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .insert({
        fonte: "evolution",
        external_id: "dead-event-001",
        payload: {
          event: "messages.upsert",
          instance: "instancia-inexistente",
          data: {
            key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: false, id: "MSG002" },
            messageType: "conversation",
            message: { conversation: "teste" },
          },
        },
        tentativas: 4, // já falhou 4x
        status: "erro",
      })
      .throwOnError();

    await processarEventosPendentes(supabase);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("status, tentativas")
      .single()
      .throwOnError();

    expect(data!.status).toBe("dead_letter");
    expect(data!.tentativas).toBe(5);
    expect(notificarDeadLetter).toHaveBeenCalledOnce();
  });
});

describe("processarEventosPendentes — eventos Plaud", () => {
  it("cria Call a partir de evento Plaud", async () => {
    await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .insert(makePlaudEvento())
      .throwOnError();

    const resultado = await processarEventosPendentes(supabase);
    expect(resultado.processados).toBe(1);

    const { data: calls } = await supabase
      .schema("comercial")
      .from("calls")
      .select("*")
      .throwOnError();

    expect(calls).toHaveLength(1);
    expect(calls![0].transcricao).toBe("Olá, vamos conversar sobre o investimento...");
    expect(calls![0].transcricao_origem).toBe("plaud");
    expect(calls![0].match_status).toBe("pendente");
  });
});
