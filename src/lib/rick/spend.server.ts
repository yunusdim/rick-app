const hits = new Map<string, number[]>();

function prune(key: string, windowMs: number, now: number) {
  const next = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, next);
  return next;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") || "local";
}

export function allowSpend(ip: string, kind: "chat" | "speak") {
  const max = kind === "chat" ? 16 : 8;
  const windowMs = 10 * 60 * 1000;
  const now = Date.now();
  const key = `${kind}:${ip}`;
  const arr = prune(key, windowMs, now);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(key, arr);
  return true;
}
