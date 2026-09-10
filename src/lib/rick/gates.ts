import type { DriftRisk } from "@/lib/rick/types";

export function turnMayCall(input: {
  driftBlocked: boolean;
  driftRisk: DriftRisk;
  contractOk: boolean;
  canonIntegral: boolean;
  motorBlocked: boolean;
}): { call: boolean; reason: string } {
  if (input.motorBlocked) return { call: false, reason: "motor" };
  if (input.driftBlocked) return { call: false, reason: "deriva persistida" };
  if (input.driftRisk === "CRITICAL") return { call: false, reason: "deriva CRITICAL" };
  if (!input.contractOk) return { call: false, reason: "contrato" };
  if (!input.canonIntegral) return { call: false, reason: "canon no íntegro" };
  return { call: true, reason: "ok" };
}
