import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttachButton } from "@/components/rick/attach";
import { MOTOR_PRESETS, isKeyShape, motorCapLabel, readMotor, writeMotor } from "@/lib/rick/motor";
import { useRick } from "@/lib/rick/store";

export function Modal({
  open,
  title,
  body,
  children,
  onClose,
  dismissible = true,
}: {
  open: boolean;
  title: string;
  body?: string;
  children: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/75 p-4 sm:items-center"
      role="presentation"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rick-modal-title"
        className="w-full max-w-md rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rick-modal-title" className="font-display text-2xl tracking-tight">
          {title}
        </h2>
        {body ? <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function ForgetDialog({
  open,
  domainName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  domainName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Olvidar este hilo"
      body={`Se borra la charla de ${domainName}. Canon, identidad, recorrido y los otros dominios no se tocan. Antes se guarda un respaldo para restaurar.`}
      onClose={onCancel}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="mute" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="solid" onClick={onConfirm}>
          Olvidar y respaldar
        </Button>
      </div>
    </Modal>
  );
}

export function SpendDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Esto gasta cuota"
      body="La llamada usa la cuota del operador. Visitantes anónimos no deberían dispararla. Confirmá para armar el gasto en esta sesión."
      onClose={onCancel}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="mute" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onConfirm}>Armar gasto</Button>
      </div>
    </Modal>
  );
}

export function LockDialog({
  open,
  enabled,
  hasPin,
  onClose,
  onSetPin,
  onUnlock,
  onDisable,
}: {
  open: boolean;
  enabled: boolean;
  hasPin: boolean;
  onClose: () => void;
  onSetPin: (pin: string) => Promise<void>;
  onUnlock: (pin: string) => Promise<boolean>;
  onDisable: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pin.trim().length < 4) {
      setError("Mínimo 4 caracteres.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (enabled && hasPin) {
        const ok = await onUnlock(pin.trim());
        if (!ok) setError("Clave incorrecta.");
        else setPin("");
      } else {
        await onSetPin(pin.trim());
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Candado de gasto"
      body="Opcional, para un dispositivo compartido. Si publicás la app, el link es público: cualquiera que lo abra puede hablar y gasta TU cuota. El candado frena esta pantalla; no convierte el link en privado. Si no publicás y no compartís, nadie más entra."
      onClose={onClose}
    >
      <p className="mb-3 text-xs text-subtle">
        Estado: {enabled ? "cerrado — pide clave" : "abierto — la entidad puede gastar"}
      </p>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <Input
          type="password"
          autoComplete="off"
          placeholder={hasPin && enabled ? "Clave para desbloquear" : "Nueva clave (4+)"}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {enabled && hasPin ? "Desbloquear sesión" : "Activar candado"}
          </Button>
          {enabled ? (
            <Button type="button" variant="mute" onClick={onDisable}>
              Quitar candado
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DomainDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => { ok: true } | { ok: false; error: string };
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const result = onCreate(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    setError("");
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Nuevo dominio"
      body="La sesión queda aislada. El nombre no puede parecer un marcador del entorno."
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="mute" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Crear</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ApiKeyDialog({
  open,
  onSaved,
  onCancel,
}: {
  open: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const saved = typeof window === "undefined" ? null : readMotor();
  const [engine, setEngine] = useState(saved?.id ?? "xai");
  const [model, setModel] = useState(saved?.model ?? MOTOR_PRESETS[0].model);
  const [base, setBase] = useState(saved?.base ?? "");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const s = readMotor();
    if (!s) return;
    setEngine(s.id);
    setModel(s.model);
    setBase(s.base);
  }, [open]);

  function pick(id: string) {
    const p = MOTOR_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setEngine(id);
    if (id !== "custom") {
      setModel(p.model);
      setBase(p.base);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const key = value.trim() || readMotor()?.key || "";
    if (!isKeyShape(key)) {
      setError("Pegá la API key del motor. Mínimo 16 caracteres, sin espacios.");
      return;
    }
    const chosen = MOTOR_PRESETS.find((p) => p.id === engine) ?? MOTOR_PRESETS[0];
    const finalBase = engine === "custom" ? base.trim() : chosen.base;
    const finalModel = model.trim();
    if (!finalModel) {
      setError("Hace falta el nombre del modelo.");
      return;
    }
    if (engine === "custom" && !/^https:\/\//.test(finalBase)) {
      setError("Custom pide una URL https del endpoint /v1.");
      return;
    }
    if (!writeMotor({ id: engine, key, model: finalModel, base: finalBase })) {
      setError("No pude guardarla en este navegador.");
      return;
    }
    setValue("");
    setError("");
    onSaved();
  }

  return (
    <Modal
      open={open}
      title="Motor"
      body="Si el motor es como Grok, tiene chat y voz. Si no, solo lo que ese motor trae. La clave queda en este navegador."
      onClose={onCancel ?? (() => undefined)}
      dismissible={Boolean(onCancel)}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {MOTOR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              className={
                engine === p.id
                  ? "h-9 rounded-full bg-surface-2 px-3 text-xs text-fg"
                  : "h-9 rounded-full px-3 text-xs text-muted"
              }
            >
              {p.name}
              <span className="ml-1 text-[10px] text-subtle">{motorCapLabel(p.id)}</span>
            </button>
          ))}
        </div>
        {engine === "custom" ? (
          <Input
            placeholder="https://host/v1"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
          />
        ) : null}
        <Input
          placeholder="modelo"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <Input
          type="password"
          autoComplete="off"
          autoFocus
          placeholder={saved?.key ? "clave guardada · pegá otra para cambiar" : "API key"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="mute" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit">Seguir</Button>
        </div>
      </form>
    </Modal>
  );
}

export function IdentityDialog({ open }: { open: boolean }) {
  const setIdentity = useRick((s) => s.setIdentity);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (text.length < 8) {
      setError("Pegá o adjuntá quién es. Mínimo unas líneas.");
      return;
    }
    setIdentity(text);
    setDraft("");
    setError("");
  }

  return (
    <Modal
      open={open}
      title="¿Quién sos?"
      body="Ahora la personalidad. No es un tema de la mesa: es identidad, y va con Rick a todos los ejes."
      onClose={() => undefined}
      dismissible={false}
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Textarea
          rows={7}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pegá el texto de la personalidad."
          autoFocus
          className="min-h-32 rounded-md bg-surface-2 px-3 py-2 text-sm"
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <AttachButton domainId="mesa" kind="identity" label="Adjuntar archivo" />
          <Button type="submit">Entrar</Button>
        </div>
      </form>
    </Modal>
  );
}
