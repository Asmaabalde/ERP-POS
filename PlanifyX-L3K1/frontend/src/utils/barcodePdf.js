import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";

// Génère une image exploitable par jsPDF à partir d'un code-barres EAN-13.
// On passe par un canvas temporaire, puis on récupère un Data URL PNG.
function generateBarcodeDataUrl(value) {
  const canvas = document.createElement("canvas");

  JsBarcode(canvas, value, {
    format: "EAN13",
    displayValue: true,
    fontSize: 14,
    textMargin: 2,
    margin: 4,
    width: 2,
    height: 40,
    background: "#ffffff",
  });

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

// Ouvre une planche A4 contenant plusieurs exemplaires du même code-barres.
// Utilisé pour l'impression ou l'export rapide depuis un produit.
export function openBarcodeSheetPdf(product) {
  // On ne génère rien si les infos minimales ne sont pas présentes.
  if (!product?.codeBarres || !product?.nom) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  const marginX = 10;
  const marginTop = 15;
  const titleHeight = 18;
  const gapX = 6;
  const gapY = 8;

  const columns = 3;
  const rows = 5;
  const total = columns * rows;

  const usableWidth = pageWidth - marginX * 2;
  const cellWidth = (usableWidth - gapX * (columns - 1)) / columns;
  const cellHeight = 32;

  const barcodeImage = generateBarcodeDataUrl(product.codeBarres);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(product.nom, pageWidth / 2, marginTop, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${total} code${total > 1 ? "s" : ""}-barres`, pageWidth / 2, marginTop + 7, {
    align: "center",
  });

  const startY = marginTop + titleHeight;

  for (let i = 0; i < total; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);

    // Calcule la position de chaque case dans la grille.
    const x = marginX + col * (cellWidth + gapX);
    const y = startY + row * (cellHeight + gapY);

    doc.setDrawColor(220, 226, 232);
    doc.roundedRect(x, y, cellWidth, cellHeight, 2, 2);

    const imageRatio = barcodeImage.width / barcodeImage.height;

    // On conserve les proportions du code-barres pour éviter toute déformation à l'impression.
    const maxImageWidth = cellWidth - 8;
    const maxImageHeight = cellHeight - 8;

    let barcodeWidth = maxImageWidth;
    let barcodeHeight = barcodeWidth / imageRatio;

    if (barcodeHeight > maxImageHeight) {
      barcodeHeight = maxImageHeight;
      barcodeWidth = barcodeHeight * imageRatio;
    }

    // Centre l'image dans chaque cellule de la planche.
    const barcodeX = x + (cellWidth - barcodeWidth) / 2;
    const barcodeY = y + (cellHeight - barcodeHeight) / 2;

    doc.addImage(
      barcodeImage.dataUrl,
      "PNG",
      barcodeX,
      barcodeY,
      barcodeWidth,
      barcodeHeight
    );
  }

  const pdfUrl = doc.output("bloburl");
  window.open(pdfUrl, "_blank");
}

export function openClientCardPdf(client) {
  if (!client?.id || !client?.nom_complet) return;

  // Préfixe 200 + id paddé sur 9 chiffres = 12 chiffres pour EAN13
  const codeBarres = `200${String(client.id).padStart(9, '0')}`;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 10;
  const marginTop = 15;
  const titleHeight = 18;
  const gapX = 6;
  const gapY = 8;

  const columns = 3;
  const rows = 5;
  const total = columns * rows;

  const usableWidth = pageWidth - marginX * 2;
  const cellWidth = (usableWidth - gapX * (columns - 1)) / columns;
  const cellHeight = 32;

  const barcodeImage = generateBarcodeDataUrl(codeBarres);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(client.nom_complet, pageWidth / 2, marginTop, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Carte de fidélité", pageWidth / 2, marginTop + 7, { align: "center" });

  const startY = marginTop + titleHeight;

  for (let i = 0; i < total; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);

    const x = marginX + col * (cellWidth + gapX);
    const y = startY + row * (cellHeight + gapY);

    doc.setDrawColor(220, 226, 232);
    doc.roundedRect(x, y, cellWidth, cellHeight, 2, 2);

    const imageRatio = barcodeImage.width / barcodeImage.height;
    const maxImageWidth = cellWidth - 8;
    const maxImageHeight = cellHeight - 8;

    let barcodeWidth = maxImageWidth;
    let barcodeHeight = barcodeWidth / imageRatio;

    if (barcodeHeight > maxImageHeight) {
      barcodeHeight = maxImageHeight;
      barcodeWidth = barcodeHeight * imageRatio;
    }

    const barcodeX = x + (cellWidth - barcodeWidth) / 2;
    const barcodeY = y + (cellHeight - barcodeHeight) / 2;

    doc.addImage(barcodeImage.dataUrl, "PNG", barcodeX, barcodeY, barcodeWidth, barcodeHeight);
  }

  const pdfUrl = doc.output("bloburl");
  window.open(pdfUrl, "_blank");
}