import { RICK_BUILD } from "@/lib/rick/build";

export async function remoteBuild(): Promise<string | null> {
  try {
    const r = await fetch("/api/version", { cache: "no-store" });
    if (!r.ok) return null;
    const body = (await r.json()) as { build?: string };
    return typeof body.build === "string" ? body.build : null;
  } catch {
    return null;
  }
}

export function isStaleBuild(remote: string | null) {
  return Boolean(remote && remote !== RICK_BUILD);
}
