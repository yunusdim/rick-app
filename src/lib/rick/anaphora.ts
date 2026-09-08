import type { RickMessage } from "@/lib/rick/types";

const REF = /(?:punto|item|ítem|n[uú]mero)\s*(\d+)/i;
const EXPAND = /(?:expand[ií]|desarroll[aá]|el)\s+(\d+)\b/i;

export function anaphoraContext(userTurn: string, messages: RickMessage[]): string {
  const hit = userTurn.match(REF) || userTurn.match(EXPAND);
  if (!hit) return "";
  const n = Number(hit[1]);
  if (!Number.isFinite(n) || n < 1) return "";

  const last = [...messages].reverse().find((m) => numberedList(m.content).length >= n);
  if (!last) {
    return `No hay referente para el punto ${n} en el hilo de este eje. No inventes la lista.`;
  }
  const items = numberedList(last.content);
  const item = items[n - 1];
  return `Punto ${n} del último listado numerado:\n${item}`;
}

function numberedList(text: string): string[] {
  const lines = text.split(/\n/);
  const items: string[] = [];
  for (const line of lines) {
    const m = line.trim().match(/^(?:[-*]|\d+[.)])\s+(.+)/);
    if (m) items.push(m[1].trim());
  }
  return items;
}
