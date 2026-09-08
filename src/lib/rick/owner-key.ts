const STORAGE = "rick-xai-owner-key";
const KEY_RE = /^xai-[A-Za-z0-9_-]{20,200}$/;

export function isOwnerKeyShape(value: string): boolean {
  return KEY_RE.test(value.trim());
}

export function readOwnerKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(STORAGE)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeOwnerKey(value: string): boolean {
  const key = value.trim();
  if (!isOwnerKeyShape(key)) return false;
  localStorage.setItem(STORAGE, key);
  return true;
}

export function clearOwnerKey() {
  try {
    localStorage.removeItem(STORAGE);
  } catch {
    /* ignore */
  }
}

export function ownerKeyHeaders(): HeadersInit {
  const key = readOwnerKey();
  return key ? { "X-Rick-Key": key } : {};
}
