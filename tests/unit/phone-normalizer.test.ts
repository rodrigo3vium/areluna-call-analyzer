import { describe, expect, it } from "vitest";
import { normalizar } from "@/lib/phone";

// Todos os formatos devem produzir o mesmo E.164 para o mesmo número
const NUMERO_REFERENCIA = "+5511999999999";

describe("normalizar", () => {
  it("converte formato Evolution JID para E.164", () => {
    expect(normalizar("5511999999999@s.whatsapp.net")).toBe(NUMERO_REFERENCIA);
  });

  it("converte número com +55 para E.164", () => {
    expect(normalizar("+5511999999999")).toBe(NUMERO_REFERENCIA);
  });

  it("converte número sem + (55 + DDD + número) para E.164", () => {
    expect(normalizar("5511999999999")).toBe(NUMERO_REFERENCIA);
  });

  it("converte DDD + número sem código de país para E.164", () => {
    expect(normalizar("11999999999")).toBe(NUMERO_REFERENCIA);
  });

  it("converte formato (DDD) 9xxxx-xxxx para E.164", () => {
    expect(normalizar("(11) 99999-9999")).toBe(NUMERO_REFERENCIA);
  });

  it("converte formato com espaços para E.164", () => {
    expect(normalizar("11 99999 9999")).toBe(NUMERO_REFERENCIA);
  });

  it("retorna null para número muito curto", () => {
    expect(normalizar("123")).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(normalizar("")).toBeNull();
  });

  it("retorna null para string sem dígitos", () => {
    expect(normalizar("abc")).toBeNull();
  });

  it("trata JID de grupo (@g.us) retornando null", () => {
    expect(normalizar("5511999999999-1234567890@g.us")).toBeNull();
  });

  it("normaliza número de outro DDD para E.164 correto", () => {
    expect(normalizar("21987654321")).toBe("+5521987654321");
  });

  it("produz E.164 idêntico para todos os formatos do mesmo número", () => {
    const formatos = [
      "5511999999999@s.whatsapp.net",
      "+5511999999999",
      "5511999999999",
      "11999999999",
      "(11) 99999-9999",
    ];
    const resultados = formatos.map((f) => normalizar(f));
    expect(new Set(resultados).size).toBe(1);
    expect(resultados[0]).toBe(NUMERO_REFERENCIA);
  });
});
