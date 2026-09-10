import { contradictionScore } from "@/lib/rick/contradiction";
import { CANON_WARN, SUMMARY_KEEP, SESSION_WINDOW, type RickMessage } from "@/lib/rick/types";

export type SummaryState = {
  text: string;
  cursor: string;
};

export function maybeSummarize(input: {
  messages: RickMessage[];
  previous: string;
  cursor?: string;
  canonText: string;
}): { summary: string; cursor: string; rejected: boolean; reason: string } {
  const live = input.messages.filter((m) => m.admitted !== false);
  if (live.length <= SESSION_WINDOW) {
    return { summary: input.previous, cursor: input.cursor ?? "", rejected: false, reason: "ventana viva" };
  }
  const cursorIdx = input.cursor ? live.findIndex((m) => m.id === input.cursor) : -1;
  const start = cursorIdx + 1;
  const end = live.length - SUMMARY_KEEP;
  if (end <= start) {
    return { summary: input.previous, cursor: input.cursor ?? "", rejected: false, reason: "idempotente" };
  }
  const interval = live.slice(start, end);
  const candidate = interval
    .map((m) => `${m.role === "user" ? "Operador" : "Sistema"}: ${m.content.slice(0, 280)}`)
    .join("\n")
    .slice(0, 2400);

  if (!candidate.trim()) {
    return { summary: input.previous, cursor: input.cursor ?? "", rejected: false, reason: "vacío" };
  }

  const { score } = contradictionScore(candidate, input.canonText);
  if (score >= CANON_WARN) {
    return {
      summary: input.previous,
      cursor: input.cursor ?? "",
      rejected: true,
      reason: `léxico ${score.toFixed(2)} — frontera no avanza`,
    };
  }
  const next = input.previous ? `${input.previous}\n${candidate}`.slice(-3500) : candidate;
  return {
    summary: next,
    cursor: interval[interval.length - 1]?.id ?? input.cursor ?? "",
    rejected: false,
    reason: "extractivo admitido (sin juez-LLM)",
  };
}
