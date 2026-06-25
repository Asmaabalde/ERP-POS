import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";

function generateBarcodeDataUrl(value) {
  const canvas = document.createElement("canvas");

  JsBarcode(canvas, value, {
    format: "EAN13",
    displayValue: true,
    fontSize: 13,
    textMargin: 2,
    margin: 4,
    width: 2,
    height: 36,
    background: "#ffffff",
  });

  return canvas.toDataURL("image/png");
}

function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function openClientCardPdf(client) {
  if (!client?.code_barre || !client?.nom_complet) return;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [85.6, 53.98],
  });

  const width = 85.6;
  const height = 53.98;
  const barcode = generateBarcodeDataUrl(client.code_barre);

  let logo = null;

  try {
    logo = await loadImage("/planify-x.png");
  } catch {
    logo = null;
  }

  doc.setFillColor(37, 99, 235);
  doc.roundedRect(0, 0, width, height, 4, 4, "F");

  doc.setFillColor(29, 78, 216);
  doc.circle(width - 7, 7, 27, "F");

  doc.setFillColor(255, 255, 255);
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  doc.circle(12, height - 2, 20, "F");
  doc.setGState(new doc.GState({ opacity: 1 }));

  doc.setFillColor(255, 255, 255);
  doc.circle(width - 13, 10, 8, "F");

  if (logo) {
    doc.addImage(logo, "PNG", width - 18, 4.6, 10, 10);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(client.entreprise || "Entreprise", 7, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Carte fidélité", 7, 14);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.setFillColor(37, 99, 235);
  doc.circle(16, 27, 10, "FD");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(getInitials(client.nom_complet), 16, 28.1, {
    align: "center",
    baseline: "middle",
  });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text(client.nom_complet, 30, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.text(client.email || "Client fidélité", 30, 28.8);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(7, 38, 72, 11, 2, 2, "F");
  doc.addImage(barcode, "PNG", 10, 39, 66, 8);

  const pdfUrl = doc.output("bloburl");
  window.open(pdfUrl, "_blank");
}