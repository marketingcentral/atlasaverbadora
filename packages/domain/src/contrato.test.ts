import { describe, expect, it } from "vitest";
import {
  comprometeMargem,
  situacaoContaComoAverbado,
  situacaoTerminal,
  deriveTipoMargem,
  deriveProdutoLabel,
  isContratoTelemedicina,
  nomeExibicaoBanco,
} from "./contrato.js";

// ============================================================
// comprometeMargem — verdade quando margem esta travada.
// ============================================================
describe("comprometeMargem", () => {
  const trava = [
    "Aguardando Confirmação do Deferimento",
    "Aprovado",
    "Ativo",
    "Averbado",
    "Suspenso",
    "Formalizado",
    "ativo", // lowercase
    "AVERBADO", // uppercase
  ];
  for (const s of trava) {
    it(`bloqueia margem em "${s}"`, () => expect(comprometeMargem(s)).toBe(true));
  }

  const libera = [
    "Expirado",
    "Cancelado",
    "Quitado",
    "Recusado",
    "Reprovado pela análise",
    "Rejeitado",
    "Negado pelo banco",
    "Estornado",
    "Falha em folha",
    "Em cobrança direta",
  ];
  for (const s of libera) {
    it(`libera margem em "${s}"`, () => expect(comprometeMargem(s)).toBe(false));
  }

  it("string vazia libera", () => expect(comprometeMargem("")).toBe(true)); // documenta comportamento atual — default confortavel
  // (nota: nao ha estado vazio no fluxo real; se aparecer, cai em "bloqueia" por default
  // pra nao subestimar o comprometido)
});

// ============================================================
// situacaoContaComoAverbado — KPI de conversao/ticket medio/volume.
// ============================================================
describe("situacaoContaComoAverbado", () => {
  it.each([
    ["Ativo", true],
    ["Averbado", true],
    ["Quitado", true],
    ["averb", true], // substring
    ["quitado", true],
    ["Aprovado", false], // aprovado mas ainda nao averbou
    ["Aguardando", false],
    ["Cancelado", false],
    ["Falha em folha", false],
    ["Em cobrança direta", false],
    ["Expirado", false],
  ])("%s -> %s", (s, esperado) => expect(situacaoContaComoAverbado(s)).toBe(esperado));
});

// ============================================================
// situacaoTerminal — nao muda mais de estado por fluxo natural.
// ============================================================
describe("situacaoTerminal", () => {
  it.each([
    ["Cancelado", true],
    ["Expirado", true],
    ["Quitado", true],
    ["Recusado", true],
    ["Reprovado", true],
    ["Rejeitado", true],
    ["Negado", true],
    ["Estornado", true],
    // Nao-terminais:
    ["Ativo", false],
    ["Averbado", false],
    ["Aprovado", false],
    ["Aguardando", false],
    ["Falha em folha", false], // pode ser reenviado
    ["Em cobrança direta", false],
    ["Suspenso", false],
  ])("%s -> %s", (s, esperado) => expect(situacaoTerminal(s)).toBe(esperado));
});

// ============================================================
// deriveTipoMargem — bucket EMPRESTIMO/CARTAO_CONSIGNADO/CARTAO_BENEFICIOS.
// ============================================================
describe("deriveTipoMargem", () => {
  it("respeita tipoMargem explicito quando presente", () => {
    expect(deriveTipoMargem({ tipoMargem: "CARTAO_BENEFICIOS", tipoContrato: "ECONSIGNADO" })).toBe("CARTAO_BENEFICIOS");
    expect(deriveTipoMargem({ tipoMargem: "EMPRESTIMO", tipoContrato: "ECONSIGNADO" })).toBe("EMPRESTIMO");
  });
  it("infere CARTAO_CONSIGNADO pra ECONSIGNADO sem tipoMargem", () => {
    expect(deriveTipoMargem({ tipoContrato: "ECONSIGNADO" })).toBe("CARTAO_CONSIGNADO");
  });
  it("infere EMPRESTIMO pra qualquer outro tipoContrato", () => {
    expect(deriveTipoMargem({ tipoContrato: "EMPRESTIMO" })).toBe("EMPRESTIMO");
    expect(deriveTipoMargem({ tipoContrato: "REFIN" })).toBe("EMPRESTIMO");
    expect(deriveTipoMargem({})).toBe("EMPRESTIMO");
  });
});

