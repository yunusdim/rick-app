import { useEffect, useState, type ReactNode } from "react";
import { Hand, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AudioRow } from "@/components/rick/audio-row";
import { AttachButton, DropCanvas } from "@/components/rick/attach";
import { InspectPanel } from "@/components/rick/inspect";
import { deleteRecording, listRecordingMeta, type RecordingMeta } from "@/lib/rick/idb";
import { HAND_WINDOW } from "@/lib/rick/types";
import { useActiveDomain, useRick } from "@/lib/rick/store";
import { cn } from "@/lib/utils";

export { InspectPanel };

export function AgendaPanel() {
  const events = useRick((s) => s.events);
  const addEvent = useRick((s) => s.addEvent);
  const removeEvent = useRick((s) => s.removeEvent);
  const domain = useActiveDomain();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");

  const upcoming = events
    .filter((e) => e.domainId === domain.id)
    .sort((a, b) => a.start - b.start);

  function add() {
    if (!title.trim() || !when) {
      toast.error("Título y fecha.");
      return;
    }
    addEvent({
      domainId: domain.id,
      title: title.trim(),
      start: new Date(when).getTime(),
      notes: notes.trim(),
    });
    setTitle("");
    setNotes("");
    toast.success("Anotado.");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h2 className="font-display text-3xl tracking-tight">Agenda</h2>
        <p className="mt-1 text-sm text-muted">
          Solo este dominio. Entra al turno como sección, no como canon.
        </p>
      </header>
      <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Qué" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <Textarea
          className="mt-3 min-h-16 text-sm"
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button className="mt-3" onClick={add}>
          Anotar
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">Nada en la agenda de {domain.name}.</p>
        ) : (
          upcoming.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]"
            >
              <div>
                <p className="text-sm text-fg">{e.title}</p>
                <p className="mt-1 text-xs text-muted tabular-nums">
                  {new Date(e.start).toLocaleString("es-AR")}
                </p>
                {e.notes ? <p className="mt-1 text-xs text-subtle">{e.notes}</p> : null}
              </div>
              <button
                type="button"
                className="size-11 text-subtle hover:text-fg"
                aria-label="Borrar evento"
                onClick={() => removeEvent(e.id)}
              >
                <Trash2 className="mx-auto size-4" />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function RecordingsPanel({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<RecordingMeta[]>([]);
  const domain = useActiveDomain();

  useEffect(() => {
    void listRecordingMeta().then(setRows);
  }, [refreshKey]);

  const mine = rows.filter((r) => r.domainId === domain.id);

  async function remove(id: string) {
    await deleteRecording(id);
    setRows(await listRecordingMeta());
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h2 className="font-display text-3xl tracking-tight">Grabaciones</h2>
        <p className="mt-1 text-sm text-muted">
          Comando <span className="text-fg">/grabar</span> o el micrófono. Quedan en este dominio.
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {mine.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay cintas en {domain.name}.</p>
        ) : (
          mine.map((r) => (
            <AudioRow
              key={r.id}
              rec={r}
              onRemove={() => void remove(r.id)}
            />
          ))
        )}
      </ul>
    </div>
  );
}

export function CanonPanel() {
  const identity = useRick((s) => s.identity);
  const setIdentity = useRick((s) => s.setIdentity);
  const docs = useRick((s) => s.docs);
  const addDoc = useRick((s) => s.addDoc);
  const removeDoc = useRick((s) => s.removeDoc);
  const promoteDoc = useRick((s) => s.promoteDoc);
  const demoteDoc = useRick((s) => s.demoteDoc);
  const handPins = useRick((s) => s.handPins);
  const pinToHand = useRick((s) => s.pinToHand);
  const unpinFromHand = useRick((s) => s.unpinFromHand);
  const domain = useActiveDomain();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"canon" | "library">("canon");
  const [tick, setTick] = useState(0);

  const mine = docs.filter((d) => d.domainId === domain.id);
  const topics = mine.filter((d) => d.id !== "frame" && d.kind === "canon" && !d.deprecated);
  const library = mine.filter((d) => d.kind === "library" && !d.deprecated);
  const retired = mine.filter((d) => d.deprecated);
  const frame = mine.find((d) => d.id === "frame");

  function save() {
    if (!title.trim() || !body.trim()) {
      toast.error("Título y texto.");
      return;
    }
    const result = addDoc({ domainId: domain.id, title: title.trim(), body, kind });
    setTitle("");
    setBody("");
    if (result.duplicate) toast("Ya estaba en este eje (mismo hash).");
    else toast.success(kind === "canon" ? "Tema en canon." : "A la biblioteca.");
  }

  return (
    <DropCanvas
      domainId={domain.id}
      kind={kind}
      className="min-h-full"
      onDone={() => setTick((n) => n + 1)}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <header>
          <h2 className="font-display text-3xl tracking-tight">Canon</h2>
          <p className="mt-1 text-sm text-muted">
            Temas de la charla, y aparte la personalidad. Archivos: PDF, Word, Markdown o texto.
          </p>
        </header>

        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium tracking-widest text-muted uppercase">Personalidad</p>
              <p className="mt-1 text-xs text-subtle">
                Cómo te trata el sistema. No es un tema. Entra en IDENTIDAD, transversal a los dominios.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AttachButton domainId={domain.id} kind="identity" label="Cargar personalidad" />
              {identity.trim() ? (
                <Button variant="ghost" size="sm" onClick={() => setIdentity("")}>
                  Vaciar
                </Button>
              ) : null}
            </div>
          </div>
          <Textarea
            className="mt-3 min-h-28 text-sm"
            placeholder="Adjuntá un archivo o escribí acá."
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
          />
          {identity.trim() ? (
            <p className="mt-2 text-xs tabular-nums text-subtle">{identity.length} caracteres cargados</p>
          ) : (
            <p className="mt-2 text-xs text-subtle">Todavía no hay personalidad.</p>
          )}
        </section>

        <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cn(
                "h-11 rounded-full px-3 text-sm",
                kind === "canon" ? "bg-surface-2 text-fg" : "text-muted",
              )}
              onClick={() => setKind("canon")}
            >
              Tema (canon)
            </button>
            <button
              type="button"
              className={cn(
                "h-11 rounded-full px-3 text-sm",
                kind === "library" ? "bg-surface-2 text-fg" : "text-muted",
              )}
              onClick={() => setKind("library")}
            >
              Biblioteca
            </button>
            <AttachButton
              domainId={domain.id}
              kind={kind}
              label={kind === "canon" ? "Adjuntar tema" : "Adjuntar a biblioteca"}
              onDone={() => setTick((n) => n + 1)}
            />
          </div>
          <p className="mt-3 text-xs text-subtle">
            Arrastrá archivos acá o adjuntá. Varios a la vez. PDF, .docx, .md, .txt.
          </p>
          <Input
            className="mt-3"
            placeholder="Título del tema"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            className="mt-3 min-h-28 text-sm"
            placeholder="O pegá el texto del tema"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button className="mt-3" onClick={save}>
            Guardar tema
          </Button>
        </section>

        <section>
          <p className="mb-2 text-xs font-medium tracking-widest text-muted uppercase">
            Temas en {domain.name}
            <span className="ml-2 tabular-nums text-subtle">{topics.length}</span>
          </p>
          {topics.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay temas. Adjuntá el material de la charla.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {topics.map((d) => (
                <DocRow
                  key={`${d.id}-${tick}`}
                  title={d.title}
                  kindLabel="tema"
                  snippet={d.body}
                  onRemove={() => removeDoc(d.id)}
                  action={
                    <button
                      type="button"
                      className="h-11 px-2 text-xs text-subtle hover:text-fg"
                      onClick={() => {
                        demoteDoc(d.id);
                        toast("Demote. Queda fuera del contexto.");
                      }}
                    >
                      Demote
                    </button>
                  }
                />
              ))}
            </ul>
          )}
        </section>

        {library.length ? (
          <section>
            <p className="mb-2 text-xs font-medium tracking-widest text-muted uppercase">
              Biblioteca
            </p>
            <ul className="flex flex-col gap-2">
              {library.map((d) => {
                const pin = handPins.find((p) => p.docId === d.id && p.domainId === domain.id);
                const left = pin ? HAND_WINDOW - (domain.turnCount - pin.pinnedAtTurn) : 0;
                const live = Boolean(pin && left > 0);
                return (
                  <DocRow
                    key={d.id}
                    title={d.title}
                    kindLabel="biblioteca"
                    snippet={d.body}
                    extra={live ? `A mano · quedan ${left} turnos` : undefined}
                    onRemove={() => removeDoc(d.id)}
                    action={
                      <div className="flex">
                        <button
                          type="button"
                          className="h-11 px-2 text-xs text-subtle hover:text-fg"
                          onClick={() => {
                            promoteDoc(d.id);
                            toast("Promote a canon.");
                          }}
                        >
                          Promote
                        </button>
                        <button
                          type="button"
                          className={cn("size-11", live ? "text-accent" : "text-subtle hover:text-fg")}
                          aria-label={live ? "Sacar de la mano" : "Poner a mano"}
                          onClick={() => (live ? unpinFromHand(d.id) : pinToHand(d.id))}
                        >
                          <Hand className="mx-auto size-4" />
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </ul>
          </section>
        ) : null}

        {retired.length ? (
          <section>
            <p className="mb-2 text-xs font-medium tracking-widest text-muted uppercase">
              Deprecados
            </p>
            <ul className="flex flex-col gap-2">
              {retired.map((d) => (
                <DocRow
                  key={d.id}
                  title={d.title}
                  kindLabel="deprecado"
                  snippet={d.body}
                  extra="Fuera del contexto. Se conserva."
                  onRemove={() => removeDoc(d.id)}
                  action={
                    <button
                      type="button"
                      className="h-11 px-2 text-xs text-subtle hover:text-fg"
                      onClick={() => {
                        promoteDoc(d.id);
                        toast("Restaurado a canon.");
                      }}
                    >
                      Restaurar
                    </button>
                  }
                />
              ))}
            </ul>
          </section>
        ) : null}

        {frame ? (
          <p className="text-xs text-subtle">Marco del sistema presente. No es un tema de la charla.</p>
        ) : null}
      </div>
    </DropCanvas>
  );
}

function DocRow({
  title,
  kindLabel,
  snippet,
  extra,
  onRemove,
  action,
}: {
  title: string;
  kindLabel: string;
  snippet: string;
  extra?: string;
  onRemove: () => void;
  action?: ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <div className="min-w-0">
        <p className="text-xs text-subtle uppercase">{kindLabel}</p>
        <p className="text-sm text-fg">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{snippet}</p>
        {extra ? <p className="mt-1 text-xs text-accent">{extra}</p> : null}
      </div>
      <div className="flex shrink-0">
        {action}
        <button
          type="button"
          className="size-11 text-subtle hover:text-fg"
          aria-label="Borrar"
          onClick={onRemove}
        >
          <Trash2 className="mx-auto size-4" />
        </button>
      </div>
    </li>
  );
}
