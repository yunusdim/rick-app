export function parseDomainName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) {
    return { ok: false, error: "El nombre va de 1 a 40 caracteres." };
  }
  if (/[⟦⟧\[\]]/.test(name) || /CANON|IDENTIDAD|RECORRIDO|SESION|BIBLIOTECA/i.test(name)) {
    return { ok: false, error: "El nombre no puede parecer un marcador del entorno." };
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) {
    return { ok: false, error: "Solo letras, números, espacio, punto o guión." };
  }
  return { ok: true, name };
}
