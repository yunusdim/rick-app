import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { envGrokReady, resolveMotor } from "@/lib/rick/resolve-key.server";
import { fetchUpstream, tokenFromUpstream } from "@/lib/rick/upstream.server";
import { allowSpend, clientIp } from "@/lib/rick/spend.server";

const Body = z.object({
  system: z.string().max(32000),
  temperature: z.number().min(0).max(1.5).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(24),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: async () => Response.json({ grok: envGrokReady() }),
      POST: async ({ request }) => {
        const motor = resolveMotor(request);
        if (!motor) {
          return Response.json(
            { error: "Falta la API key del motor. Pegala al abrir." },
            { status: 503 },
          );
        }

        if (!allowSpend(clientIp(request), "chat")) {
          return Response.json(
            { error: "Tope de gasto alcanzado. Esperá un rato." },
            { status: 429 },
          );
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ error: "Pedido inválido." }, { status: 400 });
        }

        const parsed = Body.safeParse(json);
        if (!parsed.success) {
          return Response.json({ error: "Pedido inválido." }, { status: 400 });
        }

        const history = parsed.data.messages
          .filter((m) => m.content.trim().length > 0)
          .slice(-16)
          .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2500) }));

        if (!history.some((m) => m.role === "user")) {
          return Response.json({ error: "Escribí algo primero." }, { status: 400 });
        }

        let upstream: Response;
        try {
          upstream = await fetchUpstream(
            motor,
            {
              system: parsed.data.system.slice(0, 32000),
              messages: history,
              temperature: parsed.data.temperature ?? 0.8,
            },
            AbortSignal.timeout(28000),
          );
        } catch {
          return Response.json(
            { error: "La entidad tardó demasiado. Probá de nuevo." },
            { status: 504 },
          );
        }

        if (!upstream.ok || !upstream.body) {
          const status = upstream.status;
          const fallback =
            status === 401 || status === 403
              ? "La API key no sirve. Revisala."
              : status === 429
                ? "La entidad está saturada. Probá en un momento."
                : "La entidad no pudo responder. Probá de nuevo.";
          return Response.json({ error: fallback }, { status: 502 });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const stream = new ReadableStream({
          async start(controller) {
            const reader = upstream.body!.getReader();
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const raw of lines) {
                  const line = raw.trim();
                  if (!line.startsWith("data:")) continue;
                  const data = line.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const event = JSON.parse(data) as Record<string, unknown>;
                    const { token, model } = tokenFromUpstream(motor.kind, event);
                    if (model) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ m: model })}\n\n`),
                      );
                    }
                    if (token) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ t: token })}\n\n`),
                      );
                    }
                  } catch {
                    /* skip */
                  }
                }
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (err) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: "Se cortó la respuesta." })}\n\n`),
              );
              controller.close();
              void err;
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
