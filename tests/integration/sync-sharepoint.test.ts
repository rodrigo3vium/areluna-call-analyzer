import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sincronizarSharePoint } from "@/lib/modules/sync-sharepoint";
import type { SharePointFile } from "@/lib/modules/sharepoint-client";
import { getTestClient, limparDb } from "./setup";

// Mock do cliente SharePoint — não bate na API real
vi.mock("@/lib/modules/sharepoint-client", () => ({
  listarArquivosDaPasta: vi.fn(),
  baixarArquivo: vi.fn(),
}));

import { listarArquivosDaPasta } from "@/lib/modules/sharepoint-client";

const supabase = getTestClient();

function makeArquivo(overrides: Partial<SharePointFile> = {}): SharePointFile {
  return {
    id: `file-${Math.random().toString(36).slice(2)}`,
    name: "2026-06-01_Closer-Teste_Cliente-Teste.mp4",
    size: 1024 * 1024,
    createdDateTime: "2026-06-01T10:00:00.000Z",
    webUrl: "https://sharepoint.example.com/file.mp4",
    downloadUrl: "https://cdn.example.com/file.mp4",
    mimeType: "video/mp4",
    ...overrides,
  };
}

beforeEach(async () => {
  await limparDb(supabase);
  vi.clearAllMocks();
});

afterEach(async () => {
  await limparDb(supabase);
});

describe("sincronizarSharePoint", () => {
  it("cria calls pendentes para arquivos válidos com closers cadastrados", async () => {
    // Cadastra closer no banco
    const { data: closer } = await supabase
      .schema("comercial")
      .from("closers")
      .insert({ nome: "Closer Teste", ativo: true })
      .select("id")
      .single()
      .throwOnError();

    const arquivos = [
      makeArquivo({ name: "2026-06-01_Closer-Teste_Cliente-A.mp4" }),
      makeArquivo({ name: "2026-06-01_Closer-Teste_Cliente-B.mp4" }),
      makeArquivo({ name: "2026-06-01_Closer-Teste_Cliente-C.mp4" }),
    ];
    vi.mocked(listarArquivosDaPasta).mockResolvedValue(arquivos);

    const result = await sincronizarSharePoint(supabase);

    expect(result.arquivos_encontrados).toBe(3);
    expect(result.arquivos_novos).toBe(3);
    expect(result.criados).toBe(3);
    expect(result.erros).toHaveLength(0);

    const { data: calls } = await supabase
      .schema("comercial")
      .from("calls")
      .select("transcricao_status, closer_id")
      .throwOnError();

    expect(calls).toHaveLength(3);
    for (const call of calls!) {
      expect(call.transcricao_status).toBe("pendente");
      expect(call.closer_id).toBe(closer!.id);
    }
  });

  it("cria call com status erro para arquivo com nome inválido", async () => {
    vi.mocked(listarArquivosDaPasta).mockResolvedValue([
      makeArquivo({ name: "gravacao-sem-padrao.mp4" }),
    ]);

    const result = await sincronizarSharePoint(supabase);

    expect(result.criados).toBe(1);
    expect(result.erros).toHaveLength(0);

    const { data: calls } = await supabase
      .schema("comercial")
      .from("calls")
      .select("transcricao_status, status_analise, transcricao_erro")
      .throwOnError();

    expect(calls).toHaveLength(1);
    expect(calls![0].transcricao_status).toBe("erro");
    expect(calls![0].status_analise).toBe("erro");
    expect(calls![0].transcricao_erro).toMatch(/padrão/);
  });

  it("cria call com closer_id=null e erro descritivo quando closer não cadastrado", async () => {
    vi.mocked(listarArquivosDaPasta).mockResolvedValue([
      makeArquivo({ name: "2026-06-01_Nao-Cadastrado_Cliente.mp4" }),
    ]);

    const result = await sincronizarSharePoint(supabase);

    expect(result.criados).toBe(1);

    const { data: calls } = await supabase
      .schema("comercial")
      .from("calls")
      .select("closer_id, transcricao_status, transcricao_erro")
      .throwOnError();

    expect(calls![0].closer_id).toBeNull();
    expect(calls![0].transcricao_status).toBe("pendente"); // ainda vai ser transcrita
    expect(calls![0].transcricao_erro).toMatch(/Nao Cadastrado/i);
  });

  it("não duplica call para arquivo já existente (mesmo sharepoint_file_id)", async () => {
    const arquivo = makeArquivo();
    vi.mocked(listarArquivosDaPasta).mockResolvedValue([arquivo]);

    // 1ª execução
    await sincronizarSharePoint(supabase);
    // 2ª execução com mesmo arquivo
    const result = await sincronizarSharePoint(supabase);

    expect(result.arquivos_encontrados).toBe(1);
    expect(result.arquivos_novos).toBe(0);
    expect(result.criados).toBe(0);

    const { data: calls } = await supabase
      .schema("comercial")
      .from("calls")
      .select("id")
      .throwOnError();

    expect(calls).toHaveLength(1);
  });
});
