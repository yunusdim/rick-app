import { tokens } from "@/lib/rick/tokens";
import type { RickMessage } from "@/lib/rick/types";

export type Vce = {
  mode: "OBSERVE" | "ACTIVO";
  diagnosis: string;
  instruction: string;
  tema: number;
  profundidad: string;
  balance: string;
};

export function computeVce(messages: RickMessage[]): Vce {
  const users = messages.filter((m) => m.role === "user").map((m) => m.content);
  if (users.length < 6) {
    return {
      mode: "OBSERVE",
      diagnosis: "equilibrado",
      instruction: "",
      tema: 0,
      profundidad: "exploracion",
      balance: "neutral",
    };
  }
  const last = users.slice(-8);
  const avgLen = last.reduce((n, t) => n + t.length, 0) / last.length;
  const uniq = new Set(last.flatMap((t) => [...tokens(t)])).size;
  const questions = last.filter((t) => t.includes("?")).length / last.length;
  const profundidad = avgLen > 280 ? "profunda" : avgLen < 60 ? "exploracion" : "media";
  const balance = questions > 0.5 ? "indagatorio" : questions < 0.1 ? "asertivo" : "neutral";
  const tema = Math.min(1, uniq / 40);
  const instruction =
    profundidad === "profunda"
      ? "densidad alta del operador: respondé preciso, sin relleno"
      : profundidad === "exploracion"
        ? "operador en exploración: una pregunta buena alcanza"
        : "";
  return {
    mode: "ACTIVO",
    diagnosis: `${profundidad}/${balance}`,
    instruction,
    tema,
    profundidad,
    balance,
  };
}
