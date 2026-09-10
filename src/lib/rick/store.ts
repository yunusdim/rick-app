import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { uid } from "@/lib/utils";
import type { PersonaId } from "@/lib/chat/personas";
import { parseDomainName } from "@/lib/rick/domain";
import { nodeHash } from "@/lib/rick/hash";
import { normalizeContent } from "@/lib/rick/normalize";
import { pushRecorrido } from "@/lib/rick/recorrido";
import type {
  AgendaEvent,
  Assembled,
  AssemblyRecord,
  DiagPrev,
  Doc,
  Domain,
  FocusState,
  ForgetBackup,
  GovCheck,
  HandPin,
  RecorridoStep,
  RickMessage,
  TraceEntry,
  ViewId,
} from "@/lib/rick/types";
import { EMPTY_DIAG } from "@/lib/rick/diag";
import { FRAME_CANON, FRAME_ID } from "@/lib/rick/blueprint";
import { acceptReceived } from "@/lib/rick/integrity";
import { contentHash } from "@/lib/rick/hash";
import { isWriter } from "@/lib/rick/writer";
import { makeCapsule, parseCapsule } from "@/lib/rick/capsule";

function keepPerAxis(messages: RickMessage[], n: number) {
  const groups = new Map<string, RickMessage[]>();
  for (const m of messages) {
    const g = groups.get(m.domainId) ?? [];
    g.push(m);
    groups.set(m.domainId, g);
  }
  return [...groups.values()].flatMap((g) => g.slice(-n));
}

const MESA: Domain = {
  id: "mesa",
  name: "Mesa",
  createdAt: 0,
  turnCount: 0,
  lastVisit: 0,
};

let persistTimer: ReturnType<typeof setTimeout> | undefined;
let persistName = "rick-app-v3";
let persistValue: string | null = null;

function flushPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = undefined;
  }
  if (persistValue == null || typeof localStorage === "undefined") return;
  if (!isWriter()) return;
  try {
    const incoming = JSON.parse(persistValue) as { state?: { persistRev?: number } };
    const prevRaw = localStorage.getItem(persistName);
    if (prevRaw) {
      const prev = JSON.parse(prevRaw) as { state?: { persistRev?: number } };
      const prevRev = prev.state?.persistRev ?? 0;
      const nextRev = incoming.state?.persistRev ?? 0;
      if (prevRev > nextRev) {
        reportPersist(false, "otra pestaña tiene una revisión más nueva");
        return;
      }
    }
    localStorage.setItem(persistName, persistValue);
    reportPersist(true);
  } catch {
    reportPersist(false, "localStorage no confirmó la escritura");
  }
}

function reportPersist(ok: boolean, error = "") {
  const api = persistReport;
  api(ok, error);
}

let persistReport: (ok: boolean, error: string) => void = () => undefined;

const debouncedStorage: StateStorage = {
  getItem: (name) => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(name);
  },
  setItem: (name, value) => {
    persistName = name;
    persistValue = value;
    if (typeof window === "undefined") return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(flushPersist, 800);
  },
  removeItem: (name) => {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(name);
  },
};

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPersist);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPersist();
  });
}

