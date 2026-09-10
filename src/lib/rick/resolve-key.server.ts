import { MOTOR_PRESETS, type MotorKind, type TtsKind } from "@/lib/rick/motor";

export function envGrokReady(): boolean {
  return false;
}

export type ResolvedMotor = {
  key: string;
  base: string;
  model: string;
  kind: MotorKind;
  engine: string;
  tts: TtsKind;
};

const ALLOW = new Set(MOTOR_PRESETS.filter((p) => p.base).map((p) => new URL(p.base).hostname));

function isKeyShape(value: string): boolean {
  const t = value.trim();
  return t.length >= 16 && t.length <= 400 && !/\s/.test(t);
}

function publicHttps(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  if (host.includes(":")) return null;
  return u;
}

function resolveBase(engine: string, custom: string): { base: string; kind: MotorKind } | null {
  const preset = MOTOR_PRESETS.find((p) => p.id === engine);
  if (preset && preset.id !== "custom") {
    return { base: preset.base, kind: preset.kind };
  }
  const u = publicHttps(custom);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (!ALLOW.has(host) && !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null;
  const path = u.pathname.replace(/\/$/, "") || "/v1";
  return { base: `${u.origin}${path}`, kind: "openai" };
}

export function resolveApiKey(request: Request): string | null {
  return resolveMotor(request)?.key ?? null;
}

export function resolveMotor(request: Request): ResolvedMotor | null {
  const key = request.headers.get("x-rick-key")?.trim() ?? "";
  if (!isKeyShape(key)) return null;
  const engine = (request.headers.get("x-rick-engine")?.trim() || "xai").slice(0, 32);
  const model = (request.headers.get("x-rick-model")?.trim() || "").slice(0, 80);
  const custom = request.headers.get("x-rick-base")?.trim() ?? "";
  const resolved = resolveBase(engine, custom);
  if (!resolved) return null;
  const preset = MOTOR_PRESETS.find((p) => p.id === engine);
  const finalModel = model || preset?.model || "";
  if (!finalModel) return null;
  return { key, base: resolved.base, model: finalModel, kind: resolved.kind, engine, tts: preset?.tts ?? "unknown" };
}
