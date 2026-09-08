import type { PersonaId } from "@/lib/chat/personas";

export type ViewId = "mesa" | "agenda" | "grabaciones" | "canon" | "inspect";

export const HOME_AXIS = "mesa";
export const CANON_WARN = 0.4;
export const CANON_BLOCK = 0.8;
export const SESSION_WINDOW = 10;
export const SESSION_INJECT_WINDOW = 5;
export const SUMMARY_KEEP = 5;
export const HAND_WINDOW = 8;
export const ENTITY_MAX_BYTES = 20000;

export type EpistemicStatus =
  | "contrato"
  | "canon"
  | "identidad"
  | "recorrido"
  | "dicho"
  | "mano"
  | "biblioteca"
  | "agenda"
  | "voz"
  | "abstencion"
  | "deriva"
  | "contexto2"
  | "referente"
  | "hechos"
  | "instruccion"
  | "foco"
  | "entrada";

export const STATUS_LABEL: Record<EpistemicStatus, string> = {
  contrato: "reglas del entorno — no son hechos del dominio",
  canon: "establecido — almacén verbatim",
  identidad: "escrito por el operador o la entidad — no hay garantía de autoría",
  recorrido: "mapa, no territorio — cero contenido",
  dicho: "lo dicho, no verdad establecida — sin resumen-LLM",
  mano: "disponible en esta ventana — no es canon",
  biblioteca: "recuperado por solape léxico — no es canon",
  agenda: "eventos del operador — no es canon",
  voz: "modo de habla — no identidad ni canon",
  abstencion: "no hay canon — prohibido inventar",
  deriva: "señal de gobierno — no es contenido",
  contexto2: "medición del turno anterior — orientación interna, no narrar",
  referente: "resolución local de anáfora — no invención",
  hechos: "memoria seleccionada — no es canon",
  instruccion: "régimen del eje — no es hecho del dominio",
  foco: "tesis declarada por el operador — no es canon",
  entrada: "turno del operador — verbatim",
};

export type RickMessage = {
  id: string;
  domainId: string;
  role: "user" | "assistant";
  content: string;
  voice: PersonaId;
  createdAt: number;
};

export type Domain = {
  id: string;
  name: string;
  createdAt: number;
  turnCount: number;
  lastVisit: number;
};

export type Doc = {
  id: string;
  domainId: string;
  title: string;
  body: string;
  kind: "canon" | "library";
  createdAt: number;
  hash?: string;
  normalized?: string;
  usageCount?: number;
  lastUsedAt?: number;
  deprecated?: boolean;
};

export type AgendaEvent = {
  id: string;
  domainId: string;
  title: string;
  start: number;
  notes: string;
};

export type GovKind =
  | "deriva"
  | "canon"
  | "identidad"
  | "agenda"
  | "lexico"
  | "invencion"
  | "enforcer"
  | "contradiccion"
  | "foco"
  | "motor"
  | "ancla"
  | "orden"
  | "vce"
  | "resumen"
  | "contrato"
  | "cobertura";

export type GovCheck = {
  id: string;
  at: number;
  kind: GovKind;
  alert: boolean;
  abstain: boolean;
  detail: string;
};

export type AssembledSection = {
  name: string;
  status: EpistemicStatus;
  body: string;
  bytes: number;
};

export type Assembled = {
  id: string;
  at: number;
  domainId: string;
  domainName: string;
  userTurn: string;
  system: string;
  sections: AssembledSection[];
  bytes: number;
  factual?: boolean;
  home?: boolean;
  selectedIds?: string[];
  contractOk?: boolean;
  driftRisk?: DriftRisk;
};

export type AssemblyRecord = Assembled;

export type ForgetBackup = {
  id: string;
  domainId: string;
  domainName: string;
  at: number;
  messages: RickMessage[];
};

export type HandPin = {
  docId: string;
  domainId: string;
  pinnedAtTurn: number;
};

export type DiagPrev = {
  foco: string;
  abstraccion: string;
  deriva: string;
  vce: string;
  enforcer: string;
  contradiccion: string;
  cobertura: string;
  densidad: string;
  continuidad: string;
  loop: string;
  tema: string;
  profundidad: string;
  balance: string;
  selector: string;
};

export type FocusState = {
  label: string;
  thesis: string;
  domainId: string;
};

export type DriftRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DriftResult = {
  risk: DriftRisk;
  type: string;
  reason: string;
  continuity: number;
  density: number;
  abstain: boolean;
};

export type TraceEntry = {
  id: string;
  at: number;
  kind: string;
  detail: string;
};

export type RecorridoStep = {
  domainId: string;
  name: string;
  turns: number;
};
