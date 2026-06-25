import type { BankAdapter } from "./bank-adapter.js";
import { BankSandboxAdapter } from "./bank-sandbox-adapter.js";
import type { Env } from "../env.js";

export function getBankAdapter(env: Env): BankAdapter {
  switch (env.BANK_ADAPTER) {
    case "sandbox":
      return new BankSandboxAdapter();
    case "ifractal":
      throw new Error("ifractal adapter not yet implemented");
    default:
      throw new Error(`unknown bank adapter: ${env.BANK_ADAPTER}`);
  }
}

export * from "./bank-adapter.js";
