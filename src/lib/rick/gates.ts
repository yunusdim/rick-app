import type { DriftRisk } from "@/lib/rick/types";

export function turnMayCall(input: {
  driftBlocked: boolean;
  driftRisk: DriftRisk;
  contractOk: boolean;
  canonIntegral: boolean;
  motorBlocked: boolean;
  orderOk?: boolean;
  transportOk?: boolean;
  writer?: boolean;
}): { call: boolean; reason: string } {
  if (input.writer === false) return { call: false, reason: "otra pestaña escribe" };
  if (input.motorBlocked) return { call: false, reason: "motor" };
  if (input.driftBlocked) return { call: false, reason: "deriva persistida" };
  if (input.driftRisk === "CRITICAL") return { call: false, reason: "deriva CRITICAL" };
  if (!input.contractOk) return { call: false, reason: "contrato" };
  if (input.orderOk === false) return { call: false, reason: "orden" };
  if (!input.canonIntegral) return { call: false, reason: "canon no íntegro" };
  if (input.transportOk === false) return { call: false, reason: "transporte" };
  return { call: true, reason: "ok" };
}
