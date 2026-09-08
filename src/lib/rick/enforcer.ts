import { overlap } from "@/lib/rick/tokens";

export type EnforcerDecision = "PASS" | "WARN" | "BLOCK";

export function enforceMemoryUsage(input: {
  userTurn: string;
  reply: string;
  lastAssistant: string;
}): { decision: EnforcerDecision; reason: string } {
  const r = input.reply.trim();
  if (!r) return { decision: "BLOCK", reason: "vacía" };
  if (r.length < 20) return { decision: "BLOCK", reason: "corta" };
  if (overlap(r, input.userTurn) > 0.92) return { decision: "BLOCK", reason: "eco del input" };
  if (input.lastAssistant && overlap(r, input.lastAssistant) > 0.88) {
    return { decision: "BLOCK", reason: "repetida" };
  }
  if (/como modelo de lenguaje|como ia\b|no soy un humano/i.test(r) && r.length < 220) {
    return { decision: "WARN", reason: "genérica" };
  }
  return { decision: "PASS", reason: "limpia" };
}