// ============================================================
// deriveProdutoLabel — ordem de precedencia 1..7.
// ============================================================
describe("deriveProdutoLabel", () => {
  it("1. observacoes com telemedicina vence tudo", () => {
    expect(deriveProdutoLabel({
      observacoes: "plano de telemedicina Atlas 12 meses",
      tipoContrato: "EMPRESTIMO",
      tipoMargem: "CARTAO_BENEFICIOS", // ignorado
      bancoOrigem: "Caixa", // ignorado
    })).toBe("TELEMEDICINA");
  });

  it("2. observacoes com refinancia (explicito) vira REFIN", () => {
    expect(deriveProdutoLabel({
      observacoes: "refinancia no mesmo banco",
      tipoContrato: "REFIN",
    })).toBe("REFIN");
  });

  it("3. bancoOrigem presente vira PORTABILIDADE (mesmo com REFIN puro)", () => {
    expect(deriveProdutoLabel({
      bancoOrigem: "104-Caixa Economica",
      tipoContrato: "REFIN",
    })).toBe("PORTABILIDADE");
  });

  it("3b. observacoes 'portabilidade' vira PORTABILIDADE", () => {
    expect(deriveProdutoLabel({
      observacoes: "portabilidade solicitada pelo servidor",
      tipoContrato: "EMPRESTIMO",
    })).toBe("PORTABILIDADE");
  });

  it("4. REFIN cru (sem bancoOrigem nem observacoes) cai em PORTABILIDADE", () => {
    expect(deriveProdutoLabel({ tipoContrato: "REFIN" })).toBe("PORTABILIDADE");
  });

  it("5. tipoMargem CARTAO_BENEFICIOS vira CARTAO_BENEFICIO", () => {
    expect(deriveProdutoLabel({
      tipoContrato: "ECONSIGNADO",
      tipoMargem: "CARTAO_BENEFICIOS",
    })).toBe("CARTAO_BENEFICIO");
  });

  it("6a. ECONSIGNADO default vira CARTAO_CONSIGNADO", () => {
    expect(deriveProdutoLabel({ tipoContrato: "ECONSIGNADO" })).toBe("CARTAO_CONSIGNADO");
  });

  it("6b. tipoMargem CARTAO_CONSIGNADO (com tipoContrato EMPRESTIMO) vira CARTAO_CONSIGNADO", () => {
    expect(deriveProdutoLabel({
      tipoContrato: "EMPRESTIMO",
      tipoMargem: "CARTAO_CONSIGNADO",
    })).toBe("CARTAO_CONSIGNADO");
  });

  it("7. default (EMPRESTIMO simples) fica EMPRESTIMO", () => {
    expect(deriveProdutoLabel({ tipoContrato: "EMPRESTIMO" })).toBe("EMPRESTIMO");
    expect(deriveProdutoLabel({})).toBe("EMPRESTIMO");
  });
});

// ============================================================
// isContratoTelemedicina + nomeExibicaoBanco — relabel.
// ============================================================
describe("isContratoTelemedicina", () => {
  it("detecta via tipoContrato=TELEMEDICINA case-insensitive", () => {
    expect(isContratoTelemedicina({ tipoContrato: "TELEMEDICINA" })).toBe(true);
    expect(isContratoTelemedicina({ tipoContrato: "telemedicina" })).toBe(true);
  });
  it("detecta via observacoes com 'telemedicina'", () => {
    expect(isContratoTelemedicina({ tipoContrato: "EMPRESTIMO", observacoes: "assinou plano Telemedicina" })).toBe(true);
  });
  it("nao detecta contrato normal", () => {
    expect(isContratoTelemedicina({ tipoContrato: "EMPRESTIMO", observacoes: "credito consignado" })).toBe(false);
  });
});

describe("nomeExibicaoBanco", () => {
  const resolver = (id: number) => (id === 1 ? "ATLAS TECH" : id === 2 ? "Banco Delta" : `Banco ${id}`);

  it("relabela pra 'Telemedicina Atlas' quando telemedicina", () => {
    expect(nomeExibicaoBanco({ bancoId: 1, tipoContrato: "TELEMEDICINA" }, resolver)).toBe("Telemedicina Atlas");
    expect(nomeExibicaoBanco({ bancoId: 1, observacoes: "telemedicina 12x" }, resolver)).toBe("Telemedicina Atlas");
  });
  it("delega pro resolver quando contrato normal", () => {
    expect(nomeExibicaoBanco({ bancoId: 1, tipoContrato: "EMPRESTIMO" }, resolver)).toBe("ATLAS TECH");
    expect(nomeExibicaoBanco({ bancoId: 2 }, resolver)).toBe("Banco Delta");
    expect(nomeExibicaoBanco({ bancoId: 99 }, resolver)).toBe("Banco 99");
  });
});
