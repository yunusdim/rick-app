import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowUp,
  CalendarDays,
  Circle,
  FileText,
  Lock,
  LockOpen,
  Mic,
  ScanSearch,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import {
  DomainDialog,
  ForgetDialog,
  LockDialog,
} from "@/components/rick/dialogs";
import { AgendaPanel, CanonPanel, InspectPanel, RecordingsPanel } from "@/components/rick/panels";
import { AttachButton, DropCanvas } from "@/components/rick/attach";
import { useMic, useSpeaker } from "@/lib/chat/hooks";
import { PERSONA_LIST, PERSONAS, type PersonaId } from "@/lib/chat/personas";
import { streamChat } from "@/lib/chat/xai";
import { assemble } from "@/lib/rick/assemble";
import { runChecks, runReplyChecks } from "@/lib/rick/govern";
import {
  hashPin,
  isSessionUnlocked,
  newSalt,
  setSessionUnlocked,
} from "@/lib/rick/lock";
import { useRecorder } from "@/lib/rick/recorder";
import { useActiveDomain, useRick, rehydrateRick } from "@/lib/rick/store";
import type { ViewId } from "@/lib/rick/types";
import { cn, uid } from "@/lib/utils";

const NAV: { id: ViewId; label: string; icon: typeof FileText }[] = [
  { id: "mesa", label: "Mesa", icon: Circle },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "grabaciones", label: "Cintas", icon: Mic },
  { id: "canon", label: "Canon", icon: FileText },
  { id: "inspect", label: "Paquete", icon: ScanSearch },
];

