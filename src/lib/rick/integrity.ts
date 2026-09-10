export const DOC_MAX = 20000;
export const CANON_PACK_MAX = 24000;

export function acceptReceived(body: string): { ok: true; stored: string } | { ok: false; reason: string } {
  if (body.length > DOC_MAX) {
    return { ok: false, reason: `no cabe entero (${body.length} > ${DOC_MAX}). No se recortó.` };
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
    if (stopped) {
      omitted.push({ title: b.title, bytes: b.body.length });
      continue;
    }
    const sep = lines.length ? 2 : 0;
    if (used + sep + line.length > budget) {
      omitted.push({ title: b.title, bytes: b.body.length });
      stopped = true;
      continue;
    }
    lines.push(line);
    used += sep + line.length;
    if (b.habitat) habitatOk = true;
  }

  return {
    lines,
    omitted,
    habitatOk,
    integral: omitted.length === 0 && habitatOk,
  };
}
