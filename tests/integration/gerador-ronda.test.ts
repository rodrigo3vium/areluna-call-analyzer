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

async function criarCloser(nome: string) {
  const { data } = await supabase
    .schema("comercial")
    .from("closers")
    .insert({ nome, ativo: true })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

async function criarCallAnalisada(
  closerId: string | null,
  score: number,
  classificacao: "EXCELENTE" | "BOM" | "REGULAR" | "INSUFICIENTE",
  dataGravacao = "2025-01-08T10:00:00.000Z",
) {
  const { data } = await supabase
    .schema("comercial")
    .from("calls")
    .insert({
      closer_id: closerId,
      sharepoint_file_id: `file-${Math.random()}`,
      sharepoint_file_name: "call-teste.mp4",
      data_gravacao: dataGravacao,
      score,
      classificacao,
      status_analise: "analisada",
      transcricao_status: "concluida",
      diagnostico_ia: classificacao === "INSUFICIENTE" ? "Precisa melhorar" : null,
    })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

describe("gerarRonda calls", () => {
  it("cria ronda vazia quando não há calls analisadas no período", async () => {
    const resultado = await gerarRonda(PERIODO_INICIO, PERIODO_FIM, supabase);

    expect(resultado.vazia).toBe(true);
    expect(resultado.rondaId).toBeTruthy();

    const { data: ronda } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("*")
      .eq("id", resultado.rondaId)
      .single()
      .throwOnError();

    expect(ronda!.tipo).toBe("calls");
    expect(ronda!.vazia).toBe(true);
    expect(ronda!.status).toBe("gerada");
    expect((ronda!.snapshot as { total_calls: number }).total_calls).toBe(0);
  });

  it("agrega scores e classificações corretamente", async () => {
    const closerId = await criarCloser("Ana Costa");
    await criarCallAnalisada(closerId, 85, "EXCELENTE");
    await criarCallAnalisada(closerId, 20, "INSUFICIENTE");
    await criarCallAnalisada(null, 65, "BOM");

    const resultado = await gerarRonda(PERIODO_INICIO, PERIODO_FIM, supabase);
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
      distribuicao_classificacao: Record<string, number>;
      calls_insuficientes: { score: number | null }[];
    };

    expect(snap.total_calls).toBe(3);
    expect(snap.score_medio).toBeCloseTo(56.7, 0);
    expect(snap.distribuicao_classificacao.INSUFICIENTE).toBe(1);
    expect(snap.distribuicao_classificacao.EXCELENTE).toBe(1);
    expect(snap.calls_insuficientes).toHaveLength(1);
    expect(snap.calls_insuficientes[0].score).toBe(20);
  });

  it("idempotente: executar duas vezes não duplica a ronda", async () => {
    const resultado1 = await gerarRonda(PERIODO_INICIO, PERIODO_FIM, supabase);
    const resultado2 = await gerarRonda(PERIODO_INICIO, PERIODO_FIM, supabase);

    expect(resultado1.rondaId).toBe(resultado2.rondaId);

    const { data: rondas } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("id")
      .eq("tipo", "calls")
      .eq("periodo_inicio", PERIODO_INICIO.toISOString())
      .throwOnError();

    expect(rondas).toHaveLength(1);
  });

  it("agrupa por closer corretamente", async () => {
    const closerId1 = await criarCloser("Bruno Lima");
    const closerId2 = await criarCloser("Carla Nunes");
    await criarCallAnalisada(closerId1, 80, "EXCELENTE");
    await criarCallAnalisada(closerId1, 60, "BOM");
    await criarCallAnalisada(closerId2, 30, "INSUFICIENTE");

    const resultado = await gerarRonda(PERIODO_INICIO, PERIODO_FIM, supabase);

    const { data: ronda } = await supabase
      .schema("comercial")
      .from("rondas")
      .select("snapshot")
      .eq("id", resultado.rondaId)
      .single()
      .throwOnError();

    const snap = ronda!.snapshot as {
      por_closer: { closer_nome: string; total: number; score_medio: number }[];
    };

    expect(snap.por_closer).toHaveLength(2);
    const bruno = snap.por_closer.find((c) => c.closer_nome === "Bruno Lima");
    expect(bruno?.total).toBe(2);
    expect(bruno?.score_medio).toBe(70);
  });
});
