import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { allowSpend, clientIp } from "@/lib/rick/spend.server";

const Body = z.object({
  text: z.string().min(1).max(2000),
  voiceId: z.string().min(1).max(40),
});

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "La voz no está disponible ahora." },
            { status: 503 },
          );
        }

        if (!allowSpend(clientIp(request), "speak")) {
          return Response.json(
            { error: "Tope de voz alcanzado. Esperá un rato." },
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

        const text = parsed.data.text.replace(/\s+/g, " ").trim().slice(0, 900);
        if (!text) {
          return Response.json({ error: "Nada para decir." }, { status: 400 });
        }

        let upstream: Response;
        try {
          upstream = await fetch("https://api.x.ai/v1/tts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              text,
              voice_id: parsed.data.voiceId,
              language: "auto",
            }),
            signal: AbortSignal.timeout(20000),
          });
        } catch {
          return Response.json(
            { error: "La voz tardó demasiado. Probá de nuevo." },
            { status: 504 },
          );
        }

        if (!upstream.ok) {
          return Response.json(
            { error: "No pude generar la voz. Probá de nuevo." },
            { status: 502 },
          );
        }

        const audio = await upstream.arrayBuffer();
        return new Response(audio, {
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
