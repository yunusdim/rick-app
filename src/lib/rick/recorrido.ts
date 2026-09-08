import { rates } from "@/lib/rick/govern";
import type { Domain, GovCheck, RecorridoStep } from "@/lib/rick/types";

export function pushRecorrido(seq: RecorridoStep[], domain: Domain): RecorridoStep[] {
  const last = seq[seq.length - 1];
  if (last && last.domainId === domain.id) {
    return [...seq.slice(0, -1), { ...last, turns: last.turns + 1, name: domain.name }];
  }
  return [...seq, { domainId: domain.id, name: domain.name, turns: 1 }].slice(-40);
}

export function recorridoText(
  domains: Domain[],
  checks: GovCheck[],
  activeId: string,
  seq: RecorridoStep[] = [],
): string {
  const stats = rates(checks);
  const deriva = stats.find((s) => s.kind === "deriva");
  const lex = stats.find((s) => s.kind === "lexico");
  const inv = stats.find((s) => s.kind === "invencion");
  const dClean = deriva && deriva.total ? (deriva.total - deriva.alerts) / deriva.total : 0;
  const cClean = inv && inv.total ? (inv.total - inv.alerts) / inv.total : 0;
  const lAlign = lex && lex.total ? (lex.total - lex.alerts) / lex.total : 0;

  const path =
    seq.length > 0
      ? seq
          .map((s) => {
            const here = s.domainId === activeId ? "  <- estás acá" : "";
            return `  ${s.name} · ${s.turns} turnos${here}`;
          })
          .join("\n")
      : domains
          .map((d) => {
            const here = d.id === activeId ? "  <- estás acá" : "";
            return `  ${d.name} · ${d.turnCount} turnos${here}`;
          })
          .join("\n");

  return `Acumulado por eje (estructura, no contenido):\n${path || "  (sin visitas)"}\n  deriva limpia ${dClean.toFixed(2)} · canon limpio ${cClean.toFixed(2)} · léxico alineado ${lAlign.toFixed(2)}`;
}
