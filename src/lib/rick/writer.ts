let writer = true;

export function isWriter() {
  return writer;
}

export function claimWriter(onChange: (ok: boolean) => void) {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    writer = true;
    onChange(true);
    return;
  }
  void navigator.locks.request("rick-app-v3-writer", { ifAvailable: true }, (lock) => {
    writer = Boolean(lock);
    onChange(writer);
    if (!lock) return undefined;
    return new Promise<void>((resolve) => {
      window.addEventListener("pagehide", () => resolve(), { once: true });
    });
  });
}
