import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bankScore, runBank } from "@/lib/rick/bank";
import { rates } from "@/lib/rick/govern";
import { STATUS_LABEL, type Assembled, type EpistemicStatus } from "@/lib/rick/types";
import { useActiveDomain, useRick } from "@/lib/rick/store";
import { cn } from "@/lib/utils";

function Badge({ status }: { status: EpistemicStatus }) {
  const danger = status === "abstencion";
  const canon = status === "canon";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.65rem] tracking-wide uppercase",
        danger ? "bg-rec/20 text-rec" : canon ? "bg-accent/20 text-accent" : "bg-surface-2 text-muted",
      )}
    >
      {status}
    </span>
  );
}

function PackageView({ assembled }: { assembled: Assembled }) {
  const [raw, setRaw] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="tabular-nums">{assembled.bytes} bytes</span>
        <span>·</span>
        <span>{assembled.domainName}</span>
        <span>·</span>
        <span>{new Date(assembled.at).toLocaleString("es-AR")}</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            void navigator.clipboard.writeText(assembled.system);
            toast.success("Paquete copiado.");
          }}
        >
          Copiar paquete
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRaw((v) => !v)}>
          {raw ? "Secciones" : "Paquete crudo"}
        </Button>
      </div>
      {raw ? (
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md bg-surface p-4 font-mono text-xs leading-relaxed text-fg shadow-[var(--shadow-border)]">
          {assembled.system}
        </pre>
      ) : (
        assembled.sections.map((s) => (
          <section key={`${assembled.id}-${s.name}`} className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium tracking-widest text-accent uppercase">{s.name}</p>
              <Badge status={s.status} />
              <span className="ml-auto text-xs text-subtle tabular-nums">{s.bytes} b</span>
            </div>
            <p className="mt-1 text-xs text-muted">{STATUS_LABEL[s.status]}</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-fg">{s.body}</pre>
          </section>
        ))
      )}
    </div>
  );
}

export function InspectPanel() {
  const last = useRick((s) => s.lastAssembled);
  const history = useRick((s) => s.assemblyHistory);
  const checks = useRick((s) => s.checks);
  const backups = useRick((s) => s.backups);
  const restoreBackup = useRick((s) => s.restoreBackup);
  const domain = useActiveDomain();
  const diagPrev = useRick((s) => s.diagPrev);
  const traces = useRick((s) => s.traces);
  const driftBlocked = useRick((s) => s.driftBlocked);
  const driftReason = useRick((s) => s.driftReason);
  const persistOk = useRick((s) => s.persistOk);
  const persistError = useRick((s) => s.persistError);
  const stats = rates(checks);
  const [tab, setTab] = useState<
    "paquete" | "historial" | "chequeos" | "respaldos" | "gobierno" | "banco" | "traza"
  >("paquete");
  const bank = useMemo(() => runBank(), []);
  const score = bankScore(bank);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => history.find((h) => h.id === selectedId) ?? last ?? history[0] ?? null,
    [history, selectedId, last],
  );

  const domainHistory = history.filter((h) => h.domainId === domain.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h2 className="font-display text-3xl tracking-tight">Inspeccionar</h2>
        <p className="mt-1 text-sm text-muted">
          El paquete entero, con estatus epistémico. El registro anota aciertos, no solo fallos.
        </p>
        <p className="mt-2 text-xs text-muted">
          {persistOk ? "Persistencia confirmada." : persistError || "Persistencia no confirmada."}
          {driftBlocked ? ` · deriva bloqueada${driftReason ? ` (${driftReason})` : ""}` : ""}
        </p>
      </header>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(
          [
            ["paquete", "Paquete"],
            ["historial", "Historial"],
            ["chequeos", "Chequeos"],
            ["gobierno", "CONTEXTO 2"],
            ["banco", "Banco"],
            ["traza", "Traza"],
            ["respaldos", "Respaldos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "h-11 shrink-0 rounded-full px-3 text-sm",
              tab === id ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "paquete" ? (
        selected ? (
          <PackageView assembled={selected} />
        ) : (
          <p className="text-sm text-muted">Todavía no hubo un turno. Mandá un mensaje en la mesa.</p>
        )
      ) : null}

      {tab === "historial" ? (
        domainHistory.length === 0 ? (
          <p className="text-sm text-muted">Sin ensamblados en {domain.name}.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {domainHistory.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(h.id);
                    setTab("paquete");
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-md bg-surface px-4 py-3 text-left shadow-[var(--shadow-border)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{h.userTurn || "(sin turno)"}</p>
                    <p className="mt-1 text-xs text-muted">
                      {h.sections.length} bloques · {h.bytes} bytes ·{" "}
                      {new Date(h.at).toLocaleString("es-AR")}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "chequeos" ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.kind} className="rounded-md bg-surface px-3 py-3 shadow-[var(--shadow-border)]">
                <p className="text-xs text-muted uppercase">{s.kind}</p>
                <p className="mt-1 font-display text-xl tabular-nums text-fg">{s.total}</p>
                <p className="text-xs text-subtle">
                  {s.alerts} alertas · {s.abstentions} abst.
                </p>
              </div>
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {checks.slice(0, 40).map((c) => (
              <li key={c.id} className="rounded-md bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                <p className="text-xs uppercase text-muted">
                  {c.kind}
                  {c.abstain ? " · abstención" : c.alert ? " · alerta" : " · limpio"}
                </p>
                <p className="mt-1 text-sm text-fg">{c.detail}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {tab === "gobierno" ? (
        diagPrev ? (
          <pre className="whitespace-pre-wrap rounded-md bg-surface p-4 font-mono text-xs leading-relaxed text-fg shadow-[var(--shadow-border)]">
            {diagPrev}
          </pre>
        ) : (
          <p className="text-sm text-muted">Todavía no hay diagnóstico interno. Mandá un turno.</p>
        )
      ) : null}

      {tab === "banco" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {score.pass}/{score.total} verdes. El banco compara decisiones de gobierno, no texto del
            modelo.
          </p>
          <ul className="flex flex-col gap-2">
            {bank.map((s) => (
              <li key={s.id} className="rounded-md bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                <p className="text-xs uppercase text-muted">
                  {s.id}
                  {s.pass ? " · ok" : " · falla"}
                </p>
                <p className="mt-1 text-sm text-fg">{s.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "traza" ? (
        traces.length === 0 ? (
          <p className="text-sm text-muted">Sin mutaciones. Ingest, promote, demote y /olvidar quedan acá.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {traces.slice(0, 60).map((t) => (
              <li key={t.id} className="rounded-md bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                <p className="text-xs uppercase text-muted">
                  {t.kind} · {new Date(t.at).toLocaleString("es-AR")}
                </p>
                <p className="mt-1 text-sm text-fg">{t.detail}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "respaldos" ? (
        backups.length === 0 ? (
          <p className="text-sm text-muted">
            No hay respaldos. /olvidar pide confirmación y guarda uno antes de borrar el hilo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {backups.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-md bg-surface px-4 py-3 shadow-[var(--shadow-border)]"
              >
                <div>
                  <p className="text-sm text-fg">{b.domainName}</p>
                  <p className="mt-1 text-xs text-muted">
                    {b.messages.length} turnos · {new Date(b.at).toLocaleString("es-AR")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="mute"
                  onClick={() => {
                    if (restoreBackup(b.id)) toast.success("Hilo restaurado.");
                  }}
                >
                  Restaurar
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
