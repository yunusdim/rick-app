import { normalizeContent } from "@/lib/rick/normalize";

export function nodeHash(axis: string, path: string, body: string) {
  const s = `${axis}|${path}|${normalizeContent(body)}`;
  let a = 0x811c9dc5;
  let b = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    a ^= c;
    a = Math.imul(a, 0x01000193);
    b ^= c;
    b = Math.imul(b, 16777619);
  }
  return `${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}
