import { extractFromFile } from "@/lib/rick/import-file";
import { useRick, whenRickReady } from "@/lib/rick/store";

export async function ingestFiles(
  files: File[],
  opts: { domainId: string; kind: "canon" | "library" },
): Promise<{ ok: number; fail: string[]; truncated: number }> {
  await whenRickReady();
  const addDoc = useRick.getState().addDoc;
  let ok = 0;
  let truncated = 0;
  const fail: string[] = [];
  for (const file of files) {
    try {
      const extracted = await extractFromFile(file);
      const result = addDoc({
        domainId: opts.domainId,
        title: extracted.title,
        body: extracted.body,
        kind: opts.kind,
      });
      if (result.duplicate) {
        fail.push(`${file.name}: ya estaba en este eje (mismo hash)`);
      } else {
        ok += 1;
      }
      if (extracted.truncated) truncated += 1;
    } catch (err) {
      fail.push(`${file.name}: ${err instanceof Error ? err.message : "no se pudo leer"}`);
    }
  }
  return { ok, fail, truncated };
}

export async function ingestIdentity(
  files: File[],
): Promise<{ ok: number; fail: string[]; truncated: number }> {
  await whenRickReady();
  const parts: string[] = [];
  let truncated = 0;
  const fail: string[] = [];
  for (const file of files) {
    try {
      const extracted = await extractFromFile(file);
      parts.push(`# ${extracted.title}\n${extracted.body}`);
      if (extracted.truncated) truncated += 1;
    } catch (err) {
      fail.push(`${file.name}: ${err instanceof Error ? err.message : "no se pudo leer"}`);
    }
  }
  if (parts.length) {
    const current = useRick.getState().identity.trim();
    const next = [current, ...parts].filter(Boolean).join("\n\n---\n\n");
    useRick.getState().setIdentity(next);
  }
  return { ok: parts.length, fail, truncated };
}

export function filesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  return [...dt.files].filter((f) => f.size > 0);
}
