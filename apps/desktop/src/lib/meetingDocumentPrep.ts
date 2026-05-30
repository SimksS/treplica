import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MAX_PDF_PAGES = 6;
const RENDER_SCALE = 1.25;
const JPEG_QUALITY = 0.82;

export type MeetingAttachmentKind = "text" | "image" | "pdf";

export interface PreparedMeetingAttachment {
  kind: MeetingAttachmentKind;
  sourceLabel: string;
  /** Optional extracted text (PDF supplement or plain text files). */
  supplementalText: string;
  /** JPEG data URLs sent to the vision model on guidance requests. */
  pageDataUrls: string[];
}

function isImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) =>
    lower.endsWith(ext),
  );
}

function isPdfName(name: string): boolean {
  return name.toLowerCase().endsWith(".pdf");
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Falha ao ler arquivo."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

async function renderPdfPages(file: File): Promise<string[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const urls: string[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível.");
    await page.render({ canvasContext: ctx, viewport }).promise;
    urls.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
  }

  return urls;
}

export async function prepareMeetingAttachment(
  file: File,
): Promise<PreparedMeetingAttachment> {
  const sourceLabel = file.name;

  if (isImageName(file.name)) {
    return {
      kind: "image",
      sourceLabel,
      supplementalText: "",
      pageDataUrls: [await fileToDataUrl(file)],
    };
  }

  if (isPdfName(file.name)) {
    const pageDataUrls = await renderPdfPages(file);
    if (pageDataUrls.length === 0) {
      throw new Error("Não foi possível renderizar páginas do PDF.");
    }
    return {
      kind: "pdf",
      sourceLabel,
      supplementalText: "",
      pageDataUrls,
    };
  }

  const text = await file.text();
  return {
    kind: "text",
    sourceLabel,
    supplementalText: text.trim(),
    pageDataUrls: [],
  };
}
