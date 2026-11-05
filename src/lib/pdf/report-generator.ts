import { jsPDF } from "jspdf";
import type { EvidenceWithBlob, InspectionBundle } from "@/types/inspection";
import { isReviewCurrent } from "@/lib/review";

const PAGE_WIDTH = 210;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function imageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not decode evidence image.")); };
    image.src = url;
  });
}

async function evidenceImage(evidence: EvidenceWithBlob): Promise<string> {
  const image = await imageFromBlob(evidence.blob);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF image rendering is unavailable.");
  context.drawImage(image, 0, 0);
  for (const item of evidence.segmentations ?? []) {
    if (item.maskWidth * item.maskHeight > 4_000_000) continue;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = item.maskWidth;
    maskCanvas.height = item.maskHeight;
    const maskContext = maskCanvas.getContext("2d");
    if (!maskContext) continue;
    const binary = atob(item.maskRasterBase64);
    const pixels = maskContext.createImageData(item.maskWidth, item.maskHeight);
    for (let index = 0; index < Math.min(binary.length, item.maskWidth * item.maskHeight); index += 1) {
      if (binary.charCodeAt(index)) {
        const offset = index * 4;
        pixels.data[offset] = 52;
        pixels.data[offset + 1] = 156;
        pixels.data[offset + 2] = 113;
        pixels.data[offset + 3] = 115;
      }
    }
    maskContext.putImageData(pixels, 0, 0);
    context.drawImage(maskCanvas, 0, 0, item.maskWidth, item.maskHeight, item.bounds.left, item.bounds.top, item.bounds.right - item.bounds.left, item.bounds.bottom - item.bounds.top);
    context.strokeStyle = "#d3ae5a";
    context.lineWidth = Math.max(2, canvas.width / 450);
    context.strokeRect(item.box.left, item.box.top, item.box.right - item.box.left, item.box.bottom - item.box.top);
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}

function newPage(doc: jsPDF, pageTitle: string) {
  doc.addPage();
  addHeader(doc, pageTitle);
  return 34;
}

function addHeader(doc: jsPDF, pageTitle: string) {
  doc.setFillColor(23, 60, 50);
  doc.roundedRect(MARGIN, 12, 11, 11, 2, 2, "F");
  doc.setDrawColor(185, 216, 210);
  doc.setLineWidth(0.7);
  doc.line(MARGIN + 2, 19, MARGIN + 5.2, 16.5);
  doc.line(MARGIN + 5.2, 16.5, MARGIN + 9, 19.3);
  doc.setDrawColor(225, 185, 99);
  doc.line(MARGIN + 5, 20, MARGIN + 8, 23);
  doc.line(MARGIN + 8, 23, MARGIN + 11, 18.5);
  doc.setTextColor(23, 60, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MAJIPROOF", MARGIN + 15, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 120, 111);
  doc.text("VISUAL EVIDENCE RECORD · NOT A REPAIR CERTIFICATE", MARGIN + 15, 22);
  doc.setFontSize(8);
  doc.text(pageTitle.toUpperCase(), PAGE_WIDTH - MARGIN, 17, { align: "right" });
  doc.setDrawColor(221, 226, 218);
  doc.line(MARGIN, 28, PAGE_WIDTH - MARGIN, 28);
}

function ensureRoom(doc: jsPDF, y: number, height: number, pageTitle: string) {
  if (y + height <= 278) return y;
  return newPage(doc, pageTitle);
}

function addParagraph(doc: jsPDF, text: string, x: number, y: number, width: number, fontSize = 8.5, color: [number, number, number] = [64, 78, 69], pageTitle = "Inspection report") {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text || "—", width) as string[];
  const lineHeight = fontSize * 0.45;
  y = ensureRoom(doc, y, lines.length * lineHeight + 3, pageTitle);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight + 3;
}

function addSectionTitle(doc: jsPDF, title: string, y: number, pageTitle: string) {
  y = ensureRoom(doc, y, 10, pageTitle);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(35, 69, 55);
  doc.text(title.toUpperCase(), MARGIN, y);
  doc.setDrawColor(226, 230, 223);
  doc.line(MARGIN, y + 2.2, PAGE_WIDTH - MARGIN, y + 2.2);
  return y + 8;
}

function addList(doc: jsPDF, items: string[], y: number, pageTitle: string) {
  if (!items.length) return addParagraph(doc, "None recorded.", MARGIN + 1, y, CONTENT_WIDTH - 2, 8, [120, 132, 123], pageTitle);
  for (const item of items) y = addParagraph(doc, `• ${item}`, MARGIN + 1, y, CONTENT_WIDTH - 2, 8.3, [71, 85, 76], pageTitle);
  return y;
}

function addAnalysis(doc: jsPDF, evidence: EvidenceWithBlob, y: number, pageTitle: string) {
  if (!evidence.analysis) return addParagraph(doc, "No AI analysis is saved for this stage.", MARGIN, y, CONTENT_WIDTH, 8.3, [120, 132, 123], pageTitle);
  const analysis = evidence.analysis;
  y = addParagraph(doc, `Scene summary — ${analysis.sceneSummary}`, MARGIN, y, CONTENT_WIDTH, 8.3, [58, 74, 64], pageTitle);
  if (analysis.attribution) y = addParagraph(doc, `Model source — ${analysis.attribution.displayName} · ${analysis.attribution.modelId} · ${analysis.attribution.endpointLabel}`, MARGIN, y, CONTENT_WIDTH, 7.6, [112, 124, 115], pageTitle);
  else y = addParagraph(doc, "Model source — not stored in this older analysis record.", MARGIN, y, CONTENT_WIDTH, 7.6, [112, 124, 115], pageTitle);
  y = addParagraph(doc, `Visible flow — ${analysis.visibleFlow.replaceAll("_", " ")}. This is not a water-quality or supply-capacity test.`, MARGIN, y, CONTENT_WIDTH, 8.3, [58, 74, 64], pageTitle);
  for (const finding of analysis.visibleConditions) {
    y = ensureRoom(doc, y, 21, pageTitle);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.2); doc.setTextColor(48, 62, 53);
    doc.text(`${finding.label} · ID ${finding.id} · ${finding.confidence.toUpperCase()} confidence${finding.requiresHumanInspection ? " · HUMAN INSPECTION SUGGESTED" : ""}`, MARGIN, y);
    y += 4.5;
    y = addParagraph(doc, finding.description, MARGIN + 2, y, CONTENT_WIDTH - 4, 8, [73, 85, 76], pageTitle);
    y = addParagraph(doc, `Evidence basis — ${finding.evidenceExplanation}`, MARGIN + 2, y, CONTENT_WIDTH - 4, 7.8, [112, 124, 115], pageTitle);
  }
  y = addSectionTitle(doc, "Evidence gaps and limitations", y + 1, pageTitle);
  y = addList(doc, [...analysis.missingEvidence, ...analysis.limitations], y, pageTitle);
  y = addSectionTitle(doc, "Suggested follow-up", y + 1, pageTitle);
  return addList(doc, analysis.suggestedActions, y, pageTitle);
}

