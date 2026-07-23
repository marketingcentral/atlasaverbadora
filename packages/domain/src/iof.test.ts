import { describe, expect, it } from "vitest";
import { calcIOF } from "./cet.js";

// IOF consignado = 0.0038 * valor (fixo) + 0.000082 * valor * prazoDias.
// prazoDias = min(parcelas * 30, 365). Fixo BACEN Res. 3.517/2007.

describe("calcIOF", () => {
  it("prazoDias cap em 365 (parcelas >= 13 usam 365 dias)", () => {
    // 12 parcelas = 360 dias (abaixo do cap). 13+ = 365 dias.
    const iof13 = calcIOF(10000, 13);
    const iof24 = calcIOF(10000, 24);
    const iof60 = calcIOF(10000, 60);
    expect(iof24).toBeCloseTo(iof13, 4); // ambos usam cap 365
    expect(iof60).toBeCloseTo(iof13, 4);
  });

  it("valor 10000, 12 parcelas -> IOF conhecido (360 dias)", () => {
    // 10000*0.0038 + 10000*0.000082*360 = 38 + 295.2 = 333.2
    expect(calcIOF(10000, 12)).toBeCloseTo(333.2, 1);
  });

  it("valor 10000, 13 parcelas -> IOF no cap 365", () => {
    // 10000*0.0038 + 10000*0.000082*365 = 38 + 299.3 = 337.3
    expect(calcIOF(10000, 13)).toBeCloseTo(337.3, 1);
  });

  it("valor 10000, 6 parcelas -> IOF proporcional aos 180 dias", () => {
    // 10000*0.0038 + 10000*0.000082*180 = 38 + 147.6 = 185.6
    expect(calcIOF(10000, 6)).toBeCloseTo(185.6, 1);
  });

  it("valor 100000, 60 parcelas -> escala linear com valor", () => {
    const iof10k = calcIOF(10000, 60);
    const iof100k = calcIOF(100000, 60);
    expect(iof100k).toBeCloseTo(iof10k * 10, 1);
  });

  it("valor zero -> IOF zero", () => {
    expect(calcIOF(0, 12)).toBe(0);
  });

  it("parcelas 1000 (absurdo) ainda capa em 365 dias", () => {
    // Nao explode nem overflow — mesmo IOF que 13 parcelas.
    const iof = calcIOF(10000, 1000);
    expect(iof).toBeCloseTo(calcIOF(10000, 13), 1);
  });
});
