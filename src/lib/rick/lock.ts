const UNLOCK_KEY = "rick-unlocked-v1";
const ARMED_KEY = "rick-spend-armed-v1";

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isSessionUnlocked() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}

export function setSessionUnlocked(value: boolean) {
  if (typeof sessionStorage === "undefined") return;
  if (value) sessionStorage.setItem(UNLOCK_KEY, "1");
  else sessionStorage.removeItem(UNLOCK_KEY);
}

export function isSpendArmed() {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(ARMED_KEY) === "1";
}

export function armSpend() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(ARMED_KEY, "1");
}
