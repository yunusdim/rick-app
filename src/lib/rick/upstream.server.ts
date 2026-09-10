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
  stop?: string;
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
    if (type === "message_delta") {
      const delta = event.delta as { stop_reason?: string } | undefined;
      if (delta?.stop_reason) return { stop: delta.stop_reason };
    }
    if (type === "error") return { stop: "error" };
    return {};
  }
  const choices = event.choices as { delta?: { content?: string }; finish_reason?: string | null }[] | undefined;
  const finish = choices?.[0]?.finish_reason;
  return {
    model: typeof event.model === "string" ? event.model : undefined,
    token: choices?.[0]?.delta?.content,
    stop: finish ?? undefined,
  };
}

const OPENAI_VOICE: Record<string, string> = {
  eve: "nova",
  orion: "onyx",
  rex: "echo",
  luna: "shimmer",
};

const GROQ_VOICE: Record<string, string> = {
  eve: "Arista-PlayAI",
  orion: "Mason-PlayAI",
  rex: "Thunder-PlayAI",
  luna: "Cheyenne-PlayAI",
};

export async function fetchTts(
  motor: ResolvedMotor,
  input: { text: string; voiceId: string },
  signal: AbortSignal,
): Promise<Response> {
  if (motor.tts === "none" || motor.tts === "unknown") {
    return new Response(JSON.stringify({ error: "Este motor no tiene voz. El chat sí." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (motor.tts === "xai") {
    return fetch(`${motor.base}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${motor.key}`,
      },
      body: JSON.stringify({
        text: input.text,
        voice_id: input.voiceId,
        language: "auto",
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

  const voice =
    motor.tts === "groq"
      ? GROQ_VOICE[input.voiceId] ?? "Arista-PlayAI"
      : OPENAI_VOICE[input.voiceId] ?? "nova";
  const model = motor.tts === "groq" ? "playai-tts" : "tts-1";

  return fetch(`${motor.base}/audio/speech`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      input: input.text,
      voice,
    }),
    signal,
  });
}

