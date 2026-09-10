import { utf8Bytes } from "@/lib/rick/bytes";

export const DOC_MAX = 20000;
export const CANON_PACK_MAX = 24000;

export function acceptReceived(body: string): { ok: true; stored: string } | { ok: false; reason: string } {
  const n = utf8Bytes(body);
  if (n > DOC_MAX) {
    return { ok: false, reason: `no cabe entero (${n} > ${DOC_MAX} bytes UTF-8). No se recortó.` };
  }
  return { ok: true, stored: body };
}

export type CanonBlock = {
  title: string;
  body: string;
  habitat: boolean;
  domainName: string;
};

export function packCanon(
  blocks: CanonBlock[],
  budget = CANON_PACK_MAX,
): {
  lines: string[];
  omitted: { title: string; bytes: number }[];
  habitatOk: boolean;
  integral: boolean;
} {
  const lines: string[] = [];
  const omitted: { title: string; bytes: number }[] = [];
  let used = 0;
  let habitatOk = false;
  let stopped = false;

  for (const b of blocks) {
    const line = b.habitat
      ? `[CANONICAL · hábitat · ${b.title}]\n${b.body}`
      : `[CANONICAL · ${b.domainName} · ${b.title}]\n${b.body}`;
    const weight = utf8Bytes(line);
    if (stopped) {
      omitted.push({ title: b.title, bytes: utf8Bytes(b.body) });
      continue;
    }
    const sep = lines.length ? 2 : 0;
    if (used + sep + weight > budget) {
      omitted.push({ title: b.title, bytes: utf8Bytes(b.body) });
      stopped = true;
      continue;
    }
    lines.push(line);
    used += sep + weight;
    if (b.habitat) habitatOk = true;
  }

  return {
    lines,
    omitted,
    habitatOk,
    integral: omitted.length === 0 && habitatOk,
  };
}
