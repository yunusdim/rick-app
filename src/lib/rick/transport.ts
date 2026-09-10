import { utf8Bytes } from "@/lib/rick/bytes";

export const SYSTEM_MAX_BYTES = 32000;
export const MESSAGE_MAX_CHARS = 2500;
export const HISTORY_MAX = 16;

export function transportOk(input: { system: string; messages: { content: string }[] }): {
  ok: boolean;
  detail: string;
} {
  const sys = utf8Bytes(input.system);
  if (sys > SYSTEM_MAX_BYTES) return { ok: false, detail: `system ${sys} > ${SYSTEM_MAX_BYTES} bytes UTF-8` };
  if (input.messages.length > HISTORY_MAX) return { ok: false, detail: `historial ${input.messages.length} > ${HISTORY_MAX}` };
  const long = input.messages.find((m) => m.content.length > MESSAGE_MAX_CHARS);
  if (long) return { ok: false, detail: `mensaje ${long.content.length} > ${MESSAGE_MAX_CHARS} UTF-16` };
  return { ok: true, detail: "OK" };
}
