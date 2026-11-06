import * as pdfjsLib from "./pdfjs/pdf.min.mjs";

const { EventBus, PDFViewer, PDFLinkService } = await import("./pdfjs/web/pdf_viewer.mjs");
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./pdfjs/pdf.worker.min.mjs", import.meta.url).href;

const container = document.getElementById("viewerContainer");
const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });
// ENABLE draws the signed appearance. ENABLE_FORMS would turn the AcroForm into inputs.
const viewer = new PDFViewer({
  container,
  eventBus,
  linkService,
  annotationMode: pdfjsLib.AnnotationMode.ENABLE
});
linkService.setViewer(viewer);
eventBus.on("pagesinit", () => { viewer.currentScaleValue = "page-width"; });
eventBus.on("annotationlayerrendered", () => {
  document.querySelectorAll("#viewer input, #viewer textarea, #viewer select, #viewer button, #viewer [contenteditable]").forEach((el) => {
    el.disabled = true;
    if ("readOnly" in el) el.readOnly = true;
    if (el.isContentEditable) el.contentEditable = "false";
    el.tabIndex = -1;
  });
});
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { viewer.currentScaleValue = "page-width"; }, 150);
});

try {
  const pdf = await pdfjsLib.getDocument({
    url: new URL("w9.pdf", location.href).href,
    standardFontDataUrl: new URL("./pdfjs/standard_fonts/", import.meta.url).href,
    enableXfa: false
  }).promise;
  viewer.setDocument(pdf);
  linkService.setDocument(pdf, null);
} catch (err) {
  const stage = document.querySelector(".stage");
  if (stage) stage.innerHTML = '<p class="doc-error">The W-9 could not be displayed. <a href="w9.pdf">Open the PDF</a>.</p>';
}
