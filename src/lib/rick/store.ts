import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { uid } from "@/lib/utils";
import type { PersonaId } from "@/lib/chat/personas";
import { parseDomainName } from "@/lib/rick/domain";
import type {
  AgendaEvent,
  Assembled,
  AssemblyRecord,
  Doc,
  Domain,
  ForgetBackup,
  GovCheck,
  HandPin,
  RickMessage,
  ViewId,
} from "@/lib/rick/types";

const MESA: Domain = {
  id: "mesa",
  name: "Mesa",
  createdAt: 0,
  turnCount: 0,
  lastVisit: 0,
};

const FRAME_CANON: Doc = {
  id: "frame",
  domainId: "mesa",
  title: "Rick App — marco",
  kind: "canon",
  createdAt: 0,
  body: `Rick App no es RICK Runtime. Es otra máquina con la misma física: el entorno arma el turno, el modelo solo genera texto.
El instrumento de diagnóstico es el contexto ensamblado, no la respuesta.
Cada bloque declara estatus epistémico. CANON es establecido. SESION es lo dicho, no verdad. MANO es ventana, no canon. VOZ es habla, no identidad.
Los modos Grok / Espejo / Ácido / 3AM son VOZ, no identidad ni canon.
Si no hay canon en el dominio activo, hay abstención: no se inventan hechos.
El chequeo contra canon es léxico. No hay resumen-LLM.
La sesión está aislada por dominio. El recorrido es mapa, no territorio.
/olvidar pide confirmación, hace respaldo, y no toca canon ni identidad.
El candado de gasto es opcional: sin desbloqueo no se llama a Grok.
Los archivos que el operador importa viven en esta app; no son el estado del sistema hasta que el ensamblado los marca.`,
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
  try {
    localStorage.setItem(persistName, persistValue);
  } catch {
    /* quota */
  }
}

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
  setHydrated: () => void;
  setView: (view: ViewId) => void;
  setIdentity: (text: string) => void;
  setVoice: (voice: PersonaId) => void;
  setAutoSpeak: (value: boolean) => void;
  setLastAssembled: (assembled: Assembled) => void;
  switchDomain: (id: string) => void;
  addDomain: (name: string) => { ok: true } | { ok: false; error: string };
  bumpTurns: () => void;
  addDoc: (doc: Omit<Doc, "id" | "createdAt">) => void;
  removeDoc: (id: string) => void;
  pinToHand: (docId: string) => void;
  unpinFromHand: (docId: string) => void;
  addMessage: (msg: Omit<RickMessage, "id" | "createdAt"> & { id?: string }) => string;
  patchMessage: (id: string, content: string) => void;
  addEvent: (event: Omit<AgendaEvent, "id">) => void;
  removeEvent: (id: string) => void;
  addChecks: (rows: GovCheck[]) => void;
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
        set({
          domains: domains.map((d) =>
            d.id === activeDomainId
              ? { ...d, turnCount: d.turnCount + 1, lastVisit: Date.now() }
              : d,
          ),
        });
      },
      addDoc: (doc) => {
        set({
          docs: [
            ...get().docs,
            { ...doc, id: uid(), createdAt: Date.now(), body: doc.body.slice(0, 20000) },
          ],
        });
      },
      removeDoc: (id) =>
        set({
          docs: get().docs.filter((d) => d.id !== id),
          handPins: get().handPins.filter((p) => p.docId !== id),
        }),
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
        set({
          messages: [
            ...get().messages,
            {
              id,
              domainId: msg.domainId,
              role: msg.role,
              content: msg.content,
              voice: msg.voice,
              createdAt: Date.now(),
            },
          ].slice(-160),
        });
        return id;
      },
      patchMessage: (id, content) => {
        set({
          messages: get().messages.map((m) => (m.id === id ? { ...m, content } : m)),
        });
      },
      addEvent: (event) => {
        set({ events: [...get().events, { ...event, id: uid() }] });
      },
      removeEvent: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
      addChecks: (rows) => {
        set({ checks: [...rows, ...get().checks].slice(0, 240) });
      },
      forgetActive: () => {
        const { activeDomainId, domains, messages, backups } = get();
        const domain = domains.find((d) => d.id === activeDomainId);
        const thread = messages.filter((m) => m.domainId === activeDomainId);
        if (!domain || thread.length === 0) return null;
        const backup: ForgetBackup = {
          id: uid(),
          domainId: activeDomainId,
          domainName: domain.name,
          at: Date.now(),
          messages: thread,
        };
        set({
          messages: messages.filter((m) => m.domainId !== activeDomainId),
          lastAssembled: null,
          backups: [backup, ...backups].slice(0, 12),
        });
        return backup;
      },
      restoreBackup: (id) => {
        const { backups, messages } = get();
        const backup = backups.find((b) => b.id === id);
        if (!backup) return false;
        const others = messages.filter((m) => m.domainId !== backup.domainId);
        set({
          messages: [...others, ...backup.messages],
          activeDomainId: backup.domainId,
          view: "mesa",
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
        messages: s.messages.slice(-80),
        events: s.events,
        checks: s.checks.slice(0, 80),
        handPins: s.handPins,
        assemblyHistory: s.assemblyHistory.slice(0, 8).map((a) => ({
          id: a.id,
          at: a.at,
          domainId: a.domainId,
          domainName: a.domainName,
          userTurn: a.userTurn,
          bytes: a.bytes,
          system: a.system.slice(0, 4000),
          sections: a.sections.map((sec) => ({
            name: sec.name,
            status: sec.status,
            bytes: sec.bytes,
            body: sec.body.slice(0, 900),
          })),
        })),
        backups: s.backups.slice(0, 8).map((b) => ({
          ...b,
          messages: b.messages.slice(-40),
        })),
        voice: s.voice,
        autoSpeak: s.autoSpeak,
        lockEnabled: s.lockEnabled,
        pinSalt: s.pinSalt,
        pinHash: s.pinHash,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

let rehydrateStarted = false;

export function rehydrateRick() {
  if (rehydrateStarted) return;
  rehydrateStarted = true;
  void Promise.resolve(useRick.persist.rehydrate()).finally(() => {
    if (!useRick.getState().hydrated) useRick.getState().setHydrated();
  });
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
