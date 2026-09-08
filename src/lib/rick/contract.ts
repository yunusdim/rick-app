import type { AssembledSection } from "@/lib/rick/types";

const REQUIRED = [
  "RICK RUNTIME v9",
  "IDENTIDAD",
  "RECORRIDO",
  "DRIFT STATUS",
  "CANONICAL",
  "SESSION HISTORY",
  "MEMORY FACTS",
  "INSTRUCTIONS",
  "INPUT",
  "FOCUS",
] as const;

export function validateContract(sections: AssembledSection[]): { ok: boolean; detail: string } {
  const names = new Set(sections.map((s) => s.name));
  const missing = REQUIRED.filter((n) => !names.has(n));
  if (missing.length) return { ok: false, detail: `faltan ${missing.join(", ")}` };
  const empty = sections.filter((s) => s.bytes <= 0).map((s) => s.name);
  if (empty.length) return { ok: false, detail: `bytes 0: ${empty.join(", ")}` };
  return { ok: true, detail: "OK" };
}
