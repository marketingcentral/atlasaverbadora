import { describe, expect, it } from "vitest";
import { margemTotal, margemDisponivel, percentualUso, limitePercentual } from "./margem.js";

describe("limitePercentual", () => {
  it("aplica os 3 buckets regulados", () => {
    expect(limitePercentual("EMPRESTIMO")).toBe(0.35);
    expect(limitePercentual("CARTAO_CONSIGNADO")).toBe(0.05);
    expect(limitePercentual("CARTAO_BENEFICIOS")).toBe(0.05);
  });
});

describe("margemTotal", () => {
  it("35% sobre salario liquido pra emprestimo", () => {
    expect(margemTotal(3000, "EMPRESTIMO")).toBeCloseTo(1050);
    expect(margemTotal(10000, "EMPRESTIMO")).toBeCloseTo(3500);
  });
  it("5% pra cartao consignado e beneficio", () => {
    expect(margemTotal(3000, "CARTAO_CONSIGNADO")).toBeCloseTo(150);
    expect(margemTotal(3000, "CARTAO_BENEFICIOS")).toBeCloseTo(150);
  });
  it("salario zero -> total zero (nao NaN)", () => {
    expect(margemTotal(0, "EMPRESTIMO")).toBe(0);
  });
});

describe("margemDisponivel", () => {
  it("desconta comprometido do total", () => {
    // salario 3000, teto 35% = 1050. Ja usou 400 -> sobra 650.
    expect(margemDisponivel(3000, 400, "EMPRESTIMO")).toBeCloseTo(650);
  });
  it("comprometido > total nao vira negativo (retorna 0)", () => {
    expect(margemDisponivel(3000, 2000, "EMPRESTIMO")).toBe(0);
    expect(margemDisponivel(1000, 999999, "CARTAO_CONSIGNADO")).toBe(0);
  });
  it("comprometido zero -> disponivel = total", () => {
    expect(margemDisponivel(5000, 0, "EMPRESTIMO")).toBeCloseTo(1750);
  });
  it("salario zero + comprometido zero -> 0", () => {
    expect(margemDisponivel(0, 0, "EMPRESTIMO")).toBe(0);
  });
});

describe("percentualUso", () => {
  it("razao comprometido/total capada em 100%", () => {
    expect(percentualUso(3000, 500, "EMPRESTIMO")).toBeCloseTo(500 / 1050);
    expect(percentualUso(3000, 999999, "EMPRESTIMO")).toBe(1); // acima do teto trava em 1
  });
  it("salario zero retorna 0 (nao divide por zero)", () => {
    expect(percentualUso(0, 500, "EMPRESTIMO")).toBe(0);
  });
});
