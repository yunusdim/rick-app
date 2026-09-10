const MAX_CHARS = 20000;
const MAX_BYTES = 12 * 1024 * 1024;

function titleFromName(name: string) {
  const trimmed = name.replace(/\.[^.]+$/, "").trim();
  return trimmed || name;
}

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/"/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function stripRtf(rtf: string) {
  return rtf
    .replace(/\\'[0-9a-fA-F]{2}/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = doc.numPages;
  if (pages > 40) throw new Error("El PDF tiene más de 40 páginas. No se recortó.");
  const parts: string[] = [];
  for (let i = 1; i <= pages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) parts.push(line);
  }
  const body = parts.join("\n\n").trim();
  if (!body) throw new Error("El PDF no tiene texto extraíble (puede ser imagen).");
  return body;
}

async function extractDocx(file: File) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const body = result.value.replace(/\n{3,}/g, "\n\n").trim();
  if (!body) throw new Error("El Word está vacío.");
  return body;
}

export type ExtractedDoc = {
  title: string;
  body: string;
  truncated: boolean;
};

export async function extractFromFile(file: File): Promise<ExtractedDoc> {
  if (file.size > MAX_BYTES) throw new Error("Hasta 12 MB por archivo.");
  const ext = extOf(file.name);
  const type = file.type || "";
  let raw = "";

  const isPdf = ext === "pdf" || type === "application/pdf";
  const isDocx =
    ext === "docx" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isHtml = ext === "html" || ext === "htm" || type === "text/html";
  const isRtf = ext === "rtf" || type === "application/rtf" || type === "text/rtf";
  const isText =
    type.startsWith("text/") ||
    type === "application/json" ||
    ["txt", "md", "markdown", "csv", "json", "log", "text"].includes(ext);

  if (isPdf) raw = await extractPdf(file);
  else if (isDocx) raw = await extractDocx(file);
  else if (isHtml) raw = stripHtml(await file.text());
  else if (isRtf) raw = stripRtf(await file.text());
  else if (isText || ext === "") {
    raw = (await file.text()).trim();
    if (!raw || raw.includes("\u0000")) {
      throw new Error("Usá texto, Markdown, PDF o Word (.docx).");
    }
  } else {
    throw new Error("Usá texto, Markdown, PDF o Word (.docx).");
  }

  if (!raw.trim()) throw new Error("El archivo está vacío.");
  if (raw.length > MAX_CHARS) {
    throw new Error(`El documento no cabe entero (${raw.length} > ${MAX_CHARS}). No se recortó.`);
  }
  return {
    title: titleFromName(file.name),
    body: raw,
    truncated: false,
  };
}
