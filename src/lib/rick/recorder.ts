import { useCallback, useRef, useState } from "react";
import { uid } from "@/lib/utils";
import { saveRecording } from "@/lib/rick/idb";

function pickMime() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function useRecorder(domainId: string) {
  const [recording, setRecording] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
  );
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(async () => {
    const rec = recRef.current;
    if (!rec) return null;
    const durationMs = Date.now() - startedRef.current;
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      };
      rec.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    setRecording(false);
    const item = {
      id: uid(),
      title: `Grabación ${new Date().toLocaleString("es-AR")}`,
      domainId,
      createdAt: Date.now(),
      durationMs,
      mimeType: blob.type,
      blob,
    };
    await saveRecording(item);
    return item;
  }, [domainId]);

  const start = useCallback(async () => {
    if (recording) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mimeType = pickMime();
    const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (ev) => {
      if (ev.data.size) chunksRef.current.push(ev.data);
    };
    rec.start(250);
    recRef.current = rec;
    startedRef.current = Date.now();
    setRecording(true);
  }, [recording]);

  const toggle = useCallback(async () => {
    if (recording) return stop();
    await start();
    return null;
  }, [recording, start, stop]);

  return { supported, recording, start, stop, toggle };
}
