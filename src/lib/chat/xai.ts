import { ownerKeyHeaders } from "@/lib/rick/owner-key";
import type { TransportStop } from "@/lib/rick/admit";

export type WireMessage = { role: "user" | "assistant"; content: string };

export async function streamChat(input: {
  system: string;
  temperature?: number;
  messages: WireMessage[];
  signal?: AbortSignal;
  onToken: (token: string) => void;
}): Promise<{ text: string; model: string; stop: TransportStop }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ownerKeyHeaders() },
    body: JSON.stringify({
      system: input.system,
      temperature: input.temperature ?? 0.8,
      messages: input.messages,
    }),
    signal: input.signal,
  });

  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (!res.body) throw new Error("No llegó la respuesta");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let model = "";
  let stop: TransportStop = "unknown";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((l) => l.replace(/^data:\s?/, ""))
        .join("")
        .trim();
      if (!line || line === "[DONE]") continue;
      try {
        const parsed = JSON.parse(line) as { t?: string; m?: string; error?: string; stop?: string };
        if (parsed.error) {
          stop = (parsed.stop as TransportStop) || "error";
          throw new Error(parsed.error);
        }
        if (parsed.stop) stop = parsed.stop as TransportStop;
        if (parsed.m) model = parsed.m;
        if (parsed.t) {
          full += parsed.t;
          input.onToken(parsed.t);
        }
      } catch (err) {
        if (err instanceof SyntaxError) continue;
        throw err;
      }
    }
  }

  if (!full.trim() && stop === "unknown") stop = "empty";
  if (stop === "unknown") stop = "end_turn";
  return { text: full, model, stop };
}

export async function speakText(input: { text: string; voiceId: string; signal?: AbortSignal }) {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ownerKeyHeaders() },
    body: JSON.stringify({ text: input.text, voiceId: input.voiceId }),
    signal: input.signal,
  });
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.blob();
}
