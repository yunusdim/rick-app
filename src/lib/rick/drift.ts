import { tokens, overlap } from "@/lib/rick/tokens";
import type { DriftResult, RickMessage } from "@/lib/rick/types";

export function computeDrift(userTurn: string, messages: RickMessage[]): DriftResult {
  const users = messages.filter((m) => m.role === "user").map((m) => m.content);
  const all = [...users, userTurn];
  const content = tokens(userTurn).size;
  const last = all.slice(-3).join(" ");
  const prev = all.slice(-6, -3).join(" ");
  const density = Math.min(1, content / 24);

  if (all.length < 8 || content < 4 || tokens(last).size < 6 || tokens(prev).size < 6) {
    return {
      risk: "LOW",
      type: "observe",
      reason: "muestra insuficiente",
      continuity: 0,
      density,
      abstain: true,
    };
  }

  const continuity = overlap(last, prev);
  if (continuity < 0.05) {
    return {
      risk: "CRITICAL",
      type: "ruptura",
      reason: `continuidad ${continuity.toFixed(2)}`,
      continuity,
      density,
      abstain: false,
    };
  }
  if (continuity < 0.15) {
    return {
      risk: "HIGH",
      type: "salto",
      reason: `continuidad ${continuity.toFixed(2)}`,
      continuity,
      density,
      abstain: false,
    };
  }
  if (continuity < 0.3) {
    return {
      risk: "MEDIUM",
      type: "desvio",
      reason: `continuidad ${continuity.toFixed(2)}`,
      continuity,
      density,
      abstain: false,
    };
  }
  return {
    risk: "LOW",
    type: "continuo",
    reason: `continuidad ${continuity.toFixed(2)}`,
    continuity,
    density,
    abstain: false,
  };
}
