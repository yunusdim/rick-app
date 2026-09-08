import { contradictionScore } from "@/lib/rick/contradiction";
import { CANON_WARN, SUMMARY_KEEP, SESSION_WINDOW, type RickMessage } from "@/lib/rick/types";

export function maybeSummarize(input: {
  messages: RickMessage[];
  previous: string;
  canonText: string;
}): { summary: string; rejected: boolean; reason: string } {
  if (input.messages.length <= SESSION_WINDOW) {
    return { summary: input.previous, rejected: false, reason: "ventana viva" };
  }
  const old = input.messages.slice(0, -SUMMARY_KEEP);
  const candidate = old
    .map((m) => `${m.role === "user" ? "Operador" : "Sistema"}: ${m.content.slice(0, 280)}`)
    .join("\n")
    .slice(0, 2400);

  if (!candidate.trim()) return { summary: input.previous, rejected: false, reason: "vacío" };

  const { score } = contradictionScore(candidate, input.canonText);
  if (score >= CANON_WARN) {
    return {
      summary: input.previous,
      rejected: true,
      reason: `léxico ${score.toFixed(2)} — se conserva el resumen anterior`,
    };
  }
  const next = input.previous ? `${input.previous}\n${candidate}`.slice(-3500) : candidate;
  return { summary: next, rejected: false, reason: "extractivo admitido (sin juez-LLM)" };
}
