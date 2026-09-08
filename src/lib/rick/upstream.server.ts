import type { ResolvedMotor } from "@/lib/rick/resolve-key.server";

type Turn = { role: "user" | "assistant"; content: string };

export async function fetchUpstream(
  motor: ResolvedMotor,
  input: { system: string; messages: Turn[]; temperature: number },
  signal: AbortSignal,
): Promise<Response> {
  if (motor.kind === "anthropic") {
    return fetch(`${motor.base}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": motor.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: motor.model,
        max_tokens: 800,
        stream: true,
        temperature: input.temperature,
        system: input.system,
        messages: input.messages,
      }),
      signal,
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${motor.key}`,
  };
  if (motor.engine === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/yunusdim/rick-app";
    headers["X-Title"] = "Rick App";
  }

  return fetch(`${motor.base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: motor.model,
      stream: true,
      temperature: input.temperature,
      max_tokens: 800,
      messages: [{ role: "system", content: input.system }, ...input.messages],
    }),
    signal,
  });
}

export function tokenFromUpstream(kind: ResolvedMotor["kind"], event: Record<string, unknown>): {
  token?: string;
  model?: string;
} {
  if (kind === "anthropic") {
    const type = event.type;
    if (type === "message_start") {
      const msg = event.message as { model?: string } | undefined;
      return { model: msg?.model };
    }
    if (type === "content_block_delta") {
      const delta = event.delta as { type?: string; text?: string } | undefined;
      if (delta?.type === "text_delta" && delta.text) return { token: delta.text };
    }
    return {};
  }
  const choices = event.choices as { delta?: { content?: string } }[] | undefined;
  return {
    model: typeof event.model === "string" ? event.model : undefined,
    token: choices?.[0]?.delta?.content,
  };
}
