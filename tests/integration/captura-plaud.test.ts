import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { processarWebhookPlaud } from "@/lib/modules/captura-plaud";
import { getTestClient, limparDb } from "./setup";

const supabase = getTestClient();
const ZAPIER_SECRET = "zapier-secret-test-456";

beforeEach(async () => {
  await limparDb(supabase);
});

afterEach(async () => {
  await limparDb(supabase);
});

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    id: "plaud-call-001",
    title: "Call Fechamento — João",
    transcript: "Olá João, vamos falar sobre o investimento...",
    duration: 1800,
    phone: "+5511999999999",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("processarWebhookPlaud", () => {
  it("insere evento em eventos_brutos para call válida", async () => {
    const result = await processarWebhookPlaud(
      makePayload(),
      ZAPIER_SECRET,
      ZAPIER_SECRET,
      supabase,
    );

    expect(result.aceito).toBe(true);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("*")
      .eq("fonte", "zapier_plaud")
      .single()
      .throwOnError();

    expect(data).toBeTruthy();
    expect(data!.status).toBe("pendente");
    expect(data!.external_id).toBe("plaud-call-001");
  });

  it("rejeita quando secret está errado", async () => {
    const result = await processarWebhookPlaud(
      makePayload(),
      "wrong-secret",
      ZAPIER_SECRET,
      supabase,
    );

    expect(result.aceito).toBe(false);
    expect(result.status).toBe(401);
  });

  it("usa hash de transcript como external_id quando plaud não manda id", async () => {
    const payload = makePayload();
    delete (payload as Record<string, unknown>)["id"];

    const result = await processarWebhookPlaud(payload, ZAPIER_SECRET, ZAPIER_SECRET, supabase);

    expect(result.aceito).toBe(true);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("external_id")
      .eq("fonte", "zapier_plaud")
      .single()
      .throwOnError();

    expect(data!.external_id).toMatch(/^hash_/);
  });

  it("deduplicação: segundo webhook com mesmo id é ignorado silenciosamente", async () => {
    await processarWebhookPlaud(makePayload(), ZAPIER_SECRET, ZAPIER_SECRET, supabase);
    const result = await processarWebhookPlaud(
      makePayload(),
      ZAPIER_SECRET,
      ZAPIER_SECRET,
      supabase,
    );

    expect(result.aceito).toBe(true);
    expect(result.ignorado).toBe(true);

    const { data } = await supabase
      .schema("comercial")
      .from("eventos_brutos")
      .select("id")
      .throwOnError();

    expect(data).toHaveLength(1);
  });

  it("rejeita payload sem transcript e sem id (inútil processar)", async () => {
    const result = await processarWebhookPlaud({}, ZAPIER_SECRET, ZAPIER_SECRET, supabase);

    expect(result.aceito).toBe(false);
    expect(result.status).toBe(400);
  });
});