type RickState = {
  hydrated: boolean;
  view: ViewId;
  identity: string;
  domains: Domain[];
  activeDomainId: string;
  docs: Doc[];
  messages: RickMessage[];
  events: AgendaEvent[];
  checks: GovCheck[];
  handPins: HandPin[];
  assemblyHistory: AssemblyRecord[];
  lastAssembled: Assembled | null;
  backups: ForgetBackup[];
  voice: PersonaId;
  autoSpeak: boolean;
  lockEnabled: boolean;
  pinSalt: string;
  pinHash: string;
  summaries: Record<string, string>;
  summaryCursors: Record<string, string>;
  diagPrev: string;
  lastDiag: DiagPrev;
  focus: FocusState | null;
  motorRef: string;
  motorLast: string;
  motorBlocked: boolean;
  driftBlocked: boolean;
  driftReason: string;
  persistOk: boolean;
  persistError: string;
  traces: TraceEntry[];
  recorridoSeq: RecorridoStep[];
  setHydrated: () => void;
  setView: (view: ViewId) => void;
  setIdentity: (text: string) => void;
  setVoice: (voice: PersonaId) => void;
  setAutoSpeak: (value: boolean) => void;
  setLastAssembled: (assembled: Assembled) => void;
  switchDomain: (id: string) => void;
  addDomain: (name: string) => { ok: true } | { ok: false; error: string };
  bumpTurns: () => void;
  addDoc: (doc: Omit<Doc, "id" | "createdAt" | "hash" | "normalized" | "usageCount" | "lastUsedAt" | "deprecated">) =>
    | { ok: true; id: string; duplicate: boolean }
    | { ok: false; reason: string };
  removeDoc: (id: string) => void;
  promoteDoc: (id: string) => boolean;
  demoteDoc: (id: string) => boolean;
  bumpUsage: (ids: string[]) => void;
  addTrace: (kind: string, detail: string) => void;
  pinToHand: (docId: string) => void;
  unpinFromHand: (docId: string) => void;
  addMessage: (msg: Omit<RickMessage, "id" | "createdAt"> & { id?: string }) => string;
  patchMessage: (id: string, content: string, admitted?: boolean) => void;
  removeMessage: (id: string) => void;
  addEvent: (event: Omit<AgendaEvent, "id">) => void;
  removeEvent: (id: string) => void;
  addChecks: (rows: GovCheck[]) => void;
  setSummary: (domainId: string, text: string, cursor?: string) => void;
  setDiag: (diag: DiagPrev, text: string) => void;
  setFocus: (focus: FocusState | null) => void;
  setMotor: (last: string) => { blocked: boolean; first: boolean };
  primeMotor: (name: string) => void;
  ackMotor: () => void;
  ackDrift: () => void;
  setDriftBlocked: (v: boolean, reason?: string) => void;
  forgetActive: () => ForgetBackup | null;
  restoreBackup: (id: string) => boolean;
  setLock: (enabled: boolean, salt?: string, hash?: string) => void;
  clearPin: () => void;
};

