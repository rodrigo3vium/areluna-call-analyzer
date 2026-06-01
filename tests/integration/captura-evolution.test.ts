import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { processarWebhookEvolution } from "@/lib/modules/captura-evolution";
import { getTestClient, limparDb } from "./setup";

const supabase = getTestClient();

// Fixture de instance usada nos testes
const INSTANCE_NAME = "test-instance";
const WEBHOOK_SECRET = "secret-test-123";
beforeEach(async () => {
  await limparDb(supabase);

  await supabase
    .schema("comercial")
    .from("evolution_instances")
    .insert({
      apelido: "Instância de Teste",
      evolution_url: "http://localhost:8080",
      evolution_api_key: "evo-key",
      instance_name: INSTANCE_NAME,
      webhook_secret: WEBHOOK_SECRET,
    })
    .throwOnError();
});

afterEach(async () => {
  await limparDb(supabase);
});

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    event: "messages.upsert",
    instance: INSTANCE_NAME,
    data: {
      key: {
        remoteJid: "5511999999999@s.whatsapp.net",
        fromMe: false,
        id: "3EB0ABCDEF123456",
      },
      pushName: "João Teste",
      message: { conversation: "Olá, quero agendar uma consulta" },
      messageType: "conversation",
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
    ...overrides,
  };
}

describe("processarWebhookEvolution", () => {
  it("insere evento em eventos_brutos para mensagem válida", async () => {
    const result = await processarWebhookEvolution(makePayload(), WEBHOOK_SECRET, supabase);

    expect(result.aceito).toBe(true);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("*")
      .eq("fonte", "evolution")
      .single()
      .throwOnError();

    expect(data).toBeTruthy();
    expect(data!.status).toBe("pendente");
    expect(data!.external_id).toBe(`${INSTANCE_NAME}_3EB0ABCDEF123456`);
  });

  it("rejeita quando secret está errado", async () => {
    const result = await processarWebhookEvolution(makePayload(), "wrong-secret", supabase);

    expect(result.aceito).toBe(false);
    expect(result.status).toBe(401);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("id")
      .throwOnError();

    expect(data).toHaveLength(0);
  });

  it("ignora evento que não é messages.upsert", async () => {
    const result = await processarWebhookEvolution(
      makePayload({ event: "connection.update" }),
      WEBHOOK_SECRET,
      supabase,
    );

    expect(result.aceito).toBe(true);
    expect(result.ignorado).toBe(true);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("id")
      .throwOnError();

    expect(data).toHaveLength(0);
  });

  it("ignora mensagem enviada pelo bot (fromMe: true)", async () => {
    const payload = makePayload();
    (payload.data.key as Record<string, unknown>).fromMe = true;

    const result = await processarWebhookEvolution(payload, WEBHOOK_SECRET, supabase);

    expect(result.aceito).toBe(true);
    expect(result.ignorado).toBe(true);
  });

  it("ignora mensagem de grupo (@g.us)", async () => {
    const payload = makePayload();
    (payload.data.key as Record<string, unknown>).remoteJid = "5511999999999-1234567890@g.us";

    const result = await processarWebhookEvolution(payload, WEBHOOK_SECRET, supabase);

    expect(result.aceito).toBe(true);
    expect(result.ignorado).toBe(true);
  });

  it("deduplicação: segundo webhook com mesmo message_id retorna aceito sem duplicar", async () => {
    await processarWebhookEvolution(makePayload(), WEBHOOK_SECRET, supabase);
    const result = await processarWebhookEvolution(makePayload(), WEBHOOK_SECRET, supabase);

    expect(result.aceito).toBe(true);
    expect(result.ignorado).toBe(true); // duplicata silenciosa

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("id")
      .throwOnError();

    expect(data).toHaveLength(1);
  });

  it("rejeita payload malformado (sem data.key)", async () => {
    const result = await processarWebhookEvolution(
      { event: "messages.upsert", instance: INSTANCE_NAME },
      WEBHOOK_SECRET,
      supabase,
    );

    expect(result.aceito).toBe(false);
    expect(result.status).toBe(400);
  });
});
