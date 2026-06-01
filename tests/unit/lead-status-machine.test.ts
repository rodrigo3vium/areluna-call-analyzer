import { describe, expect, it } from "vitest";
import { calcularNovoStatus } from "@/lib/modules/lead-status-machine";

describe("calcularNovoStatus", () => {
  it("avança status quando sugerido tem prioridade maior", () => {
    expect(calcularNovoStatus("novo", "sistema", "agendou")).toBe("agendou");
    expect(calcularNovoStatus("em_atendimento", "sistema", "agendou")).toBe("agendou");
    expect(calcularNovoStatus("agendou", "sistema", "compareceu")).toBe("compareceu");
    expect(calcularNovoStatus("compareceu", "sistema", "fechou")).toBe("fechou");
  });

  it("não retrocede quando sugerido tem prioridade menor", () => {
    expect(calcularNovoStatus("agendou", "sistema", "em_atendimento")).toBeNull();
    expect(calcularNovoStatus("agendou", "sistema", "sem_resposta")).toBeNull();
    expect(calcularNovoStatus("fechou", "sistema", "perdido")).toBeNull();
  });

  it("não altera quando sugerido é igual ao atual", () => {
    expect(calcularNovoStatus("agendou", "sistema", "agendou")).toBeNull();
    expect(calcularNovoStatus("novo", "sistema", "novo")).toBeNull();
  });

  it("não altera quando status_origem é manual", () => {
    expect(calcularNovoStatus("novo", "manual", "fechou")).toBeNull();
    expect(calcularNovoStatus("em_atendimento", "manual", "agendou")).toBeNull();
  });

  it("perdido avança sobre compareceu, agendou, sem_resposta", () => {
    expect(calcularNovoStatus("compareceu", "sistema", "perdido")).toBe("perdido");
    expect(calcularNovoStatus("agendou", "sistema", "perdido")).toBe("perdido");
    expect(calcularNovoStatus("sem_resposta", "sistema", "perdido")).toBe("perdido");
  });

  it("fechou vence qualquer outro status", () => {
    const todos = [
      "novo",
      "em_atendimento",
      "sem_resposta",
      "agendou",
      "compareceu",
      "perdido",
    ] as const;
    for (const atual of todos) {
      expect(calcularNovoStatus(atual, "sistema", "fechou")).toBe("fechou");
    }
  });
});
