import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowUp,
  CalendarDays,
  Circle,
  FileText,
  KeyRound,
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
  ApiKeyDialog,
  DomainDialog,
  ForgetDialog,
  IdentityDialog,
  LockDialog,
} from "@/components/rick/dialogs";
import { AgendaPanel, CanonPanel, InspectPanel, RecordingsPanel } from "@/components/rick/panels";
import { AttachButton, DropCanvas } from "@/components/rick/attach";
import { useMic, useSpeaker } from "@/lib/chat/hooks";
import { PERSONA_LIST, PERSONAS, type PersonaId } from "@/lib/chat/personas";
import { streamChat } from "@/lib/chat/xai";
import { assemble, orderOk } from "@/lib/rick/assemble";
import { validateContract } from "@/lib/rick/contract";
import { contradictionScore, replyCanonScore, CANON_BLOCK, CANON_WARN } from "@/lib/rick/contradiction";
import { formatDiag } from "@/lib/rick/diag";
import { computeDrift } from "@/lib/rick/drift";
import { enforceMemoryUsage } from "@/lib/rick/enforcer";
import { isHomeAxis } from "@/lib/rick/factual";
import { runChecks, runReplyChecks } from "@/lib/rick/govern";
import {
  hashPin,
  isSessionUnlocked,
  newSalt,
  setSessionUnlocked,
} from "@/lib/rick/lock";
import { useRecorder } from "@/lib/rick/recorder";
import { recorridoText } from "@/lib/rick/recorrido";
import { useActiveDomain, useRick, rehydrateRick } from "@/lib/rick/store";
import { maybeSummarize } from "@/lib/rick/summary";
import { overlap } from "@/lib/rick/tokens";
import type { ViewId } from "@/lib/rick/types";
import { computeVce } from "@/lib/rick/vce";
import { cn, uid } from "@/lib/utils";
import { watchKeyboard } from "@/lib/rick/keyboard";
import { readOwnerKey } from "@/lib/rick/owner-key";

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
  const setSummary = useRick((s) => s.setSummary);
  const setDiag = useRick((s) => s.setDiag);
  const setFocusState = useRick((s) => s.setFocus);
  const ackMotor = useRick((s) => s.ackMotor);
  const ackDrift = useRick((s) => s.ackDrift);
  const setMotor = useRick((s) => s.setMotor);
  const bumpUsage = useRick((s) => s.bumpUsage);
  const setDriftBlocked = useRick((s) => s.setDriftBlocked);
  const addDoc = useRick((s) => s.addDoc);
  const addTrace = useRick((s) => s.addTrace);
  const motorBlocked = useRick((s) => s.motorBlocked);
  const motorRef = useRick((s) => s.motorRef);
  const motorLast = useRick((s) => s.motorLast);
  const focus = useRick((s) => s.focus);

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [liveText, setLiveText] = useState("");
  const [tapeKey, setTapeKey] = useState(0);
  const [forgetOpen, setForgetOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [serverGrok, setServerGrok] = useState<boolean | null>(null);
  const [hasOwnerKey, setHasOwnerKey] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [kb, setKb] = useState(0);
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
    setHasOwnerKey(Boolean(readOwnerKey()));
    void fetch("/api/chat")
      .then((r) => r.json() as Promise<{ grok?: boolean }>)
      .then((body) => {
        const ready = Boolean(body.grok);
        setServerGrok(ready);
        if (!ready && !readOwnerKey()) setKeyOpen(true);
      })
      .catch(() => {
        setServerGrok(false);
        if (!readOwnerKey()) setKeyOpen(true);
      });
  }, []);

  useEffect(() => {
    setUnlocked(isSessionUnlocked());
  }, [lockEnabled]);

  useEffect(() => watchKeyboard(setKb), []);

  const thread = messages.filter((m) => m.domainId === domain.id);
  const locked = lockEnabled && !unlocked;
  const topicDocs = useRick((s) => s.docs).filter(
    (d) => d.domainId === domain.id && d.kind === "canon" && d.id !== "frame",
  );
  const identity = useRick((s) => s.identity);
  const hydrated = useRick((s) => s.hydrated);
  const home = isHomeAxis(domain.id);
  const grokReady = serverGrok === true || hasOwnerKey;
  const needsKey = serverGrok === false && !hasOwnerKey;
  const needsIdentity = grokReady && hydrated && !identity.trim();

  const sendText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      const state = useRick.getState();
      if (serverGrok === false && !readOwnerKey()) {
        setKeyOpen(true);
        toast.error("Primero la API key de xAI.");
        return;
      }
      if (!state.identity.trim()) {
        toast.error("Ahora la personalidad.");
        return;
      }
      if (state.lockEnabled && !isSessionUnlocked()) {
        pendingRef.current = text;
        setLockOpen(true);
        return;
      }
      if (state.motorBlocked) {
        toast.error("Motor cambió. /motor para reconocer el modelo nuevo.");
        return;
      }
      if (state.driftBlocked) {
        toast.error("Deriva crítica. /drift para continuar.");
        return;
      }

      const active = state.domains.find((d) => d.id === state.activeDomainId) ?? state.domains[0];
      const domainMsgs = state.messages.filter((m) => m.domainId === active.id);
      const canonDocs = state.docs.filter(
        (d) => d.kind === "canon" && d.domainId === active.id && !d.deprecated,
      );
      const canonText = canonDocs.map((d) => d.normalized || `${d.title}\n${d.body}`).join("\n");
      const otherCanon = state.docs
        .filter((d) => d.kind === "canon" && d.domainId !== active.id && !d.deprecated)
        .map((d) => d.normalized || `${d.title}\n${d.body}`)
        .join("\n");
      const vce = computeVce(domainMsgs);
      const drift = computeDrift(text, domainMsgs);
      const contra = contradictionScore(text, canonText, otherCanon);
      const recorrido = recorridoText(state.domains, state.checks, active.id, state.recorridoSeq);
      const identityPresent = Boolean(state.identity.trim());
      const meta =
        active.turnCount > 0 && active.turnCount % 20 === 0
          ? `turno ${active.turnCount} · eje ${active.name} · bytes de gobierno, no contenido`
          : "";

      if (drift.risk === "CRITICAL") {
        setDriftBlocked(true);
        addChecks([
          {
            id: uid(),
            at: Date.now(),
            kind: "deriva",
            alert: true,
            abstain: false,
            detail: `CRITICAL · ${drift.reason}`,
          },
        ]);
        toast.error("Deriva crítica. /drift para continuar.");
      }

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
        diagPrev: state.diagPrev,
        recorrido,
        sessionSummary: state.summaries[active.id] ?? "",
        focus: state.focus,
        vceInstruction: vce.instruction,
        driftLine: `${drift.risk} · ${drift.type} · ${drift.reason}`,
        anclaIdentity: identityPresent,
        meta,
      });
      const orden = orderOk(assembled.sections);
      const contract = validateContract(assembled.sections);
      assembled.contractOk = contract.ok;
      assembled.driftRisk = drift.risk;
      setLastAssembled(assembled);

      const extraChecks = [
        ...runChecks({
          userTurn: text,
          messages: domainMsgs,
          canonCount: canonDocs.length,
          canonText,
          identity: state.identity,
          agendaCount: state.events.filter(
            (e) => e.domainId === active.id && e.start >= Date.now() - 3600000,
          ).length,
        }),
        {
          id: uid(),
          at: Date.now(),
          kind: "contradiccion" as const,
          alert: contra.score >= CANON_WARN,
          abstain: false,
          detail: contra.type === "ninguna" ? "sin contradicción léxica" : `directa ${contra.score.toFixed(2)}`,
        },
        {
          id: uid(),
          at: Date.now(),
          kind: "vce" as const,
          alert: false,
          abstain: vce.mode === "OBSERVE",
          detail: `${vce.mode} · ${vce.diagnosis}`,
        },
        {
          id: uid(),
          at: Date.now(),
          kind: "ancla" as const,
          alert: false,
          abstain: false,
          detail: identityPresent ? "identidad en el paquete" : "identidad vacía (declarada)",
        },
        {
          id: uid(),
          at: Date.now(),
          kind: "orden" as const,
          alert: !orden.ok,
          abstain: false,
          detail: orden.ok ? "secciones en orden canónico" : `fuera de orden: ${orden.detail}`,
        },
        {
          id: uid(),
          at: Date.now(),
          kind: "contrato" as const,
          alert: !contract.ok,
          abstain: false,
          detail: contract.ok ? "contrato OK" : `FAIL ${contract.detail}`,
        },
        {
          id: uid(),
          at: Date.now(),
          kind: "deriva" as const,
          alert: drift.risk === "HIGH" || drift.risk === "CRITICAL",
          abstain: drift.abstain,
          detail: `${drift.risk} · ${drift.type} · ${drift.reason}`,
        },
      ];
      addChecks(extraChecks);

      addMessage({ domainId: active.id, role: "user", content: text, voice: state.voice });
      bumpTurns();
      setDraft("");

      if (drift.risk === "CRITICAL" || !contract.ok) {
        const reason =
          drift.risk === "CRITICAL" ? "deriva CRITICAL" : `contrato FAIL: ${contract.detail}`;
        addMessage({
          domainId: active.id,
          role: "assistant",
          content: `[BLOQUEADO] ${reason}. La respuesta no entra al hilo.`,
          voice: state.voice,
        });
        toast.error(reason);
        return;
      }

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
      let modelName = "";
      try {
        const streamed = await streamChat({
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
        assembledText = streamed.text;
        modelName = streamed.model;
        if (!assembledText.trim()) {
          assembledText = "Me quedé en blanco. Tirame de nuevo.";
        }

        const lastAsst = [...domainMsgs].reverse().find((m) => m.role === "assistant")?.content ?? "";
        const enf = enforceMemoryUsage({
          userTurn: text,
          reply: assembledText,
          lastAssistant: lastAsst,
        });
        const canonHit = replyCanonScore(assembledText, canonText);
        let blocked = enf.decision === "BLOCK";
        let blockReason = enf.reason;
        if (!blocked && canonText.trim() && canonHit > CANON_BLOCK && contra.score > 0) {
          blocked = true;
          blockReason = `contradicción con canon ${canonHit.toFixed(2)}`;
        }

        addChecks([
          {
            id: uid(),
            at: Date.now(),
            kind: "enforcer",
            alert: enf.decision !== "PASS",
            abstain: false,
            detail: `${enf.decision} · ${enf.reason}`,
          },
          ...runReplyChecks({ reply: assembledText, canonText }),
        ]);

        if (modelName) {
          const motor = setMotor(modelName);
          if (motor.first) toast(`Motor de referencia: ${modelName}`);
          if (motor.blocked) toast.error(`Motor distinto (${modelName}). /motor para reconocer.`);
        }

        if (blocked) {
          const msg = `[BLOQUEADO] ${blockReason}. La respuesta no entra al hilo.`;
          patchMessage(assistantId, msg);
          toast.error(msg);
        } else {
          patchMessage(assistantId, assembledText);
          if (assembled.selectedIds?.length) bumpUsage(assembled.selectedIds);
          if (state.focus && state.focus.domainId === active.id) {
            const hit = overlap(assembledText, `${state.focus.label} ${state.focus.thesis}`);
            if (assembledText.length > 80 && hit === 0) {
              addChecks([
                {
                  id: uid(),
                  at: Date.now(),
                  kind: "foco",
                  alert: true,
                  abstain: false,
                  detail: "FOCUS DISPLACED — la respuesta no toca el foco declarado",
                },
              ]);
              toast("Foco desplazado.");
            }
          }
          const sum = maybeSummarize({
            messages: [
              ...domainMsgs,
              {
                id: assistantId,
                domainId: active.id,
                role: "assistant",
                content: assembledText,
                voice: state.voice,
                createdAt: Date.now(),
              },
            ],
            previous: state.summaries[active.id] ?? "",
            canonText,
          });
          if (sum.rejected) {
            addChecks([
              {
                id: uid(),
                at: Date.now(),
                kind: "resumen",
                alert: true,
                abstain: false,
                detail: sum.reason,
              },
            ]);
          } else if (sum.summary !== (state.summaries[active.id] ?? "")) {
            setSummary(active.id, sum.summary);
          }
        }

        const diag = {
          foco: state.focus?.label ?? "s/d",
          abstraccion: "s/d",
          deriva: extraChecks.find((c) => c.kind === "deriva")?.detail ?? "LOW",
          vce: `${vce.mode} (${vce.diagnosis})`,
          enforcer: blocked ? `BLOCK (${blockReason})` : `${enf.decision} (${enf.reason})`,
          contradiccion: String(contra.score),
          cobertura: canonHit.toFixed(2),
          densidad: String(vce.tema.toFixed(2)),
          continuidad: extraChecks.find((c) => c.kind === "deriva")?.detail ?? "s/d",
          loop: active.name,
          tema: String(vce.tema.toFixed(2)),
          profundidad: vce.profundidad,
          balance: vce.balance,
          selector: "lexico",
        };
        setDiag(diag, formatDiag(diag));
      } catch (err) {
        const aborted = (err as Error).name === "AbortError";
        if (aborted) {
          const cut = assembledText.trim() || "Se cortó. Probá de nuevo.";
          patchMessage(assistantId, cut);
          if (!assembledText.trim()) toast.error("La entidad tardó demasiado.");
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

      const finalText = useRick.getState().messages.find((m) => m.id === assistantId)?.content ?? "";
      if (useRick.getState().autoSpeak && finalText.trim() && !finalText.startsWith("[BLOQUEADO]")) {
        try {
          await speaker.play(assistantId, finalText, PERSONAS[state.voice].voiceId);
        } catch {
          toast.error("No pude hablar ahora.");
        }
      }
    },
    [addChecks, addMessage, bumpTurns, bumpUsage, busy, patchMessage, serverGrok, setDiag, setDriftBlocked, setLastAssembled, setMotor, setSummary, speaker],
  );

  const mic = useMic((text) => void sendText(text));

  async function handleCommand(raw: string): Promise<boolean> {
    const text = raw.trim();
    if (!text.startsWith("/")) return false;
    const [cmd, ...rest] = text.slice(1).split(/\s+/);
    const key = cmd.toLowerCase();
    if (key === "grabar") {
      try {
        await recorder.start();
        toast("Grabando. /parar o el botón para cortar.");
      } catch {
        toast.error("No pude usar el micrófono.");
      }
      return true;
    }
    if (key === "parar" || key === "stop") {
      const item = await recorder.stop();
      if (item) {
        setTapeKey((k) => k + 1);
        toast.success("Grabación guardada.");
        setView("grabaciones");
      }
      return true;
    }
    if (key === "agenda") {
      setView("agenda");
      return true;
    }
    if (key === "canon") {
      setView("canon");
      return true;
    }
    if (key === "inspeccionar" || key === "inspect" || key === "paquete") {
      setView("inspect");
      return true;
    }
    if (key === "grabaciones" || key === "cintas") {
      setView("grabaciones");
      return true;
    }
    if (key === "candado") {
      setLockOpen(true);
      return true;
    }
    if (key === "recorrido") {
      toast(recorridoText(useRick.getState().domains, useRick.getState().checks, domain.id, useRick.getState().recorridoSeq));
      setView("inspect");
      return true;
    }
    if (key === "remember" || key === "recordar") {
      const body = rest.join(" ").trim();
      if (!body) {
        toast.error("/remember <texto canónico de este eje>");
        return true;
      }
      const result = addDoc({
        domainId: domain.id,
        title: body.slice(0, 48),
        body,
        kind: "canon",
      });
      toast(result.duplicate ? "Ya estaba en el canon de este eje." : "Canónico en este eje.");
      return true;
    }
    if (key === "vce") {
      const v = computeVce(messages.filter((m) => m.domainId === domain.id));
      toast(`VCE ${v.mode} · ${v.diagnosis}`);
      return true;
    }
    if (key === "banco") {
      setView("inspect");
      toast("Paquete → Banco.");
      return true;
    }
    if (key === "focus" || key === "foco") {
      const sub = rest[0]?.toLowerCase();
      if (sub === "clear" || sub === "limpiar") {
        setFocusState(null);
        toast("Foco limpio.");
        return true;
      }
      const thesis = rest.join(" ").replace(/^(set|conversacion|conversación)\s+/i, "").trim();
      if (!thesis) {
        toast(focus ? `Foco: ${focus.label}` : "Uso: /focus set <tesis>");
        return true;
      }
      setFocusState({ label: thesis.slice(0, 40), thesis, domainId: domain.id });
      toast("Foco fijado.");
      return true;
    }
    if (key === "motor") {
      const sub = rest[0]?.toLowerCase();
      if (sub === "acknowledge" || sub === "ack") {
        ackMotor();
        toast("Motor reconocido.");
        return true;
      }
      toast(`ref=${motorRef || "—"} last=${motorLast || "—"} ${motorBlocked ? "BLOQUEADO" : "ok"}`);
      return true;
    }
    if (key === "drift") {
      ackDrift();
      toast("Deriva reconocida.");
      return true;
    }
    if (key === "restaurar") {
      const last = backups[0];
      if (!last) {
        toast.error("No hay respaldo.");
        return true;
      }
      restoreBackup(last.id);
      toast.success("Hilo restaurado.");
      return true;
    }
    if (key === "olvidar") {
      setForgetOpen(true);
      return true;
    }
    if (
      key === "grok" ||
      key === "rick" ||
      key === "entidad" ||
      key === "espejo" ||
      key === "acido" ||
      key === "3am" ||
      key === "night"
    ) {
      const id = (
        key === "3am" || key === "night"
          ? "night"
          : key === "rick" || key === "entidad" || key === "grok"
            ? "grok"
            : key
      ) as PersonaId;
      setVoice(id);
      toast(`Voz: ${PERSONAS[id].name}`);
      return true;
    }
    toast.error("Comandos: /olvidar /paquete /canon /remember /recorrido /focus /motor /drift /vce /candado /grabar");
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
      <div className="rick-shell flex h-full bg-bg text-fg">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line lg:flex">
          <div className="px-4 pt-5 pb-3">
            <p className="font-display text-xl tracking-tight">Rick App</p>
            <p className="mt-1 text-xs text-muted">v9 · matrix</p>
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
                  {d.id === "mesa" ? `${d.name} · casa` : d.name}
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
                {domain.name}
                {home ? " · casa" : " · fáctico"} · {PERSONAS[voice].name}
                {locked ? " · candado" : ""}
                {motorBlocked ? " · motor" : ""}
                {focus ? ` · foco ${focus.label}` : ""}
                {recorder.recording ? " · grabando" : ""}
              </p>
            </div>
            {recorder.recording ? <span className="rec-dot size-2 rounded-full bg-rec" /> : null}
            {serverGrok === false ? (
              <Tooltip content="Cambiar API key de xAI">
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="API key"
                  onClick={() => setKeyOpen(true)}
                  className="text-accent"
                >
                  <KeyRound className="size-4" />
                </Button>
              </Tooltip>
            ) : null}
            <Tooltip content={locked ? "Candado puesto — la entidad no gasta" : "Candado de gasto"}>
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
              <Button variant="ghost" size="iconSm" aria-label="Voz" onClick={() => setAutoSpeak(!autoSpeak)}>
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
                home={home}
                awaitingIdentity={needsIdentity}
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
                disabled={busy || needsKey || needsIdentity}
                listening={mic.listening}
                micSupported={mic.supported}
                locked={locked}
                kb={kb}
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
      <ApiKeyDialog
        open={keyOpen}
        onSaved={() => {
          setHasOwnerKey(true);
          setKeyOpen(false);
          toast.success("Clave guardada en este navegador.");
        }}
        onCancel={hasOwnerKey ? () => setKeyOpen(false) : undefined}
      />
      <IdentityDialog open={needsIdentity && !keyOpen} />
    </TooltipProvider>
  );
}

function MesaThread({
  messages,
  streamingId,
  liveText,
  playingId,
  locked,
  home,
  awaitingIdentity,
  onSpeak,
  onStop,
}: {
  messages: { id: string; role: "user" | "assistant"; content: string; voice: PersonaId }[];
  streamingId: string | null;
  liveText: string;
  playingId: string | null;
  locked: boolean;
  home: boolean;
  awaitingIdentity: boolean;
  onSpeak: (id: string, content: string, voice: PersonaId) => void;
  onStop: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    if (!stick.current) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, streamingId]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Rick App · matrix</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          {awaitingIdentity ? "Ahora, quién sos" : "El entorno arma el turno"}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          {awaitingIdentity
            ? "La clave ya está. Falta la personalidad: identidad, no un tema de la mesa."
            : home
              ? "Mesa es eje casa: podés estar. Anti-invención de hechos se conserva."
              : "Eje de trabajo: modo fáctico salvo verbo generativo. Canon entra entero."}{" "}
          {!awaitingIdentity
            ? `Trece secciones. CONTEXTO 2 vuelve. /olvidar pide confirmación.${locked ? " Candado puesto: la entidad no gasta hasta desbloquear." : ""}`
            : null}
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
  kb,
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
  kb: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
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
    <form
      onSubmit={submit}
      className="safe-composer px-3 md:px-5"
      style={{ paddingBottom: `calc(${kb}px + max(0.75rem, env(safe-area-inset-bottom, 0px)))` }}
    >
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
          className="max-h-40 min-h-11 text-base"
          enterKeyHint="send"
          onFocus={() => window.scrollTo(0, 0)}
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <p className="text-xs text-subtle">
            {locked ? "La entidad no gasta" : listening ? "Te escucho…" : "Clip = tema al canon · Enter envía"}
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
