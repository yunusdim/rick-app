import { createFileRoute } from "@tanstack/react-router";
import { RICK_BUILD } from "@/lib/rick/build";

export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { build: RICK_BUILD },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
