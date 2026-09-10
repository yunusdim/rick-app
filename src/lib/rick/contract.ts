import type { AssembledSection } from "@/lib/rick/types";
import { orderOk } from "@/lib/rick/assemble";

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

const OPTIONAL = new Set(["ABSTENCION", "META", "REFERENTES", "CONTEXTO 2"]);
const ALLOWED = new Set<string>([...REQUIRED, ...OPTIONAL]);

export function validateContract(sections: AssembledSection[]): { ok: boolean; detail: string } {
  const names = sections.map((s) => s.name);
  for (const n of names) {
    if (!ALLOWED.has(n)) return { ok: false, detail: `sección extra ${n}` };
  }
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  for (const n of REQUIRED) {
    const c = counts.get(n) ?? 0;
    if (c === 0) return { ok: false, detail: `faltan ${n}` };
    if (c !== 1) return { ok: false, detail: `duplicada ${n}` };
  }
  for (const n of OPTIONAL) {
    if ((counts.get(n) ?? 0) > 1) return { ok: false, detail: `duplicada ${n}` };
  }
  const empty = sections.filter((s) => s.bytes <= 0).map((s) => s.name);
  if (empty.length) return { ok: false, detail: `bytes 0: ${empty.join(", ")}` };
  const orden = orderOk(sections);
  if (!orden.ok) return { ok: false, detail: `orden ${orden.detail}` };
  return { ok: true, detail: "OK" };
}
