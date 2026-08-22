import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { filesFromDataTransfer, ingestFiles, ingestIdentity } from "@/lib/rick/ingest";
import { cn } from "@/lib/utils";

async function runIngest(
  files: File[],
  domainId: string,
  kind: "canon" | "library" | "identity",
  onDone?: (ok: number) => void,
) {
  if (!files.length) return;
  const result =
    kind === "identity"
      ? await ingestIdentity(files)
      : await ingestFiles(files, { domainId, kind });
  if (result.ok) {
    const where =
      kind === "identity" ? "personalidad" : kind === "canon" ? "canon (temas)" : "biblioteca";
    toast.success(
      result.ok === 1 ? `Quedó en ${where}.` : `${result.ok} archivos en ${where}.`,
    );
    onDone?.(result.ok);
  }
  if (result.truncated) toast("Recorté algún archivo a 20 mil caracteres.");
  for (const row of result.fail) toast.error(row);
}

export function AttachButton({
  domainId,
  kind = "canon",
  label = "Adjuntar",
  iconOnly = false,
  onDone,
}: {
  domainId: string;
  kind?: "canon" | "library" | "identity";
  label?: string;
  iconOnly?: boolean;
  onDone?: (ok: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      await runIngest(files, domainId, kind, onDone);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className={cn("inline-flex", busy && "pointer-events-none opacity-60")}>
      {iconOnly ? (
        <span className="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm hover:bg-surface-2">
          <Paperclip className="size-4" />
          <span className="sr-only">{label}</span>
        </span>
      ) : (
        <Button type="button" variant="mute" asChild>
          <span>
            <Paperclip className="size-4" />
            {busy ? "Leyendo…" : label}
          </span>
        </Button>
      )}
      <input
        ref={ref}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => void onChange(e)}
      />
    </label>
  );
}

export function DropCanvas({
  domainId,
  kind = "canon",
  className,
  children,
  onDone,
}: {
  domainId: string;
  kind?: "canon" | "library";
  className?: string;
  children: ReactNode;
  onDone?: (ok: number) => void;
}) {
  const [over, setOver] = useState(false);

  function onDragOver(e: DragEvent) {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    setOver(true);
  }

  function onDragLeave(e: DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setOver(false);
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const files = filesFromDataTransfer(e.dataTransfer);
    await runIngest(files, domainId, kind, onDone);
  }

  return (
    <div
      className={cn("relative min-h-0", className)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      {children}
      {over ? (
        <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-xl bg-accent/15 shadow-[var(--shadow-border-hover)]">
          <p className="text-sm text-fg">Soltá. Entra como tema canónico.</p>
        </div>
      ) : null}
    </div>
  );
}
