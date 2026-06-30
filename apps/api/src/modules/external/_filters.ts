// Shared query-filter helpers for the external API list endpoints.
// Keeps filtering consistent across layers and lets us echo applied filters in `_meta`.

import type { Context } from "hono";
import { CONVENIOS_MOCK } from "../portal-banco/fixtures.js";

// Unicode combining diacritical marks (U+0300–U+036F) — stripped for accent-insensitive search.
const DIACRITICS = /[̀-ͯ]/g;

/** Read a query param, trimmed; returns undefined when absent/blank. */
export function qparam(c: Context, name: string): string | undefined {
  const v = c.req.query(name)?.trim();
  return v ? v : undefined;
}

/** Lowercase + strip diacritics so "Palhoça" matches "palhoca". */
export function norm(s: string): string {
  return s.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
}

/** Case/accent-insensitive "contains" match for free-text filters. */
export function textIncludes(haystack: string, needle: string): boolean {
  return norm(haystack).includes(norm(needle));
}

/**
 * A bank has no city of its own — it reaches a city through the convenios it
 * participates in (banco × prefeitura). This resolves whether a bank operates
 * in a given uf/cidade by scanning CONVENIOS_MOCK.
 */
export function bancoAtendeLocal(bancoId: number, filtro: { uf?: string; cidade?: string }): boolean {
  return CONVENIOS_MOCK.some(
    (cv) =>
      cv.bancoId === bancoId &&
      (!filtro.uf || norm(cv.uf) === norm(filtro.uf)) &&
      (!filtro.cidade || textIncludes(cv.prefeitura, filtro.cidade)),
  );
}

/** Build a compact `filtros` object for `_meta`, omitting blank entries. */
export function appliedFilters(entries: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(entries)) if (v) out[k] = v;
  return out;
}
