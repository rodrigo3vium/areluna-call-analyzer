import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { recomputarStatusLead } from "@/lib/modules/lead-status-machine";
import { getTestClient, limparDb } from "./setup";

const supabase = getTestClient();

beforeEach(async () => {
  await limparDb(supabase);
});

afterEach(async () => {
  await limparDb(supabase);
});

async function criarLead(status: string, statusOrigem: "sistema" | "manual" = "sistema") {
  const telefone = `+5511${Date.now().toString().slice(-9)}`;
  const { data } = await supabase
    .schema("comercial")
    .from("leads")
    .insert({ nome: "Lead Teste", telefone, status, status_origem: statusOrigem })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

async function getStatus(leadId: string) {
  const { data } = await supabase
    .schema("comercial")
    .from("leads")
    .select("status, status_origem")
    .eq("id", leadId)
    .single()
    .throwOnError();
  return data!;
}

describe("recomputarStatusLead", () => {
  it("avança status de novo para agendou no DB", async () => {
    const leadId = await criarLead("novo");

    await recomputarStatusLead(leadId, "agendou", supabase);

    const { status } = await getStatus(leadId);
    expect(status).toBe("agendou");
  });

  it("avança da cadeia completa: novo → em_atendimento → agendou → compareceu → fechou", async () => {
    const leadId = await criarLead("novo");

    for (const s of ["em_atendimento", "agendou", "compareceu", "fechou"] as const) {
      await recomputarStatusLead(leadId, s, supabase);
      const { status } = await getStatus(leadId);
      expect(status).toBe(s);
    }
  });

  it("não retrocede status: agendou não volta para em_atendimento", async () => {
    const leadId = await criarLead("agendou");

    await recomputarStatusLead(leadId, "em_atendimento", supabase);

    const { status } = await getStatus(leadId);
    expect(status).toBe("agendou");
  });

  it("não retrocede: fechou não volta para perdido", async () => {
    const leadId = await criarLead("fechou");

    await recomputarStatusLead(leadId, "perdido", supabase);

    const { status } = await getStatus(leadId);
    expect(status).toBe("fechou");
  });

  it("respeita status_origem=manual: não altera mesmo que status sugerido seja maior", async () => {
    const leadId = await criarLead("novo", "manual");

    await recomputarStatusLead(leadId, "fechou", supabase);

    const lead = await getStatus(leadId);
    expect(lead.status).toBe("novo");
    expect(lead.status_origem).toBe("manual");
  });

  it("perdido avança sobre sem_resposta", async () => {
    const leadId = await criarLead("sem_resposta");

    await recomputarStatusLead(leadId, "perdido", supabase);

    const { status } = await getStatus(leadId);
    expect(status).toBe("perdido");
  });

  it("sem_resposta avança sobre em_atendimento", async () => {
    const leadId = await criarLead("em_atendimento");

    await recomputarStatusLead(leadId, "sem_resposta", supabase);

    const { status } = await getStatus(leadId);
    expect(status).toBe("sem_resposta");
  });
});