export function RickApp() {
  const view = useRick((s) => s.view);
  const setView = useRick((s) => s.setView);
  const voice = useRick((s) => s.voice);
  const setVoice = useRick((s) => s.setVoice);
  const autoSpeak = useRick((s) => s.autoSpeak);
  const setAutoSpeak = useRick((s) => s.setAutoSpeak);
  const domains = useRick((s) => s.domains);
  const messages = useRick((s) => s.messages);
  const addMessage = useRick((s) => s.addMessage);
  const patchMessage = useRick((s) => s.patchMessage);
  const bumpTurns = useRick((s) => s.bumpTurns);
  const addChecks = useRick((s) => s.addChecks);
  const setLastAssembled = useRick((s) => s.setLastAssembled);
  const forgetActive = useRick((s) => s.forgetActive);
  const restoreBackup = useRick((s) => s.restoreBackup);
  const backups = useRick((s) => s.backups);
  const addDomain = useRick((s) => s.addDomain);
  const switchDomain = useRick((s) => s.switchDomain);
  const lockEnabled = useRick((s) => s.lockEnabled);
  const pinHash = useRick((s) => s.pinHash);
  const pinSalt = useRick((s) => s.pinSalt);
  const setLock = useRick((s) => s.setLock);
  const clearPin = useRick((s) => s.clearPin);
  const domain = useActiveDomain();

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [liveText, setLiveText] = useState("");
  const [tapeKey, setTapeKey] = useState(0);
  const [forgetOpen, setForgetOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const pendingRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef("");
  const rafRef = useRef(0);
  const speaker = useSpeaker();
  const recorder = useRecorder(domain.id);

  useEffect(() => {
    rehydrateRick();
  }, []);

  useEffect(() => {
    setUnlocked(isSessionUnlocked());
  }, [lockEnabled]);

  const thread = messages.filter((m) => m.domainId === domain.id);
  const locked = lockEnabled && !unlocked;
  const topicDocs = useRick((s) => s.docs).filter(
    (d) => d.domainId === domain.id && d.kind === "canon" && d.id !== "frame",
  );
  const identity = useRick((s) => s.identity);

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      const state = useRick.getState();
      if (state.lockEnabled && !isSessionUnlocked()) {
        pendingRef.current = text;
        setLockOpen(true);
        return;
      }

      const active = state.domains.find((d) => d.id === state.activeDomainId) ?? state.domains[0];
      const domainMsgs = state.messages.filter((m) => m.domainId === active.id);
      const canonDocs = state.docs.filter((d) => d.kind === "canon" && d.domainId === active.id);
      const canonText = canonDocs.map((d) => `${d.title}\n${d.body}`).join("\n");

      const assembled = assemble({
        identity: state.identity,
        domain: active,
        domains: state.domains,
        docs: state.docs,
        events: state.events.filter((e) => e.domainId === active.id),
        messages: domainMsgs,
        handPins: state.handPins,
        voice: state.voice,
        userTurn: text,
      });
      setLastAssembled(assembled);
      addChecks(
        runChecks({
          userTurn: text,
          messages: domainMsgs,
          canonCount: canonDocs.length,
          canonText,
          identity: state.identity,
          agendaCount: state.events.filter(
            (e) => e.domainId === active.id && e.start >= Date.now() - 3600000,
          ).length,
        }),
      );

      addMessage({ domainId: active.id, role: "user", content: text, voice: state.voice });
      bumpTurns();
      setDraft("");

      const assistantId = uid();
      addMessage({
        id: assistantId,
        domainId: active.id,
        role: "assistant",
        content: "",
        voice: state.voice,
      });
      setStreamingId(assistantId);
      setLiveText("");
      liveRef.current = "";
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 40000);

      let assembledText = "";
      try {
        assembledText = await streamChat({
          system: assembled.system,
          temperature: PERSONAS[state.voice].temperature,
          messages: [{ role: "user", content: text }],
          signal: controller.signal,
          onToken: (token) => {
            assembledText += token;
            liveRef.current = assembledText;
            if (!rafRef.current) {
              rafRef.current = requestAnimationFrame(() => {
                rafRef.current = 0;
                setLiveText(liveRef.current);
              });
            }
          },
        });
        if (!assembledText.trim()) {
          assembledText = "Me quedé en blanco. Tirame de nuevo.";
        }
        patchMessage(assistantId, assembledText);
        addChecks(runReplyChecks({ reply: assembledText, canonText }));
      } catch (err) {
        const aborted = (err as Error).name === "AbortError";
        if (aborted) {
          const cut = assembledText.trim() || "Se cortó. Probá de nuevo.";
          patchMessage(assistantId, cut);
          if (!assembledText.trim()) toast.error("Grok tardó demasiado.");
        } else {
          const message = err instanceof Error ? err.message : "Algo falló.";
          patchMessage(assistantId, assembledText.trim() || message);
          toast.error(message);
        }
      } finally {
        window.clearTimeout(timeout);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
        setLiveText("");
        liveRef.current = "";
        setBusy(false);
        setStreamingId(null);
        abortRef.current = null;
      }

      if (useRick.getState().autoSpeak && assembledText.trim()) {
        try {
          await speaker.play(assistantId, assembledText, PERSONAS[state.voice].voiceId);
        } catch {
          toast.error("No pude hablar ahora.");
        }
      }
    },
    [addChecks, addMessage, bumpTurns, busy, patchMessage, setLastAssembled, speaker],
  );

  const mic = useMic((text) => void sendText(text));

  async function handleCommand(raw: string): Promise<boolean> {
    const text = raw.trim();
    if (!text.startsWith("/")) return false;
    const [cmd] = text.slice(1).toLowerCase().split(/\s+/);
    if (cmd === "grabar") {
      try {
        await recorder.start();
        toast("Grabando. /parar o el botón para cortar.");
      } catch {
        toast.error("No pude usar el micrófono.");
      }
      return true;
    }
    if (cmd === "parar" || cmd === "stop") {
      const item = await recorder.stop();
      if (item) {
        setTapeKey((k) => k + 1);
        toast.success("Grabación guardada.");
        setView("grabaciones");
      }
      return true;
    }
    if (cmd === "agenda") {
      setView("agenda");
      return true;
    }
    if (cmd === "canon") {
      setView("canon");
      return true;
    }
    if (cmd === "inspeccionar" || cmd === "inspect" || cmd === "paquete") {
      setView("inspect");
      return true;
    }
    if (cmd === "grabaciones" || cmd === "cintas") {
      setView("grabaciones");
      return true;
    }
    if (cmd === "candado") {
      setLockOpen(true);
      return true;
    }
    if (cmd === "restaurar") {
      const last = backups[0];
      if (!last) {
        toast.error("No hay respaldo.");
        return true;
      }
      restoreBackup(last.id);
      toast.success("Hilo restaurado.");
      return true;
    }
    if (cmd === "olvidar") {
      setForgetOpen(true);
      return true;
    }
    if (cmd === "grok" || cmd === "espejo" || cmd === "acido" || cmd === "3am" || cmd === "night") {
      const id = (cmd === "3am" ? "night" : cmd) as PersonaId;
      setVoice(id);
      toast(`Voz: ${PERSONAS[id].name}`);
      return true;
    }
    toast.error("Comando desconocido. /grabar /parar /agenda /canon /paquete /olvidar /candado");
    return true;
  }

  async function onSubmit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (await handleCommand(text)) return;
    await sendText(text);
  }

  async function onRecClick() {
    try {
      if (recorder.recording) {
        const item = await recorder.stop();
        if (item) {
          setTapeKey((k) => k + 1);
          toast.success("Grabación guardada.");
        }
      } else {
        await recorder.start();
        toast("Grabando.");
      }
    } catch {
      toast.error("No pude usar el micrófono.");
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-dvh overflow-hidden bg-bg text-fg">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line lg:flex">
          <div className="px-4 pt-5 pb-3">
            <p className="font-display text-xl tracking-tight">Rick App</p>
            <p className="mt-1 text-xs text-muted">El entorno arma el turno</p>
          </div>
          <nav className="flex flex-col gap-1 px-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-md px-3 text-sm",
                  view === item.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-3 py-4">
            <p className="mb-2 text-xs text-subtle uppercase">Dominio</p>
            <select
              className="h-11 w-full rounded-md bg-surface-2 px-2 text-sm text-fg"
              value={domain.id}
              onChange={(e) => switchDomain(e.target.value)}
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setDomainOpen(true)}>
              Nuevo dominio
            </Button>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 px-3 py-3 md:px-5">
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-none tracking-tight">Rick App</p>
              <p className="mt-1 truncate text-xs text-muted">
                {domain.name} · {PERSONAS[voice].name}
                {locked ? " · candado" : ""}
                {recorder.recording ? " · grabando" : ""}
              </p>
            </div>
            {recorder.recording ? <span className="rec-dot size-2 rounded-full bg-rec" /> : null}
            <Tooltip content={locked ? "Candado puesto — Grok no gasta" : "Candado de gasto"}>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Candado"
                onClick={() => setLockOpen(true)}
                className={cn(locked && "text-accent")}
              >
                {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
              </Button>
            </Tooltip>
            <Tooltip content={recorder.recording ? "Parar grabación" : "Grabar audio (/grabar)"}>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Grabar"
                onClick={() => void onRecClick()}
                className={cn(recorder.recording && "text-rec")}
              >
                {recorder.recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              </Button>
            </Tooltip>
            <Tooltip content={autoSpeak ? "No leer en voz alta" : "Leer respuestas"}>
              <Button
                variant="ghost"
                size="iconSm"
                aria-label="Voz"
                onClick={() => setAutoSpeak(!autoSpeak)}
              >
                {autoSpeak ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
            </Tooltip>
          </header>

          {view === "mesa" ? (
            <DropCanvas domainId={domain.id} className="flex min-h-0 flex-1 flex-col">
              <div className="px-3 md:px-5">
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {PERSONA_LIST.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setVoice(p.id)}
                      className={cn(
                        "flex h-11 shrink-0 items-center rounded-full px-3 text-sm",
                        voice === p.id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="mb-2 flex max-w-full gap-1 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setView("canon")}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs",
                      identity.trim() ? "bg-surface-2 text-muted" : "text-subtle hover:text-fg",
                    )}
                  >
                    {identity.trim() ? "Personalidad cargada" : "Cargar personalidad"}
                  </button>
                  {topicDocs.length ? (
                    topicDocs.slice(0, 6).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setView("canon")}
                        className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted"
                      >
                        {d.title}
                      </button>
                    ))
                  ) : (
                    <span className="shrink-0 py-1 text-xs text-subtle">
                      Clip = tema al canon de {domain.name}
                    </span>
                  )}
                  {topicDocs.length > 6 ? (
                    <span className="shrink-0 px-2 py-1 text-xs text-subtle">+{topicDocs.length - 6}</span>
                  ) : null}
                </div>
              </div>
              <MesaThread
                messages={thread}
                streamingId={streamingId}
                liveText={liveText}
                playingId={speaker.playingId}
                locked={locked}
                onSpeak={(id, content, v) => {
                  void speaker.play(id, content, PERSONAS[v].voiceId).catch(() => {
                    toast.error("No pude hablar ahora.");
                  });
                }}
                onStop={speaker.stop}
              />
              <Composer
                value={draft}
                onChange={setDraft}
                onSend={() => void onSubmit()}
                onMic={mic.toggle}
                domainId={domain.id}
                disabled={busy}
                listening={mic.listening}
                micSupported={mic.supported}
                locked={locked}
              />
            </DropCanvas>
          ) : null}
          {view === "agenda" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AgendaPanel />
            </div>
          ) : null}
          {view === "grabaciones" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <RecordingsPanel refreshKey={tapeKey} />
            </div>
          ) : null}
          {view === "canon" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <CanonPanel />
            </div>
          ) : null}
          {view === "inspect" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <InspectPanel />
            </div>
          ) : null}

          <nav className="flex border-t border-line lg:hidden">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.65rem]",
                  view === item.id ? "text-fg" : "text-muted",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </main>
      </div>

      <ForgetDialog
        open={forgetOpen}
        domainName={domain.name}
        onCancel={() => setForgetOpen(false)}
        onConfirm={() => {
          const backup = forgetActive();
          setForgetOpen(false);
          if (backup) toast.success("Hilo olvidado. Hay respaldo en Paquete.");
          else toast("No había hilo para olvidar.");
        }}
      />
      <LockDialog
        open={lockOpen}
        enabled={lockEnabled}
        hasPin={Boolean(pinHash)}
        onClose={() => {
          setLockOpen(false);
          if (pendingRef.current) {
            setDraft(pendingRef.current);
            pendingRef.current = null;
          }
        }}
        onSetPin={async (pin) => {
          const salt = newSalt();
          const hash = await hashPin(pin, salt);
          setLock(true, salt, hash);
          setSessionUnlocked(true);
          setUnlocked(true);
          toast.success("Candado activado.");
        }}
        onUnlock={async (pin) => {
          const hash = await hashPin(pin, pinSalt);
          if (hash !== pinHash) return false;
          setSessionUnlocked(true);
          setUnlocked(true);
          setLockOpen(false);
          toast.success("Sesión desbloqueada.");
          const pending = pendingRef.current;
          pendingRef.current = null;
          if (pending) void sendText(pending);
          return true;
        }}
        onDisable={() => {
          clearPin();
          setSessionUnlocked(false);
          setUnlocked(false);
          toast("Candado quitado.");
        }}
      />
      <DomainDialog open={domainOpen} onClose={() => setDomainOpen(false)} onCreate={addDomain} />
    </TooltipProvider>
  );
}

