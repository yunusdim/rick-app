import { enforceMemoryUsage, type EnforcerDecision } from "@/lib/rick/enforcer";

export type TransportStop = "end_turn" | "max_tokens" | "error" | "abort" | "empty" | "unknown";

export type Admission =
  | { status: "admitted"; text: string; stop: TransportStop; enforcer: EnforcerDecision; reason: string }
  | { status: "rejected"; text: string; stop: TransportStop; reason: string };

const VALID_STOP: TransportStop[] = ["end_turn"];

export function admitReply(input: {
  text: string;
  stop: TransportStop;
  userTurn: string;
  lastAssistant: string;
}): Admission {
  const text = input.text;
  if (!VALID_STOP.includes(input.stop)) {
    return {
      status: "rejected",
      text,
      stop: input.stop,
      reason: `terminación ${input.stop} — no admitida`,
    };
  }
  const enf = enforceMemoryUsage({
    userTurn: input.userTurn,
    reply: text,
    lastAssistant: input.lastAssistant,
  });
  if (enf.decision === "BLOCK") {
    return { status: "rejected", text, stop: input.stop, reason: `enforcer ${enf.reason}` };
  }
  return {
    status: "admitted",
    text,
    stop: input.stop,
    enforcer: enf.decision,
    reason: enf.reason,
  };
}
