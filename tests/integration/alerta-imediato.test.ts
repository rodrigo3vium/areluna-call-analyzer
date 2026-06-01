import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispararAlertaSeNecessario } from "@/lib/modules/alerta-imediato";
import { getTestClient, limparDb } from "./setup";

vi.mock("@/lib/modules/email-alerta", () => ({
  notificarScoreBaixo: vi.fn().mockResolvedValue(undefined),
}));

import { notificarScoreBaixo } from "@/lib/modules/email-alerta";

const supabase = getTestClient();

const THRESHOLD = 40;

beforeEach(async () => {
  await limparDb(supabase);

  // Upsert configuracoes singleton com threshold conhecido
  await supabase
    .schema("comercial")
    .from("configuracoes")
    .upsert(
      {
        id: 1,
        threshold_alerta_imediato_whatsapp: THRESHOLD,
        destinatarios_whatsapp: ["head@clinica.com"],
        destinatarios_calls: ["head@clinica.com"],
      },
      { onConflict: "id" },
    )
    .throwOnError();
});

afterEach(async () => {
  await limparDb(supabase);
  vi.clearAllMocks();
});

async function criarLead() {
  const telefone = `+5511${Date.now().toString().slice(-9)}`;
  const { data } = await supabase
    .schema("comercial")
    .from("leads")
    .insert({ nome: "Lead Teste", telefone, status: "em_atendimento", status_origem: "sistema" })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

describe("dispararAlertaSeNecessario", () => {
  it("não dispara quando score está acima do threshold", async () => {
    const leadId = await criarLead();

    await dispararAlertaSeNecessario(
      "whatsapp",
      leadId,
      "João",
      "+5511900000001",
      THRESHOLD + 1,
      supabase,
    );

    expect(notificarScoreBaixo).not.toHaveBeenCalled();
  });

  it("não dispara quando score é igual ao threshold", async () => {
    const leadId = await criarLead();

    await dispararAlertaSeNecessario(
      "whatsapp",
      leadId,
      "João",
      "+5511900000001",
      THRESHOLD,
      supabase,
    );

    expect(notificarScoreBaixo).not.toHaveBeenCalled();
  });

  it("dispara quando score está abaixo do threshold", async () => {
    const leadId = await criarLead();

    await dispararAlertaSeNecessario(
      "whatsapp",
      leadId,
      "Maria",
      "+5511900000002",
      THRESHOLD - 1,
      supabase,
    );

    expect(notificarScoreBaixo).toHaveBeenCalledOnce();
    expect(notificarScoreBaixo).toHaveBeenCalledWith(
      expect.objectContaining({
        id: leadId,
        nome: "Maria",
        score: THRESHOLD - 1,
        tipo: "whatsapp",
        destinatarios: ["head@clinica.com"],
      }),
    );
  });

  it("não dispara quando leadId é null", async () => {
    await dispararAlertaSeNecessario("whatsapp", null, "Anônimo", "+5511900000003", 10, supabase);

    expect(notificarScoreBaixo).not.toHaveBeenCalled();
  });

  it("throttle: segundo alerta com mesmo leadId não dispara no mesmo dia", async () => {
    const leadId = await criarLead();

    await dispararAlertaSeNecessario("whatsapp", leadId, "Ana", "+5511900000004", 10, supabase);
    await dispararAlertaSeNecessario("whatsapp", leadId, "Ana", "+5511900000004", 5, supabase);

    expect(notificarScoreBaixo).toHaveBeenCalledOnce();
  });

  it("throttle é por tipo: whatsapp e call do mesmo lead disparam separados", async () => {
    const leadId = await criarLead();

    await dispararAlertaSeNecessario("whatsapp", leadId, "Carlos", "+5511900000005", 10, supabase);
    await dispararAlertaSeNecessario("call", leadId, "Carlos", "+5511900000005", 10, supabase);

    expect(notificarScoreBaixo).toHaveBeenCalledTimes(2);
  });

  it("não dispara quando não há destinatários configurados", async () => {
    await supabase
      .schema("comercial")
      .from("configuracoes")
      .upsert(
        {
          id: 1,
          threshold_alerta_imediato_whatsapp: THRESHOLD,
          destinatarios_whatsapp: [],
          destinatarios_calls: [],
        },
        { onConflict: "id" },
      )
      .throwOnError();

    const leadId = await criarLead();

    await dispararAlertaSeNecessario("whatsapp", leadId, "Pedro", "+5511900000006", 10, supabase);

    expect(notificarScoreBaixo).not.toHaveBeenCalled();
  });
});
