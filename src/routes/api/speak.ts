import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { resolveMotor } from "@/lib/rick/resolve-key.server";
import { fetchTts } from "@/lib/rick/upstream.server";
import { allowSpend, clientIp } from "@/lib/rick/spend.server";

const Body = z.object({
  text: z.string().min(1).max(2000),
  voiceId: z.string().min(1).max(40),
});

export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const motor = resolveMotor(request);
        if (!motor) {
          return Response.json(
            { error: "Falta la API key del motor. Pegala al abrir." },
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
          upstream = await fetchTts(
            motor,
            { text, voiceId: parsed.data.voiceId },
            AbortSignal.timeout(20000),
          );
        } catch {
          return Response.json(
            { error: "La voz tardó demasiado. Probá de nuevo." },
            { status: 504 },
          );
        }

        if (upstream.headers.get("content-type")?.includes("application/json") && !upstream.ok) {
          try {
            const body = (await upstream.json()) as { error?: string };
            if (body.error) return Response.json({ error: body.error }, { status: upstream.status });
          } catch {
            /* fall through */
          }
        }

        if (!upstream.ok) {
          const bad = upstream.status === 401 || upstream.status === 403;
          return Response.json(
            {
              error: bad
                ? "La API key no sirve. Revisala."
                : "Este motor no devolvió voz. El chat sí puede.",
            },
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
