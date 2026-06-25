import { describe, expect, it } from "vitest";
import { allowedEvents, nextState } from "./state-machine.js";

describe("proposta state machine", () => {
  it("transitions simulada -> criada on aceitar_simulacao", () => {
    expect(nextState("proposta", "simulada", "aceitar_simulacao")).toBe("criada");
  });

  it("returns null for invalid transition", () => {
    expect(nextState("proposta", "ativa", "aceitar_simulacao")).toBeNull();
  });

  it("lists allowed events from a state", () => {
    const events = allowedEvents("proposta", "em_analise");
    expect(events).toContain("banco_aprova");
    expect(events).toContain("banco_rejeita");
  });
});
