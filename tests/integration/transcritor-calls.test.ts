import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { processarTranscricoesPendentes } from "@/lib/modules/transcritor-calls";
import { getTestClient, limparDb } from "./setup";

// Mocks — não bate na API real
vi.mock("@/lib/modules/sharepoint-client", () => ({
  listarArquivosDaPasta: vi.fn(),
  baixarArquivo: vi.fn(),
  obterDownloadUrl: vi.fn(),
}));
vi.mock("@/lib/modules/transcritor-cloud", () => ({
  transcreverDeURL: vi.fn(),
}));

import { obterDownloadUrl } from "@/lib/modules/sharepoint-client";
import { transcreverDeURL } from "@/lib/modules/transcritor-cloud";

const supabase = getTestClient();

async function criarCallPendente(overrides: Record<string, unknown> = {}) {
  const { data } = await supabase
    .schema("comercial")
    .from("calls")
    .insert({
      sharepoint_file_id: `file-${Math.random().toString(36).slice(2)}`,
      sharepoint_file_name: "2026-06-01_Closer_Cliente.mp4",
      transcricao_status: "pendente",
      status_analise: "aguardando_transcricao",
      ...overrides,
    })
    .select("id")
    .single()
    .throwOnError();
  return data!.id as string;
}

beforeEach(async () => {
  await limparDb(supabase);
  vi.clearAllMocks();
});

afterEach(async () => {
  await limparDb(supabase);
});

describe("processarTranscricoesPendentes", () => {
  it("sucesso: marca concluida + aguardando_analise no mesmo UPDATE", async () => {
    const callId = await criarCallPendente();

    vi.mocked(obterDownloadUrl).mockResolvedValue("https://example.com/file.mp4?token=xyz");
    vi.mocked(transcreverDeURL).mockResolvedValue({
      texto: "Olá, vamos fechar o contrato?",
      duracaoSegundos: 2400,
      custoEstimadoUSD: 0.247,
    });

    const result = await processarTranscricoesPendentes(supabase);

    expect(result.sucesso).toBe(1);
    expect(result.erros).toHaveLength(0);

    const { data: call } = await supabase
      .schema("comercial")
      .from("calls")
      .select("transcricao, transcricao_status, status_analise, transcricao_erro")
      .eq("id", callId)
      .single()
      .throwOnError();

    expect(call!.transcricao_status).toBe("concluida");
    expect(call!.status_analise).toBe("aguardando_analise");
    expect(call!.transcricao).toBe("Olá, vamos fechar o contrato?");
    expect(call!.transcricao_erro).toBeNull();
  });

  it("falha no AssemblyAI: marca erro em transcricao_status e status_analise", async () => {
    const callId = await criarCallPendente();

    vi.mocked(obterDownloadUrl).mockResolvedValue("https://example.com/file.mp4?token=xyz");
    vi.mocked(transcreverDeURL).mockRejectedValue(new Error("AssemblyAI falhou: audio too short"));

    const result = await processarTranscricoesPendentes(supabase);

    expect(result.sucesso).toBe(0);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].call_id).toBe(callId);
    expect(result.erros[0].erro).toMatch(/AssemblyAI falhou/);

    const { data: call } = await supabase
      .schema("comercial")
      .from("calls")
      .select("transcricao_status, status_analise, transcricao_erro")
      .eq("id", callId)
      .single()
      .throwOnError();

    expect(call!.transcricao_status).toBe("erro");
    expect(call!.status_analise).toBe("erro");
    expect(call!.transcricao_erro).toMatch(/AssemblyAI falhou/);
  });

  it("lock otimista: chamadas concorrentes processam calls diferentes", async () => {
    const callId1 = await criarCallPendente();
    const callId2 = await criarCallPendente();

    vi.mocked(obterDownloadUrl).mockResolvedValue("https://example.com/file.mp4?token=xyz");
    vi.mocked(transcreverDeURL).mockResolvedValue({
      texto: "Transcrição OK",
      duracaoSegundos: 1800,
      custoEstimadoUSD: 0.185,
    });

    // Simula duas execuções "simultâneas" (sequenciais no teste mas o lock previne duplicação)
    const [result1, result2] = await Promise.all([
      processarTranscricoesPendentes(supabase),
      processarTranscricoesPendentes(supabase),
    ]);

    const totalSuccesso = result1.sucesso + result2.sucesso;
    // Cada call deve ser processada exatamente 1 vez no total
    expect(totalSuccesso).toBe(2);

    const { data: calls } = await supabase
      .schema("comercial")
      .from("calls")
      .select("id, transcricao_status")
      .in("id", [callId1, callId2])
      .throwOnError();

    for (const call of calls!) {
      expect(call.transcricao_status).toBe("concluida");
    }
  });

  it("retorna vazio quando não há calls pendentes", async () => {
    const result = await processarTranscricoesPendentes(supabase);

    expect(result.processadas).toBe(0);
    expect(result.sucesso).toBe(0);
    expect(result.erros).toHaveLength(0);
  });
});
