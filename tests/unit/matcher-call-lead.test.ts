import { describe, expect, it } from "vitest";
import { classificarCandidatos } from "@/lib/modules/matcher-call-lead";

describe("classificarCandidatos", () => {
  it("retorna sem_candidatos para lista vazia", () => {
    expect(classificarCandidatos([])).toEqual({ tipo: "sem_candidatos" });
  });

  it("retorna alto quando score do primeiro >= threshold", () => {
    const candidatos = [
      { id: "uuid-1", nome: "Maria Silva", telefone: "+5511999990001", score: 0.92 },
      { id: "uuid-2", nome: "Maria Santos", telefone: "+5511999990002", score: 0.65 },
    ];
    const resultado = classificarCandidatos(candidatos, 0.85);
    expect(resultado).toEqual({ tipo: "alto", candidato: candidatos[0] });
  });

  it("retorna ambiguo quando score do primeiro < threshold", () => {
    const candidatos = [
      { id: "uuid-1", nome: "João Teste", telefone: "+5511999990001", score: 0.7 },
      { id: "uuid-2", nome: "João Silva", telefone: "+5511999990002", score: 0.6 },
      { id: "uuid-3", nome: "João Santos", telefone: "+5511999990003", score: 0.5 },
      { id: "uuid-4", nome: "João Outro", telefone: "+5511999990004", score: 0.4 },
    ];
    const resultado = classificarCandidatos(candidatos, 0.85);
    expect(resultado.tipo).toBe("ambiguo");
    if (resultado.tipo === "ambiguo") {
      expect(resultado.top3).toHaveLength(3);
      expect(resultado.top3[0].id).toBe("uuid-1");
    }
  });

  it("usa threshold padrão de 0.85", () => {
    const candidatos = [{ id: "uuid-1", nome: "Test", telefone: "+5511000000001", score: 0.84 }];
    expect(classificarCandidatos(candidatos).tipo).toBe("ambiguo");
  });
});
