export const ABSENCE_PHRASE = "no lo tengo en el canon de este eje";

const GENERATIVE = new Set([
  "genera",
  "genera",
  "generemos",
  "generar",
  "expandi",
  "expandi",
  "expandamos",
  "expandir",
  "imagina",
  "imagina",
  "imaginemos",
  "imaginar",
  "propone",
  "propone",
  "propongamos",
  "proponer",
  "inventa",
  "inventa",
  "inventar",
  "crea",
  "crea",
  "creemos",
  "crear",
  "planea",
  "planea",
  "planeemos",
  "planear",
]);

export function isGenerative(input: string): boolean {
  const words = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .match(/[a-z0-9]+/gi);
  if (!words) return false;
  return words.some((w) => GENERATIVE.has(w));
}

export function isHomeAxis(domainId: string) {
  return domainId === "mesa";
}
