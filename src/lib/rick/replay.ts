import { admitReply, type TransportStop } from "@/lib/rick/admit";
import { validateContract } from "@/lib/rick/contract";
import { turnMayCall } from "@/lib/rick/gates";
import { transportOk } from "@/lib/rick/transport";
import type { Assembled, DriftRisk } from "@/lib/rick/types";
import { RICK_BUILD } from "@/lib/rick/build";

export type TurnRecord = {
  build: string;
  at: number;
  assembled: Assembled;
  userTurn: string;
  reply: string;
  stop: TransportStop;
  driftRisk: DriftRisk;
  driftBlocked: boolean;
  motorBlocked: boolean;
  lastAssistant: string;
  partial: boolean;
};

export function replayTurn(record: TurnRecord) {
  if (record.partial) {
    return { ok: false, reason: "registro parcial — no es reproducción exacta", call: false as const };
  }
  const contract = validateContract(record.assembled.sections);
  const transport = transportOk({
    system: record.assembled.system,
    messages: [{ content: record.userTurn }],
  });
  const gate = turnMayCall({
    driftBlocked: record.driftBlocked,
    driftRisk: record.driftRisk,
    contractOk: contract.ok,
    canonIntegral: record.assembled.canonIntegral !== false,
    motorBlocked: record.motorBlocked,
    transportOk: transport.ok,
  });
  const admission = admitReply({
    text: record.reply,
    stop: record.stop,
    userTurn: record.userTurn,
    lastAssistant: record.lastAssistant,
  });
  return {
    ok: true as const,
    build: RICK_BUILD,
    contract,
    transport,
    gate,
    admission,
    call: gate.call,
  };
}
