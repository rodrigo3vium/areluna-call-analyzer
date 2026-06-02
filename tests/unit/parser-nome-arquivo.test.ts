import { describe, expect, it } from "vitest";
import { parsearNomeArquivo } from "@/lib/modules/parser-nome-arquivo";

describe("parsearNomeArquivo", () => {
  it("parseia nome completo com extensão mp4", () => {
    const r = parsearNomeArquivo("2026-06-01_Joao-Silva_Maria-Joao-Pereira.mp4");
    expect(r.erro).toBeNull();
    expect(r.nomeCloserBruto).toBe("Joao Silva");
    expect(r.nomeClienteBruto).toBe("Maria Joao Pereira");
    expect(r.dataGravacao).toEqual(new Date("2026-06-01T00:00:00.000Z"));
  });

  it("parseia extensão diferente (mov)", () => {
    const r = parsearNomeArquivo("2026-06-01_Joao-Silva_Maria-Joao-Pereira.mov");
    expect(r.erro).toBeNull();
    expect(r.nomeCloserBruto).toBe("Joao Silva");
  });

  it("retorna erro quando nome não segue o padrão", () => {
    const r = parsearNomeArquivo("gravacao-call.mp4");
    expect(r.erro).not.toBeNull();
    expect(r.erro).toMatch(/padrão/);
    expect(r.dataGravacao).toBeNull();
    expect(r.nomeCloserBruto).toBeNull();
  });

  it("retorna erro de data inválida (mês 13)", () => {
    const r = parsearNomeArquivo("2026-13-45_Joao_Cliente.mp4");
    // Regex passa (formato correto), mas a data é inválida
    expect(r.erro).not.toBeNull();
    expect(r.erro).toMatch(/[Dd]ata/);
  });

  it("parseia extensão em maiúsculas (MP4)", () => {
    const r = parsearNomeArquivo("2026-06-01_Joao_Cliente.MP4");
    expect(r.erro).toBeNull();
    expect(r.nomeCloserBruto).toBe("Joao");
    expect(r.nomeClienteBruto).toBe("Cliente");
  });
});
