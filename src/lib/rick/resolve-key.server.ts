import { isOwnerKeyShape } from "@/lib/rick/owner-key";

export function envGrokReady(): boolean {
  return false;
}

/** Cada uno trae la suya. El deploy público no gasta cuota del operador. */
export function resolveApiKey(request: Request): string | null {
  const header = request.headers.get("x-rick-key")?.trim() ?? "";
  if (isOwnerKeyShape(header)) return header;
  return null;
}