export async function downloadInspectionReport(bundle: InspectionBundle): Promise<void> {
  const { inspection, evidence } = bundle;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  addHeader(doc, "Inspection evidence report");
  let y = 39;
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(32, 43, 39);
  doc.text("Inspection evidence report", MARGIN, y);
  y += 9;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(103, 117, 107);
  doc.text(`Case ${inspection.assetId}  ·  ${inspection.assetName}`, MARGIN, y);
  y += 9;

  const facts = [
    ["Asset", `${inspection.assetName} · ${inspection.assetType}`],
    ["Case ID", inspection.assetId],
    ["Site / community", inspection.siteName],
    ["County / region", inspection.region || "Not provided"],
    ["Inspection date", new Date(`${inspection.inspectionDate}T12:00:00`).toLocaleDateString()],
    ["Case status", inspection.status.replaceAll("_", " ")],
  ];
  doc.setFillColor(244, 245, 238);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 36, 1.5, 1.5, "F");
  facts.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + 5 + col * (CONTENT_WIDTH / 2);
    const rowY = y + 7 + row * 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.6); doc.setTextColor(115, 128, 118);
    doc.text(label.toUpperCase(), x, rowY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(48, 62, 53);
    doc.text(doc.splitTextToSize(value, CONTENT_WIDTH / 2 - 12)[0] ?? value, x, rowY + 3.5);
  });
  y += 44;

  y = addSectionTitle(doc, "Before and after evidence", y, "Evidence report");
  for (const stage of ["before", "after"] as const) {
    const item = evidence.find((record) => record.stage === stage);
    if (!item) {
      y = addParagraph(doc, `${stage === "before" ? "Before-repair" : "After-repair"} photograph: not submitted.`, MARGIN, y, CONTENT_WIDTH, 8.2, [120, 132, 123], "Evidence report");
      continue;
    }
    y = ensureRoom(doc, y, 18, "Evidence report");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(39, 77, 58);
    doc.text(stage === "before" ? "BEFORE REPAIR" : "AFTER REPAIR", MARGIN, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(113, 124, 116);
    doc.text(`${item.fileName} · ${new Date(item.createdAt).toLocaleString()}`, PAGE_WIDTH - MARGIN, y, { align: "right" });
    y += 4;
    if (item.description) y = addParagraph(doc, `Field note: ${item.description}`, MARGIN, y, CONTENT_WIDTH, 8, [80, 92, 83], "Evidence report");
    const photo = await evidenceImage(item);
    const props = doc.getImageProperties(photo);
    const targetWidth = Math.min(CONTENT_WIDTH, 155);
    const targetHeight = Math.min(80, targetWidth * props.height / props.width);
    y = ensureRoom(doc, y, targetHeight + 8, "Evidence report");
    doc.addImage(photo, "JPEG", MARGIN, y, targetWidth, targetHeight, undefined, "MEDIUM");
    y += targetHeight + 6;
    if (item.segmentations?.length) {
      y = addParagraph(doc, `Annotated with actual SAM 3.1 segmentation: ${item.segmentations.map((segment) => segment.prompt).join(", ")}. Mask and box are overlaid on the original evidence photograph.`, MARGIN, y, CONTENT_WIDTH, 7.5, [89, 112, 98], "Evidence report");
    }
    y = addAnalysis(doc, item, y + 1, "Evidence report");
  }

  if (bundle.comparison) {
    y = addSectionTitle(doc, "Before-and-after comparison · AI-generated", y + 2, "Evidence report");
    y = addParagraph(doc, `Outcome category: ${bundle.comparison.outcome.replaceAll("_", " ").toUpperCase()}`, MARGIN, y, CONTENT_WIDTH, 8.5, [65, 102, 78], "Evidence report");
    if (bundle.comparison.attribution) y = addParagraph(doc, `Model source — ${bundle.comparison.attribution.displayName} · ${bundle.comparison.attribution.modelId} · ${bundle.comparison.attribution.endpointLabel}`, MARGIN, y, CONTENT_WIDTH, 7.6, [112, 124, 115], "Evidence report");
    else y = addParagraph(doc, "Model source — not stored in this older comparison record.", MARGIN, y, CONTENT_WIDTH, 7.6, [112, 124, 115], "Evidence report");
    y = addParagraph(doc, bundle.comparison.summary, MARGIN, y, CONTENT_WIDTH, 8.3, [67, 80, 71], "Evidence report");
    y = addParagraph(doc, `Visible flow in photographs — before: ${bundle.comparison.beforeVisibleFlow?.replaceAll("_", " ") ?? "unclear"}; after: ${bundle.comparison.afterVisibleFlow?.replaceAll("_", " ") ?? "unclear"}. This is not a measure of capacity, reliability or potability.`, MARGIN, y, CONTENT_WIDTH, 8.1, [68, 92, 81], "Evidence report");
    y = addSectionTitle(doc, "Observed changes", y, "Evidence report");
    y = addList(doc, bundle.comparison.observedChanges, y, "Evidence report");
    y = addSectionTitle(doc, "Persisting concerns and unresolved questions", y, "Evidence report");
    y = addList(doc, [...bundle.comparison.persistingConcerns, ...bundle.comparison.unresolvedQuestions], y, "Evidence report");
    y = addSectionTitle(doc, "Evidence limitations", y, "Evidence report");
    y = addList(doc, bundle.comparison.evidenceLimitations, y, "Evidence report");
  }

  y = addSectionTitle(doc, "Human review · separate from model output", y + 2, "Evidence report");
  if (bundle.review) {
    const reviewCurrent = isReviewCurrent(bundle.review, bundle.evidence, bundle.comparison);
    y = addParagraph(doc, `${reviewCurrent ? "Current manual decision" : "Prior manual decision — evidence or comparison has changed"}: ${bundle.review.decision.replaceAll("_", " ").toUpperCase()}`, MARGIN, y, CONTENT_WIDTH, 8.5, [49, 100, 72], "Evidence report");
    y = addParagraph(doc, `Reviewer: ${bundle.review.reviewerName || "Not provided"} · ${new Date(bundle.review.reviewedAt).toLocaleString()}`, MARGIN, y, CONTENT_WIDTH, 8, [83, 97, 88], "Evidence report");
    y = addParagraph(doc, `Comments: ${bundle.review.comments || "No comments recorded."}`, MARGIN, y, CONTENT_WIDTH, 8, [83, 97, 88], "Evidence report");
  } else {
    y = addParagraph(doc, "No human review decision has been recorded for this case.", MARGIN, y, CONTENT_WIDTH, 8.3, [120, 132, 123], "Evidence report");
  }

  y = addSectionTitle(doc, "Limitations and accountability", y + 2, "Evidence report");
  addParagraph(doc, "AI-generated observations in this report are limited to visual patterns in the submitted photographs and are not an engineering diagnosis or independent repair verification. Apparent water flow does not establish water capacity, reliability, cleanliness, or potability. The human decision above records a supervisor's review of this inspection evidence; it is distinct from model output.", MARGIN, y, CONTENT_WIDTH, 8, [83, 97, 88], "Evidence report");

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(131, 141, 133);
    doc.text(`MajiProof · ${inspection.assetId} · ${page}/${totalPages}`, PAGE_WIDTH - MARGIN, 287, { align: "right" });
    doc.setDrawColor(225, 228, 222);
    doc.line(MARGIN, 282, PAGE_WIDTH - MARGIN, 282);
  }
  const safeId = inspection.assetId.replace(/[^A-Za-z0-9_-]/g, "-");
  doc.save(`MajiProof-${safeId}-inspection-report.pdf`);
}