export const useRick = create<RickState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      view: "mesa",
      identity: "",
      domains: [MESA],
      activeDomainId: "mesa",
      docs: [FRAME_CANON],
      messages: [],
      events: [],
      checks: [],
      handPins: [],
      assemblyHistory: [],
      lastAssembled: null,
      backups: [],
      voice: "grok",
      autoSpeak: false,
      lockEnabled: false,
      pinSalt: "",
      pinHash: "",
      summaries: {},
      summaryCursors: {},
      diagPrev: "",
      lastDiag: EMPTY_DIAG,
      focus: null,
      motorRef: "",
      motorLast: "",
      motorBlocked: false,
      driftBlocked: false,
      driftReason: "",
      persistOk: true,
      persistError: "",
      traces: [],
      recorridoSeq: [],
      setHydrated: () => set({ hydrated: true }),
      setView: (view) => set({ view }),
      setIdentity: (identity) => set({ identity: identity.slice(0, 40000) }),
      setVoice: (voice) => set({ voice }),
      setAutoSpeak: (autoSpeak) => set({ autoSpeak }),
      setLastAssembled: (assembled) => {
        const history = [assembled, ...get().assemblyHistory].slice(0, 12);
        set({ lastAssembled: assembled, assemblyHistory: history });
      },
      switchDomain: (id) => {
        const domains = get().domains.map((d) =>
          d.id === id ? { ...d, lastVisit: Date.now() } : d,
        );
        set({ activeDomainId: id, domains, view: "mesa" });
      },
      addDomain: (name) => {
        const parsed = parseDomainName(name);
        if (!parsed.ok) return parsed;
        const exists = get().domains.some(
          (d) => d.name.toLowerCase() === parsed.name.toLowerCase(),
        );
        if (exists) return { ok: false, error: "Ese dominio ya existe." };
        const domain: Domain = {
          id: uid(),
          name: parsed.name,
          createdAt: Date.now(),
          turnCount: 0,
          lastVisit: Date.now(),
        };
        set({ domains: [...get().domains, domain], activeDomainId: domain.id, view: "mesa" });
        return { ok: true };
      },
      bumpTurns: () => {
        const { activeDomainId, domains } = get();
        const next = domains.map((d) =>
          d.id === activeDomainId ? { ...d, turnCount: d.turnCount + 1, lastVisit: Date.now() } : d,
        );
        const active = next.find((d) => d.id === activeDomainId) ?? next[0];
        set({
          domains: next,
          recorridoSeq: pushRecorrido(get().recorridoSeq, active),
        });
      },
      addDoc: (doc) => {
        const accepted = acceptReceived(doc.body);
        if (!accepted.ok) {
          get().addTrace("INGEST RECHAZADO", `${doc.title} ${accepted.reason}`);
          return { ok: false, reason: accepted.reason };
        }
        const stored = accepted.stored;
        const fingerprint = contentHash(stored);
        const normalized = normalizeContent(`${doc.title} ${stored}`);
        const hash = nodeHash(doc.domainId, doc.title, stored);
        const exists = get().docs.find(
          (d) =>
            d.domainId === doc.domainId &&
            !d.deprecated &&
            (d.contentHash === fingerprint || (!d.contentHash && d.hash === hash)),
        );
        if (exists) {
          get().addTrace("INGEST DUPLICADO", `${exists.id} tipo=${exists.kind} axis=${doc.domainId}`);
          return { ok: true, id: exists.id, duplicate: true };
        }
        const id = hash;
        const row: Doc = {
          ...doc,
          id,
          createdAt: Date.now(),
          body: stored,
          hash,
          contentHash: fingerprint,
          normalized,
          usageCount: 0,
          lastUsedAt: 0,
          deprecated: false,
        };
        set({ docs: [...get().docs, row] });
        get().addTrace(
          doc.kind === "canon" ? "REMEMBER" : "BIBLIOTECA",
          `${id} axis=${doc.domainId} ${doc.title}`,
        );
        return { ok: true, id, duplicate: false };
      },
      removeDoc: (id) => {
        if (id === FRAME_ID) return;
        set({
          docs: get().docs.filter((d) => d.id !== id),
          handPins: get().handPins.filter((p) => p.docId !== id),
        });
      },
      promoteDoc: (id) => {
        const doc = get().docs.find((d) => d.id === id);
        if (!doc || doc.id === FRAME_ID) return false;
        set({
          docs: get().docs.map((d) =>
            d.id === id ? { ...d, kind: "canon" as const, deprecated: false } : d,
          ),
        });
        get().addTrace("CANONICAL PROMOTE", `${id} axis=${doc.domainId}`);
        return true;
      },
      demoteDoc: (id) => {
        const doc = get().docs.find((d) => d.id === id);
        if (!doc || doc.id === FRAME_ID) return false;
        set({
          docs: get().docs.map((d) =>
            d.id === id ? { ...d, kind: "library" as const, deprecated: true } : d,
          ),
        });
        get().addTrace("CANONICAL DEMOTE", `${id} axis=${doc.domainId}`);
        return true;
      },
      bumpUsage: (ids) => {
        if (!ids.length) return;
        const now = Date.now();
        set({
          docs: get().docs.map((d) =>
            ids.includes(d.id) ? { ...d, usageCount: (d.usageCount ?? 0) + 1, lastUsedAt: now } : d,
          ),
        });
      },
      addTrace: (kind, detail) => {
        const row: TraceEntry = { id: uid(), at: Date.now(), kind, detail };
        set({ traces: [row, ...get().traces].slice(0, 200) });
      },
      pinToHand: (docId) => {
        const { activeDomainId, domains, handPins, docs } = get();
        const doc = docs.find((d) => d.id === docId);
        if (!doc || doc.kind !== "library" || doc.domainId !== activeDomainId) return;
        const domain = domains.find((d) => d.id === activeDomainId);
        const pin: HandPin = {
          docId,
          domainId: activeDomainId,
          pinnedAtTurn: domain?.turnCount ?? 0,
        };
        set({
          handPins: [pin, ...handPins.filter((p) => p.docId !== docId)].slice(0, 40),
        });
      },
      unpinFromHand: (docId) =>
        set({ handPins: get().handPins.filter((p) => p.docId !== docId) }),
      addMessage: (msg) => {
        const id = msg.id ?? uid();
        const admitted = msg.admitted ?? msg.role === "user";
        set({
          messages: keepPerAxis(
            [
              ...get().messages,
              {
                id,
                domainId: msg.domainId,
                role: msg.role,
                content: msg.content,
                voice: msg.voice,
                createdAt: Date.now(),
                admitted,
              },
            ],
            160,
          ),
        });
        return id;
      },
      patchMessage: (id, content, admitted) => {
        set({
          messages: get().messages.map((m) =>
            m.id === id ? { ...m, content, admitted: admitted ?? m.admitted } : m,
          ),
        });
      },
      removeMessage: (id) => set({ messages: get().messages.filter((m) => m.id !== id) }),
      addEvent: (event) => {
        set({ events: [...get().events, { ...event, id: uid() }] });
      },
      removeEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
      addChecks: (rows) => {
        set({ checks: [...rows, ...get().checks].slice(0, 240) });
      },
      setSummary: (domainId, text, cursor) =>
        set({
          summaries: { ...get().summaries, [domainId]: text },
          summaryCursors:
            cursor !== undefined
              ? { ...get().summaryCursors, [domainId]: cursor }
              : get().summaryCursors,
        }),
      setDiag: (lastDiag, diagPrev) => set({ lastDiag, diagPrev }),
      setFocus: (focus) => set({ focus }),
      setMotor: (last) => {
        const ref = get().motorRef;
        if (!last) return { blocked: get().motorBlocked, first: false };
        if (!ref) {
          set({ motorRef: last, motorLast: last, motorBlocked: false });
          return { blocked: false, first: true };
        }
        if (last !== ref) {
          set({ motorLast: last, motorBlocked: true });
          return { blocked: true, first: false };
        }
        set({ motorLast: last, motorBlocked: false });
        return { blocked: false, first: false };
      },
      primeMotor: (name) => {
        const model = name.trim();
        if (!model) return;
        set({ motorRef: model, motorLast: model, motorBlocked: false });
      },
      ackMotor: () => set({ motorRef: get().motorLast || get().motorRef, motorBlocked: false }),
      ackDrift: () => set({ driftBlocked: false, driftReason: "" }),
      setDriftBlocked: (driftBlocked, reason) =>
        set({
          driftBlocked,
          driftReason: driftBlocked ? reason ?? get().driftReason : "",
        }),
      forgetActive: () => {
        const { activeDomainId, domains, messages, backups, summaries, summaryCursors } = get();
        const domain = domains.find((d) => d.id === activeDomainId);
        const thread = messages.filter((m) => m.domainId === activeDomainId);
        if (!domain || thread.length === 0) return null;
        const backup: ForgetBackup = {
          id: uid(),
          domainId: activeDomainId,
          domainName: domain.name,
          at: Date.now(),
          messages: thread,
          summary: summaries[activeDomainId] ?? "",
          cursor: summaryCursors[activeDomainId] ?? "",
        };
        const nextSum = { ...summaries };
        const nextCur = { ...summaryCursors };
        delete nextSum[activeDomainId];
        delete nextCur[activeDomainId];
        set({
          messages: messages.filter((m) => m.domainId !== activeDomainId),
          lastAssembled: null,
          backups: [backup, ...backups].slice(0, 12),
          summaries: nextSum,
          summaryCursors: nextCur,
        });
        get().addTrace("OLVIDO", `conversacion de ${domain.name} borrada`);
        return backup;
      },
      restoreBackup: (id) => {
        const { backups, messages, summaries, summaryCursors } = get();
        const backup = backups.find((b) => b.id === id);
        if (!backup) return false;
        const others = messages.filter((m) => m.domainId !== backup.domainId);
        set({
          messages: [...others, ...backup.messages],
          activeDomainId: backup.domainId,
          view: "mesa",
          summaries: { ...summaries, [backup.domainId]: backup.summary ?? "" },
          summaryCursors: { ...summaryCursors, [backup.domainId]: backup.cursor ?? "" },
        });
        return true;
      },
      setLock: (enabled, salt, hash) => {
        set({
          lockEnabled: enabled,
          pinSalt: salt ?? get().pinSalt,
          pinHash: hash ?? get().pinHash,
        });
      },
      clearPin: () => set({ lockEnabled: false, pinSalt: "", pinHash: "" }),
    }),
    {
      name: "rick-app-v3",
      skipHydration: true,
      storage: createJSONStorage(() => debouncedStorage),
      partialize: (s) => ({
        identity: s.identity,
        domains: s.domains,
        activeDomainId: s.activeDomainId,
        docs: s.docs,
        messages: keepPerAxis(s.messages, 80),
        events: s.events,
        checks: s.checks.slice(0, 80),
        handPins: s.handPins,
        assemblyHistory: s.assemblyHistory.slice(0, 4).map((a) => ({
          ...a,
          partial: false,
        })),
        backups: s.backups.slice(0, 8),
        voice: s.voice,
        autoSpeak: s.autoSpeak,
        lockEnabled: s.lockEnabled,
        pinSalt: s.pinSalt,
        pinHash: s.pinHash,
        summaries: s.summaries,
        summaryCursors: s.summaryCursors,
        diagPrev: s.diagPrev,
        lastDiag: s.lastDiag,
        focus: s.focus,
        motorRef: s.motorRef,
        motorLast: s.motorLast,
        motorBlocked: s.motorBlocked,
        driftBlocked: s.driftBlocked,
        driftReason: s.driftReason,
        traces: s.traces.slice(0, 80),
        recorridoSeq: s.recorridoSeq,
        persistRev: Date.now(),
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

persistReport = (ok, error) => {
  const s = useRick.getState();
  if (s.persistOk === ok && s.persistError === error) return;
  useRick.setState({ persistOk: ok, persistError: error });
};

let rehydrateStarted = false;

export function rehydrateRick() {
  if (rehydrateStarted) return;
  rehydrateStarted = true;
  void Promise.resolve(useRick.persist.rehydrate()).finally(() => {
    syncFrameCanon();
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      void navigator.storage.persist();
    }
    if (!useRick.getState().hydrated) useRick.getState().setHydrated();
  });
}

/** Pisa el frame de fábrica. El resto del persist queda. */
export function syncFrameCanon() {
  const docs = useRick.getState().docs;
  const others = docs.filter((d) => d.id !== FRAME_ID);
  const current = docs.find((d) => d.id === FRAME_ID);
  if (current?.body === FRAME_CANON.body && current.title === FRAME_CANON.title) return;
  useRick.setState({ docs: [{ ...FRAME_CANON }, ...others] });
}

export function exportInstance() {
  const s = useRick.getState();
  return makeCapsule({
    identity: s.identity,
    domains: s.domains,
    activeDomainId: s.activeDomainId,
    docs: s.docs,
    messages: s.messages,
    events: s.events,
    summaries: s.summaries,
    summaryCursors: s.summaryCursors,
    focus: s.focus,
    driftBlocked: s.driftBlocked,
    driftReason: s.driftReason,
    motorRef: s.motorRef,
    motorLast: s.motorLast,
    motorBlocked: s.motorBlocked,
    backups: s.backups,
  });
}

export function importInstance(raw: string): { ok: true } | { ok: false; reason: string } {
  const parsed = parseCapsule(raw);
  if (!parsed.ok) return parsed;
  const d = parsed.data;
  useRick.setState({
    identity: d.identity,
    domains: d.domains,
    activeDomainId: d.activeDomainId,
    docs: d.docs,
    messages: d.messages,
    events: d.events,
    summaries: d.summaries,
    summaryCursors: d.summaryCursors,
    focus: d.focus,
    driftBlocked: d.driftBlocked,
    driftReason: d.driftReason,
    motorRef: d.motorRef,
    motorLast: d.motorLast,
    motorBlocked: d.motorBlocked,
    backups: d.backups,
  });
  return { ok: true };
}

export function whenRickReady(): Promise<void> {
  if (useRick.getState().hydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useRick.subscribe((s) => {
      if (s.hydrated) {
        unsub();
        resolve();
      }
    });
    if (useRick.getState().hydrated) {
      unsub();
      resolve();
    }
  });
}

export function useActiveDomain() {
  return useRick((s) => s.domains.find((d) => d.id === s.activeDomainId) ?? s.domains[0]);
}
