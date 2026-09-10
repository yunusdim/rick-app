import { contentHash } from "@/lib/rick/hash";
import { RICK_BUILD } from "@/lib/rick/build";
import type { RickStateExport } from "@/lib/rick/capsule-types";

export type { RickStateExport };

export function makeCapsule(input: Omit<RickStateExport, "schema" | "build" | "at" | "fingerprint">): RickStateExport {
  const base = {
    schema: 1 as const,
    build: RICK_BUILD,
    at: Date.now(),
    ...input,
  };
  const fingerprint = contentHash(JSON.stringify({ ...base, fingerprint: "" }));
  return { ...base, fingerprint };
}

export function parseCapsule(raw: string): { ok: true; data: RickStateExport } | { ok: false; reason: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "JSON inválido" };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, reason: "cápsula vacía" };
  const data = parsed as RickStateExport;
  if (data.schema !== 1) return { ok: false, reason: "esquema desconocido" };
  const expected = contentHash(JSON.stringify({ ...data, fingerprint: "" }));
  if (data.fingerprint !== expected) return { ok: false, reason: "huella no coincide" };
  return { ok: true, data };
}
