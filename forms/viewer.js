import * as pdfjsLib from "./pdfjs/pdf.min.mjs";
globalThis.pdfjsLib = pdfjsLib;
const { EventBus, PDFViewer, PDFLinkService, PDFScriptingManager } = await import("./pdfjs/web/pdf_viewer.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./pdfjs/pdf.worker.min.mjs", import.meta.url).href;
const FORMS = { cda: ["cda.pdf", "Commission_Disbursement_Authorization"], invoice: ["invoice.pdf", "General_Invoice"] };
const key = document.body.dataset.form || new URLSearchParams(location.search).get("f") || "cda";
const [file, outName] = FORMS[key] || FORMS.cda;
const container = document.getElementById("viewerContainer");
const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });
const scriptingManager = new PDFScriptingManager({ eventBus, sandboxBundleSrc: new URL("./pdfjs/pdf.sandbox.min.mjs", import.meta.url).href });
const viewer = new PDFViewer({ container, eventBus, linkService, scriptingManager,
  annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS, enableScripting: true });
linkService.setViewer(viewer); scriptingManager.setViewer(viewer);
eventBus.on("pagesinit", () => { viewer.currentScaleValue = "page-width"; });
let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => viewer.currentScaleValue = "page-width", 150); });
const pdf = await pdfjsLib.getDocument({ url: new URL(file, location.href).href, standardFontDataUrl: new URL("./pdfjs/standard_fonts/", import.meta.url).href, enableXfa: false }).promise;
viewer.setDocument(pdf); linkService.setDocument(pdf, null);
window.__pdf = pdf; window.__viewer = viewer;
document.getElementById("rawLink").href = file;
async function blob() { document.activeElement?.blur?.(); await new Promise(r => setTimeout(r, 300));
  return new Blob([await pdf.saveDocument()], { type: "application/pdf" }); }
document.getElementById("dl").onclick = async () => {
  const u = URL.createObjectURL(await blob()); const a = document.createElement("a");
  a.href = u; a.download = `${outName}_filled.pdf`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000); };
document.getElementById("pr").onclick = async () => {
  const u = URL.createObjectURL(await blob()); const w = window.open(u, "_blank");
  if (!w) location.href = u; };
