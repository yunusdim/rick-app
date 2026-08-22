import type { PersonaId } from "@/lib/chat/personas";

export type ViewId = "mesa" | "agenda" | "grabaciones" | "canon" | "inspect";

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
  | "abstencion";

export const STATUS_LABEL: Record<EpistemicStatus, string> = {
  contrato: "reglas del entorno — no son hechos del dominio",
  canon: "establecido — almacén verbatim",
  identidad: "escrito por el operador — no hay garantía de autoría",
  recorrido: "mapa, no territorio — cero contenido",
  dicho: "lo dicho, no verdad establecida — sin resumen-LLM",
  mano: "disponible en esta ventana — no es canon",
  biblioteca: "recuperado por solape léxico — no es canon",
  agenda: "eventos del operador — no es canon",
  voz: "modo de habla — no identidad ni canon",
  abstencion: "no hay canon — prohibido inventar",
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
};

export type AgendaEvent = {
  id: string;
  domainId: string;
  title: string;
  start: number;
  notes: string;
};

export type GovKind = "deriva" | "canon" | "identidad" | "agenda" | "lexico" | "invencion";

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

export const HAND_WINDOW = 8;
export const SESSION_WINDOW = 8;
