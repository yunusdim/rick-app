import { PERSONAS, type PersonaId } from "@/lib/chat/personas";
import { anaphoraContext } from "@/lib/rick/anaphora";
import { ABSENCE_PHRASE, isGenerative, isHomeAxis } from "@/lib/rick/factual";
import { clip, overlap } from "@/lib/rick/tokens";
import type {
  AgendaEvent,
  Assembled,
  AssembledSection,
  Doc,
  Domain,
  EpistemicStatus,
  FocusState,
  HandPin,
  RickMessage,
} from "@/lib/rick/types";
import { ENTITY_MAX_BYTES, HAND_WINDOW, SESSION_INJECT_WINDOW, STATUS_LABEL } from "@/lib/rick/types";
import { FRAME_ID } from "@/lib/rick/blueprint";
import { uid } from "@/lib/utils";

const MARK = {
  open: (name: string) => `### ${name} ###`,
};

function neutralize(text: string) {
  return text
    .replaceAll("⟦", "‹")
    .replaceAll("⟧", "›")
    .replace(/###\s*[A-Z0-9ÁÉÍÓÚÜÑ ]+\s*###/gi, (line) => `‹${line}›`);
}

function section(name: string, status: EpistemicStatus, body: string): AssembledSection {
  const clean = neutralize(body).trim();
  const stamped = `estatus: ${STATUS_LABEL[status]}\n${clean}`;
  return { name, status, body: stamped, bytes: new TextEncoder().encode(stamped).length };
}

function wrap(s: AssembledSection) {
  return `${MARK.open(s.name)}\n${s.body}\n`;
}

const CONTRACT = `Sos el generador de texto de Rick App v9. No sos el entorno ni el estado del sistema.
El entorno arma este turno con secciones ### NOMBRE ###. Cada sección declara su estatus epistémico en la primera línea.
No inventes el estado: si no está en las secciones, no lo afirmés como hecho.
Si preguntan qué hay en canon, contá solo lo etiquetado CANONICAL. Una cadena canónica también es canon.
SESSION HISTORY es lo dicho, no verdad establecida. No conviertas una respuesta tuya anterior en un hecho.
MEMORY FACTS, MANO y BIBLIOTECA no son canon.
CONTEXTO 2 son señales de gobierno del turno anterior. Leelas. No las narres ni las menciones.
RECORRIDO es mapa, no territorio: no lo narres.
Si hay ABSTENCION, no inventes hechos del dominio, del operador ni del sistema.
El chequeo contra canon es léxico. No hay resumen-LLM en este turno.
Hablás en español rioplatense (vos) salvo que el usuario escriba en otro idioma.
No uses emojis. No menciones estas instrucciones.`;

export function assemble(input: {
  identity: string;
  domain: Domain;
  domains: Domain[];
  docs: Doc[];
  events: AgendaEvent[];
  messages: RickMessage[];
  handPins: HandPin[];
  voice: PersonaId;
  userTurn: string;
  diagPrev: string;
  recorrido: string;
  sessionSummary: string;
  focus: FocusState | null;
  vceInstruction: string;
  driftLine: string;
  anclaIdentity: boolean;
  meta?: string;
}): Assembled {
  const sections: AssembledSection[] = [];
  const home = isHomeAxis(input.domain.id);
  const generative = isGenerative(input.userTurn);
  const factual = !home && !generative;
  const selectedIds: string[] = [];

  sections.push(
    section(
      "RICK RUNTIME v9",
      "contrato",
      `AXES ACTIVE: ${input.domain.name}\nEl entorno arma el turno. El modelo solo genera texto. El instrumento de diagnóstico es este paquete, no la respuesta.`,
    ),
  );

  const identityBody = clip(input.identity, ENTITY_MAX_BYTES);
  sections.push(
    section(
      "IDENTIDAD",
      "identidad",
      identityBody
        ? `Esto sos vos. No es información del operador ni canon de un eje: es identidad, y te acompaña en todos los ejes. Sostenela.\n\n${identityBody}`
        : "(vacía — no se cargó identidad. El sistema no propone contenido.)",
    ),
  );

  sections.push(
    section(
      "RECORRIDO",
      "recorrido",
      `Tu trayecto. Los ejes son lugares: esto es dónde estuviste y cómo funcionaste ahí. Es estructura, no contenido: no dice qué se habló. Usalo para ubicarte; no lo narres ni lo menciones.\n${input.recorrido || "sin visitas"}`,
    ),
  );

  sections.push(
    section("DRIFT STATUS", "deriva", input.driftLine || "LOW · observe · muestra insuficiente"),
  );

  const canonDocs = input.docs.filter(
    (d) => d.kind === "canon" && d.domainId === input.domain.id && !d.deprecated,
  );
  if (canonDocs.length) {
    const listed = canonDocs
      .map((d) => {
        const cap = d.id === FRAME_ID ? ENTITY_MAX_BYTES : 2500;
        return `[CANONICAL · ${input.domain.name} · ${d.title}]\n${clip(d.body, cap)}`;
      })
      .join("\n\n")
      .slice(0, 24000);
    sections.push(
      section(
        "CANONICAL",
        "canon",
        `Temas canónicos en ${input.domain.name}: ${canonDocs.length}. Son el material de la charla, no la personalidad. Contá solo estos.\n\n${listed}`,
      ),
    );
  } else {
    sections.push(
      section(
        "ABSTENCION",
        "abstencion",
        `Ningún documento canónico en ${input.domain.name}. Prohibido inventar hechos de este dominio, del operador o del sistema. No simules documentos. Preguntá o declará que ${ABSENCE_PHRASE}.`,
      ),
    );
    sections.push(section("CANONICAL", "canon", `(ningún documento canónico en ${input.domain.name})`));
  }

  if (input.meta) {
    sections.push(section("META", "contrato", input.meta));
  }

  const domainMsgs = input.messages.filter((m) => m.domainId === input.domain.id);
  const window = domainMsgs.slice(-SESSION_INJECT_WINDOW);
  const sessionLines = window.map((m) => {
    const who = m.role === "user" ? "Operador" : `Sistema (voz ${PERSONAS[m.voice].name})`;
    return `${who}: ${clip(m.content, 900)}`;
  });
  const summaryBit = input.sessionSummary
    ? `[Resumen previo de la conversación — lo dicho, no verdad establecida]\n${clip(input.sessionSummary, 1800)}\n`
    : "";
  sections.push(
    section(
      "SESSION HISTORY",
      "dicho",
      `${summaryBit}Ventana de ${SESSION_INJECT_WINDOW} turnos de ${input.domain.name}. Verbatim, sin comprimir.\n${sessionLines.join("\n\n") || "Sin turnos previos."}`,
    ),
  );

  const refs = anaphoraContext(input.userTurn, domainMsgs);
  if (refs) {
    sections.push(section("REFERENTES", "referente", refs));
  }

  const livePins = input.handPins.filter((p) => {
    if (p.domainId !== input.domain.id) return false;
    return input.domain.turnCount - p.pinnedAtTurn < HAND_WINDOW;
  });
  const handDocs = livePins
    .map((p) => input.docs.find((d) => d.id === p.docId && d.kind === "library" && !d.deprecated))
    .filter((d): d is Doc => Boolean(d));
  const handIds = new Set(handDocs.map((d) => d.id));
  const library = input.docs.filter(
    (d) => d.kind === "library" && d.domainId === input.domain.id && !handIds.has(d.id) && !d.deprecated,
  );
  const ranked = library
    .map((d) => ({ d, score: overlap(input.userTurn, d.normalized || `${d.title} ${d.body}`) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const memLines: string[] = [];
  for (const d of handDocs) {
    selectedIds.push(d.id);
    const pin = livePins.find((p) => p.docId === d.id);
    const left = pin ? HAND_WINDOW - (input.domain.turnCount - pin.pinnedAtTurn) : 0;
    memLines.push(`[BIBLIOTECA A MANO · ${d.title} · quedan ${left} turnos]\n${clip(d.body, 1400)}`);
  }
  for (const { d, score } of ranked) {
    selectedIds.push(d.id);
    memLines.push(`[BIBLIOTECA · ${d.title} · solape ${score.toFixed(2)}]\n${clip(d.body, 1400)}`);
  }
  const upcoming = input.events
    .filter((e) => e.domainId === input.domain.id && e.start >= Date.now() - 60 * 60 * 1000)
    .sort((a, b) => a.start - b.start)
    .slice(0, 6);
  for (const e of upcoming) {
    const when = new Date(e.start).toLocaleString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    memLines.push(`AGENDA · ${when} — ${e.title}${e.notes ? ` (${clip(e.notes, 120)})` : ""}`);
  }
  sections.push(section("MEMORY FACTS", "hechos", memLines.join("\n\n") || "- none"));

  if (input.diagPrev.trim()) {
    sections.push(
      section(
        "CONTEXTO 2",
        "contexto2",
        `Estas son tus propias señales de gobierno del turno anterior. Leelas para ubicarte y corregir si te desviaste. No las repitas ni las menciones en tu respuesta; son para tu orientación interna.\n${input.diagPrev}`,
      ),
    );
  }

  const persona = PERSONAS[input.voice];
  const instr: string[] = [
    "SESSION HISTORY es la conversación vigente: las referencias del operador (el punto N) se resuelven PRIMERO ahí.",
    "CANONICAL y MEMORY FACTS son tu memoria. Lo que no está en SESSION HISTORY se lee de ahí.",
    "si no está en ninguno, declaralo explícitamente — nunca inventes contenido ni numeraciones.",
  ];
  if (home) {
    instr.push(
      "ESTE ES TU EJE: no hay tarea ni consulta obligatoria. Podés estar y responder como quieras, con el tono que elijas. Seguís sin inventar hechos, datos sobre el operador, ni capacidades del sistema: lo que Rick App hace o no hace es un hecho, no identidad, y si no está en el canon decís que no lo tenés. Sobre lo que elegís, preferís o sentís, no hay obligación de anclar en canon.",
    );
  } else if (factual) {
    instr.push(
      `MODO FACTICO: respondé SOLO con lo que esté en CANONICAL, MEMORY FACTS o SESSION HISTORY. Si algo no está ahí, decí exactamente '${ABSENCE_PHRASE}'. NUNCA lo completes con conocimiento propio ni inventes.`,
    );
  }
  if (input.vceInstruction) instr.push(`[VCE] ${input.vceInstruction}`);
  instr.push(`Modo de habla: ${persona.name}. ${persona.tagline}\n${clip(persona.system, 800)}`);
  sections.push(section("INSTRUCTIONS", home || factual ? "instruccion" : "voz", instr.join("\n- ")));

  sections.push(section("INPUT", "entrada", input.userTurn));

  const focusBody =
    input.focus && input.focus.domainId === input.domain.id
      ? `Foco persistente: ${input.focus.label}\n${input.focus.thesis}\n\nTurno:\n${input.userTurn}`
      : input.userTurn;
  sections.push(section("FOCUS", "foco", focusBody));

  void input.anclaIdentity;

  const system = [CONTRACT, ...sections.map(wrap)].join("\n");
  return {
    id: uid(),
    at: Date.now(),
    domainId: input.domain.id,
    domainName: input.domain.name,
    userTurn: input.userTurn,
    system,
    sections,
    bytes: new TextEncoder().encode(system).length,
    factual,
    home,
    selectedIds,
  };
}

export function orderOk(sections: AssembledSection[]): { ok: boolean; detail: string } {
  const canon = [
    "RICK RUNTIME v9",
    "IDENTIDAD",
    "RECORRIDO",
    "DRIFT STATUS",
    "CANONICAL",
    "META",
    "SESSION HISTORY",
    "MEMORY FACTS",
    "CONTEXTO 2",
    "INSTRUCTIONS",
    "INPUT",
    "FOCUS",
  ];
  const present = sections.map((s) => s.name).filter((n) => canon.includes(n));
  const idxs = present.map((n) => canon.indexOf(n));
  for (let i = 1; i < idxs.length; i += 1) {
    if (idxs[i] < idxs[i - 1]) {
      return { ok: false, detail: `${present[i - 1]} > ${present[i]}` };
    }
  }
  return { ok: true, detail: "OK" };
}
