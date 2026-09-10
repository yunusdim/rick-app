export function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}
