import type { DiagPrev } from "@/lib/rick/types";

export function formatDiag(d: DiagPrev): string {
  return [
    "— Gobierno —",
    `Foco: ${d.foco}`,
    `Abstracción: ${d.abstraccion}`,
    `Deriva: ${d.deriva}`,
    `VCE: ${d.vce}`,
    `Enforcer: ${d.enforcer}`,
    `Contradicción con canon: ${d.contradiccion}`,
    `Cobertura canónica: ${d.cobertura}`,
    "— Percepción del hilo —",
    `Densidad temática: ${d.densidad}`,
    `Continuidad: ${d.continuidad}`,
    `Repetición de eje (loop): ${d.loop}`,
    "— Lectura del operador —",
    `Tema (score): ${d.tema}`,
    `Profundidad: ${d.profundidad}`,
    `Balance emocional: ${d.balance}`,
    "— Contexto —",
    `Selector de memoria: ${d.selector}`,
    "Correlación sensores: s/d",
  ].join("\n");
}

export const EMPTY_DIAG: DiagPrev = {
  foco: "s/d",
  abstraccion: "s/d",
  deriva: "LOW",
  vce: "OBSERVE",
  enforcer: "s/d",
  contradiccion: "0",
  cobertura: "s/d",
  densidad: "s/d",
  continuidad: "s/d",
  loop: "s/d",
  tema: "s/d",
  profundidad: "exploracion",
  balance: "neutral",
  selector: "lexico",
};