function MesaThread({
  messages,
  streamingId,
  liveText,
  playingId,
  locked,
  onSpeak,
  onStop,
}: {
  messages: { id: string; role: "user" | "assistant"; content: string; voice: PersonaId }[];
  streamingId: string | null;
  liveText: string;
  playingId: string | null;
  locked: boolean;
  onSpeak: (id: string, content: string, voice: PersonaId) => void;
  onStop: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streamingId, liveText]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Rick App</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">El entorno arma el turno</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Canon entra entero. Biblioteca, a mano. La sesión está aislada por dominio. Inspeccioná el
          paquete. /olvidar pide confirmación y deja respaldo.
          {locked ? " Candado puesto: Grok no gasta hasta desbloquear." : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 md:px-8">
      {messages.map((m) =>
        m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[min(42rem,88%)] rounded-lg bg-surface-2 px-4 py-3 shadow-[var(--shadow-border)]">
              <p className="whitespace-pre-wrap text-base leading-relaxed">{m.content}</p>
            </div>
          </div>
        ) : (
          <div key={m.id} className="max-w-[min(42rem,92%)]">
            <p className="mb-2 text-xs text-muted">{PERSONAS[m.voice].name}</p>
            {(() => {
              const body = m.id === streamingId ? liveText || m.content : m.content;
              if (!body && m.id === streamingId) {
                return <p className="shimmer-text text-sm">Pensando</p>;
              }
              return (
                <>
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {body}
                    {m.id === streamingId ? (
                      <span className="caret-pulse ml-0.5 inline-block h-4 w-px bg-fg align-middle" />
                    ) : null}
                  </p>
                  {body && m.id !== streamingId ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-11 px-2 text-muted"
                      onClick={() => (playingId === m.id ? onStop() : onSpeak(m.id, body, m.voice))}
                    >
                      {playingId === m.id ? "Callar" : "Escuchar"}
                    </Button>
                  ) : null}
                </>
              );
            })()}
          </div>
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onMic,
  domainId,
  disabled,
  listening,
  micSupported,
  locked,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
  domainId: string;
  disabled: boolean;
  listening: boolean;
  micSupported: boolean;
  locked: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onSend();
  }

  return (
    <form onSubmit={submit} className="safe-composer px-3 md:px-5">
      <div className="mx-auto w-full max-w-2xl rounded-xl bg-surface p-2 pl-3 shadow-[var(--shadow-border)]">
        <Textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={locked ? "Candado puesto — /candado para desbloquear" : "Mensaje, /olvidar, o adjuntá un tema"}
          aria-label="Mensaje"
          className="max-h-40 min-h-11 text-sm md:text-base"
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <p className="text-xs text-subtle">
            {locked ? "Grok no gasta" : listening ? "Te escucho…" : "Clip = tema al canon · Enter envía"}
          </p>
          <div className="flex gap-1">
            <AttachButton domainId={domainId} kind="canon" iconOnly label="Adjuntar tema al canon" />
            {micSupported ? (
              <Button type="button" variant="ghost" size="iconSm" onClick={onMic} aria-label="Hablar">
                {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
              </Button>
            ) : null}
            <Button
              type="submit"
              size="iconSm"
              disabled={disabled || !value.trim()}
              aria-label="Enviar"
              className="rounded-full"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
