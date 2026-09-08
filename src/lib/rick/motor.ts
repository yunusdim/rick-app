export type MotorKind = "openai" | "anthropic";
export type TtsKind = "xai" | "openai" | "groq" | "none";

export type MotorPreset = {
  id: string;
  name: string;
  base: string;
  model: string;
  kind: MotorKind;
  tts: TtsKind;
};

export const MOTOR_PRESETS: MotorPreset[] = [
  { id: "xai", name: "xAI", base: "https://api.x.ai/v1", model: "grok-4.5", kind: "openai", tts: "xai" },
  { id: "openai", name: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-4.1", kind: "openai", tts: "openai" },
  { id: "anthropic", name: "Anthropic", base: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5", kind: "anthropic", tts: "none" },
  { id: "openrouter", name: "OpenRouter", base: "https://openrouter.ai/api/v1", model: "openrouter/auto", kind: "openai", tts: "openai" },
  { id: "groq", name: "Groq", base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", kind: "openai", tts: "groq" },
  { id: "mistral", name: "Mistral", base: "https://api.mistral.ai/v1", model: "mistral-large-latest", kind: "openai", tts: "none" },
  { id: "gemini", name: "Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash", kind: "openai", tts: "none" },
  { id: "custom", name: "Custom", base: "", model: "", kind: "openai", tts: "openai" },
];

export type MotorSaved = {
  id: string;
  key: string;
  model: string;
  base: string;
};

const STORAGE = "rick-motor-v1";
const LEGACY = "rick-xai-owner-key";

export function isKeyShape(value: string): boolean {
  const t = value.trim();
  if (t.length < 16 || t.length > 400) return false;
  if (/\s/.test(t)) return false;
  return true;
}

export function presetById(id: string): MotorPreset | undefined {
  return MOTOR_PRESETS.find((p) => p.id === id);
}

export function readMotor(): MotorSaved | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MotorSaved>;
      if (parsed.key && isKeyShape(parsed.key) && parsed.model) {
        return {
          id: parsed.id || "custom",
          key: parsed.key.trim(),
          model: String(parsed.model).slice(0, 80),
          base: String(parsed.base ?? ""),
        };
      }
    }
    const legacy = localStorage.getItem(LEGACY)?.trim() ?? "";
    if (legacy && isKeyShape(legacy)) {
      const xai = presetById("xai")!;
      return { id: "xai", key: legacy, model: xai.model, base: xai.base };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeMotor(saved: MotorSaved): boolean {
  if (!isKeyShape(saved.key) || !saved.model.trim()) return false;
  localStorage.setItem(
    STORAGE,
    JSON.stringify({
      id: saved.id,
      key: saved.key.trim(),
      model: saved.model.trim().slice(0, 80),
      base: saved.base.trim(),
    }),
  );
  try {
    localStorage.removeItem(LEGACY);
  } catch {
    /* ignore */
  }
  return true;
}

export function hasMotor(): boolean {
  return Boolean(readMotor()?.key);
}

export function motorHeaders(): HeadersInit {
  const m = readMotor();
  if (!m) return {};
  const h: Record<string, string> = {
    "X-Rick-Key": m.key,
    "X-Rick-Engine": m.id,
    "X-Rick-Model": m.model,
  };
  if (m.id === "custom" && m.base) h["X-Rick-Base"] = m.base;
  return h;
}

/** @deprecated alias — has a key in this browser */
export function readOwnerKey(): string {
  return readMotor()?.key ?? "";
}

export function ownerKeyHeaders(): HeadersInit {
  return motorHeaders();
}
