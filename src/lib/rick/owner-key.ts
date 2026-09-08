import { isKeyShape, ownerKeyHeaders, presetById, readMotor, writeMotor } from "@/lib/rick/motor";

export { isKeyShape as isOwnerKeyShape, ownerKeyHeaders };

export function readOwnerKey(): string {
  return readMotor()?.key ?? "";
}

export function writeOwnerKey(value: string): boolean {
  const xai = presetById("xai")!;
  return writeMotor({ id: "xai", key: value, model: xai.model, base: xai.base });
}

export function clearOwnerKey() {
  try {
    localStorage.removeItem("rick-motor-v1");
    localStorage.removeItem("rick-xai-owner-key");
  } catch {
    /* ignore */
  }
}
