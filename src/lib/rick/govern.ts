import { uid } from "@/lib/utils";
import { overlap, tokens } from "@/lib/rick/tokens";
import type { GovCheck, GovKind, RickMessage } from "@/lib/rick/types";

export function runChecks(input: {
  userTurn: string;
  messages: RickMessage[];
  canonCount: number;
  canonText: string;
  identity: string;
  agendaCount: number;
}): GovCheck[] {
  const now = Date.now();
  const checks: GovCheck[] = [];

  const users = input.messages.filter((m) => m.role === "user").map((m) => m.content);
  const all = [...users, input.userTurn];
  const last = all.slice(-3).join(" ");
  const prev = all.slice(-6, -3).join(" ");
  const contentTokens = tokens(input.userTurn).size;

  if (all.length < 6 || contentTokens < 4 || tokens(last).size < 4) {
    checks.push({
      id: uid(),
      at: now,
      kind: "deriva",
      alert: false,
      abstain: true,
      detail: "abstención: muestra insuficiente o input sin términos de contenido",
    });
  } else {
    const score = overlap(last, prev);
    const alert = score < 0.15;
    checks.push({
      id: uid(),
      at: now,
      kind: "deriva",
      alert,
      abstain: false,
      detail: `solape hilo ${score.toFixed(2)}${alert ? " — movimiento no declarado" : " — continuo"}`,
    });
  }

  checks.push({
    id: uid(),
    at: now,
    kind: "canon",
    alert: false,
    abstain: false,
    detail: input.canonCount > 0 ? `${input.canonCount} canónico(s) inyectado(s)` : "canon vacío (declarado)",
  });

  checks.push({
    id: uid(),
    at: now,
    kind: "invencion",
    alert: input.canonCount === 0,
    abstain: input.canonCount === 0,
    detail:
      input.canonCount === 0
        ? "anti-invención activa: no hay canon en este dominio"
        : "canon presente — invención de hechos del dominio no justificada",
  });

  checks.push({
    id: uid(),
    at: now,
    kind: "identidad",
    alert: false,
    abstain: false,
    detail: input.identity.trim() ? "identidad presente" : "identidad vacía (declarada)",
  });

  checks.push({
    id: uid(),
    at: now,
    kind: "agenda",
    alert: false,
    abstain: false,
    detail: `${input.agendaCount} evento(s) de este dominio a futuro`,
  });

  const userCanon = overlap(input.userTurn, input.canonText);
  if (!input.canonText.trim() || tokens(input.canonText).size < 4) {
    checks.push({
      id: uid(),
      at: now,
      kind: "lexico",
      alert: false,
      abstain: true,
      detail: "abstención léxica: no hay canon con términos de contenido (sin resumen-LLM)",
    });
  } else {
    checks.push({
      id: uid(),
      at: now,
      kind: "lexico",
      alert: false,
      abstain: false,
      detail: `solape léxico del turno vs canon ${userCanon.toFixed(2)} — no es un resumen`,
    });
  }

  return checks;
}

export function runReplyChecks(input: { reply: string; canonText: string }): GovCheck[] {
  const now = Date.now();
  const canonTok = tokens(input.canonText);
  if (canonTok.size < 4) {
    return [
      {
        id: uid(),
        at: now,
        kind: "lexico",
        alert: false,
        abstain: true,
        detail: "respuesta: abstención léxica — canon sin términos (sin resumen-LLM)",
      },
    ];
  }
  const score = overlap(input.reply, input.canonText);
  const long = input.reply.trim().length > 80;
  const alert = long && score === 0;
  return [
    {
      id: uid(),
      at: now,
      kind: "lexico",
      alert,
      abstain: false,
      detail: `respuesta vs canon ${score.toFixed(2)}${alert ? " — respuesta larga sin solape léxico" : " — chequeo limpio"}`,
    },
  ];
}

export function rates(checks: GovCheck[]) {
  const kinds: GovKind[] = [
    "deriva",
    "canon",
    "identidad",
    "agenda",
    "lexico",
    "invencion",
    "enforcer",
    "contradiccion",
    "foco",
    "motor",
    "ancla",
    "orden",
    "vce",
    "resumen",
    "contrato",
    "cobertura",
  ];
  return kinds.map((kind) => {
    const rows = checks.filter((c) => c.kind === kind && !c.abstain);
    const alerts = rows.filter((c) => c.alert).length;
    return {
      kind,
      total: rows.length,
      alerts,
      abstentions: checks.filter((c) => c.kind === kind && c.abstain).length,
    };
  });
}
