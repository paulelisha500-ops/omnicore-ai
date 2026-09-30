/* ============================================================================
   Document reading, entirely in the browser.
   PDF (pdf.js), Word .docx (mammoth), plain text / Markdown / CSV / JSON /
   HTML, and images. Heavy parsers are imported on demand so they never weigh
   on the first page load.
   ============================================================================ */

export const ACCEPT = ".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.rtf,image/*";
export const MAX_FILE_MB = 40;

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|xml|log|rtf)$/i;

export function kindOf(file) {
  const name = file.name || "";
  if (file.type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (/\.docx$/i.test(name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (/\.html?$/i.test(name) || file.type === "text/html") return "html";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("text/") || TEXT_EXT.test(name) || file.type === "application/json") return "text";
  return "unknown";
}

async function readPdf(file, onProgress) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "", out = [];
    let lastY = null;
    for (const item of content.items) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) { out.push(line); line = ""; }
      line += item.str + (item.hasEOL ? "\n" : "");
      lastY = y;
    }
    out.push(line);
    pages.push(out.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
    onProgress?.(i / doc.numPages);
  }
  const text = pages.join("\n\n").trim();
  // Scanned PDFs have no text layer: render the first pages so the vision
  // model can read them instead.
  let images = [];
  if (text.replace(/\s/g, "").length < 40) {
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      images.push(await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9)));
    }
  }
  return { text, pages: doc.numPages, images };
}

async function readDocx(file) {
  const mammoth = await import("mammoth");
  const { value } = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return { text: String(value || "").replace(/\n{3,}/g, "\n\n").trim() };
}

function htmlToText(html) {
  const d = new DOMParser().parseFromString(html, "text/html");
  d.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  return (d.body?.innerText || d.body?.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Read any supported file into { kind, text, images, pages }.
 * `images` is set for image files and scanned PDFs (for the vision model).
 */
export async function readFile(file, onProgress) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    const e = new Error(`That file is over ${MAX_FILE_MB} MB. Try a smaller file.`);
    e.ar = `حجم الملف يتجاوز ${MAX_FILE_MB} ميغابايت. جرّب ملفًا أصغر.`;
    throw e;
  }
  const kind = kindOf(file);
  if (kind === "pdf") return { kind, ...(await readPdf(file, onProgress)) };
  if (kind === "docx") return { kind, ...(await readDocx(file)), images: [] };
  if (kind === "html") return { kind, text: htmlToText(await file.text()), images: [] };
  if (kind === "text") return { kind, text: (await file.text()).trim(), images: [] };
  if (kind === "image") return { kind, text: "", images: [await downscale(file, 1600)] };
  const e = new Error("That file type isn't supported. Use PDF, Word (.docx), text, Markdown, CSV, HTML or an image.");
  e.ar = "نوع الملف غير مدعوم. استخدم PDF أو Word (.docx) أو نصًا أو Markdown أو CSV أو HTML أو صورة.";
  throw e;
}

/** Downscale an image Blob so it's quick to preview and to hand to the model. */
export async function downscale(blob, maxSide = 1600) {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && blob.size < 2.5e6) { bmp.close?.(); return blob; }
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h });
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    return canvas.convertToBlob
      ? await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 })
      : await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  } catch {
    return blob; // unsupported format for bitmap decode — let the model's decoder try
  }
}

/** Split long text into ~`size`-char chunks on paragraph boundaries. */
export function chunkText(text, size = 5000) {
  const paras = String(text).split(/\n{2,}/);
  const chunks = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > size && cur) { chunks.push(cur); cur = ""; }
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size) chunks.push(p.slice(i, i + size));
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

export const wordCount = (s) => (String(s).match(/[\p{L}\p{N}]+/gu) || []).length;
