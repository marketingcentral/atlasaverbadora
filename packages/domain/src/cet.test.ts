import { describe, expect, it } from "vitest";
import { calcCET, calcPMT } from "./cet.js";

describe("calcPMT", () => {
  it("computes a fixed installment correctly", () => {
    // Formula Price: PMT = (VP * i) / (1 - (1+i)^-n).
    // 10000, 36 parcelas, 1.8% a.m. -> 379.83 (nao 382.91 — teste original tinha valor colado errado).
    const pmt = calcPMT(10000, 36, 0.018);
    expect(pmt).toBeCloseTo(379.83, 1);
  });
});

describe("calcCET", () => {
  it("returns CET > taxa nominal when IOF is applied", () => {
    const r = calcCET({ valor: 8500, parcelas: 36, taxaMensal: 0.0179 });
    expect(r.mensal).toBeGreaterThan(0.0179);
    expect(r.anual).toBeGreaterThan(0.21);
  });

  it("rejects when liquid amount would be <= 0", () => {
    expect(() => calcCET({ valor: 100, parcelas: 12, taxaMensal: 0.02, iof: 200 })).toThrow();
  });
});
