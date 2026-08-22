import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecording, type RecordingMeta } from "@/lib/rick/idb";

export function AudioRow({
  rec,
  onRemove,
}: {
  rec: RecordingMeta;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    void getRecording(rec.id).then((full) => {
      if (revoked || !full) return;
      objectUrl = URL.createObjectURL(full.blob);
      setUrl(objectUrl);
    });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rec.id]);

  function download() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.title.replace(/\s+/g, "-")}.webm`;
    a.click();
  }

  return (
    <li className="rounded-md bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-sm text-fg">{rec.title}</p>
      <p className="mt-1 text-xs text-muted tabular-nums">
        {Math.round(rec.durationMs / 1000)}s · {new Date(rec.createdAt).toLocaleString("es-AR")}
      </p>
      {url ? <audio className="mt-3 w-full" controls src={url} /> : null}
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="ghost" onClick={download} disabled={!url}>
          <Download className="size-4" />
          Bajar
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="size-4" />
          Borrar
        </Button>
      </div>
    </li>
  );
}
