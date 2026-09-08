import { isOwnerKeyShape } from "@/lib/rick/owner-key";

export function envGrokReady(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

/** Env key wins. If this deploy has none, the operator can send theirs in X-Rick-Key. */
export function resolveApiKey(request: Request): string | null {
  const env = process.env.XAI_API_KEY?.trim();
  if (env) return env;
  const header = request.headers.get("x-rick-key")?.trim() ?? "";
  if (isOwnerKeyShape(header)) return header;
  return null;
}
