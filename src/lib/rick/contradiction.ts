import { overlap, tokens } from "@/lib/rick/tokens";
import { CANON_BLOCK, CANON_WARN } from "@/lib/rick/types";
import { normalizeContent } from "@/lib/rick/normalize";

const NEG = /\b(no|nunca|jamas|falso|incorrecto|mentira|error|mal|wrong)\b/i;
const SUB = /\b(reemplaz|sustitu|elimin|descart|abandon|prescind|replace|substitute)\w*/i;

export function hasNegationOrSub(text: string) {
  return NEG.test(text) || SUB.test(text);
}

export function contradictionScore(
  text: string,
  canon: string,
  otherCanon = "",
): { score: number; type: "directa" | "contextual" | "ninguna" } {
  const src = normalizeContent(text);
  const axis = normalizeContent(canon);
  if (!axis || tokens(axis).size < 4) {
    return { score: 0, type: "ninguna" };
  }
  if (!hasNegationOrSub(text)) return { score: 0, type: "ninguna" };
  const direct = overlap(src, axis);
  if (direct > 0.4) return { score: direct, type: "directa" };
  const other = normalizeContent(otherCanon);
  if (other && tokens(other).size >= 4) {
    const ctx = overlap(src, other);
    if (ctx > 0.5) return { score: ctx, type: "contextual" };
  }
  return { score: 0, type: "ninguna" };
}

export function replyCanonScore(reply: string, canon: string) {
  return overlap(normalizeContent(reply), normalizeContent(canon));
}

export { CANON_BLOCK, CANON_WARN };
