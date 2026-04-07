import type { ExportPayload } from "./types";

const HEADERS = [
  "תאריך",
  "מוצר",
  "קטגוריה",
  "כמות",
  "מחיר ששולם",
  "מחיר מקורי",
  "הנחה",
  "חנות",
];

// jsPDF setR2L reverses the entire string character-by-character.
// Hebrew text displays correctly after reversal (read right-to-left).
// Numbers/dates must be pre-reversed so the double-reversal yields correct LTR output.
function rev(s: string): string {
  return [...s].reverse().join("");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return rev(`${dd}/${mm}/${d.getFullYear()}`);
}

function formatQuantity(qty: number, unit: string | null): string {
  if (!unit) return rev(String(qty));
  // Pre-reverse only the number; Hebrew unit is handled by setR2L
  return `${rev(String(qty))} ${unit}`;
}

function formatMoney(n: number): string {
  return rev(`${n.toFixed(2)} ₪`);
}

export async function generatePdf(payload: ExportPayload): Promise<void> {
  const { rows, total, periodLabel, periodSlug } = payload;

  // Dynamic imports to keep these libs out of the main bundle.
  const [{ jsPDF }, autoTableModule, fontModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("./fonts/heebo"),
  ]);
  const autoTable = autoTableModule.default;
  const { HEEBO_REGULAR_BASE64 } = fontModule;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Register Heebo font for Hebrew support.
  doc.addFileToVFS("Heebo-Regular.ttf", HEEBO_REGULAR_BASE64);
  doc.addFont("Heebo-Regular.ttf", "Heebo", "normal");
  doc.addFont("Heebo-Regular.ttf", "Heebo", "bold");

  // RTL mode for Hebrew text layout.
  doc.setR2L(true);

  // Title
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("Heebo", "bold");
  doc.setFontSize(16);
  doc.text(`דוח קניות — ${periodLabel}`, pageWidth - 40, 50, {
    align: "right",
  });

  // Build table rows
  const body = rows.map((r) => [
    formatDate(r.purchase_date),
    r.name,
    r.category ?? "",
    formatQuantity(r.quantity, r.unit),
    formatMoney(r.paid_price),
    formatMoney(r.original_price),
    r.discount_amount > 0 ? formatMoney(r.discount_amount) : "—",
    r.store_name,
  ]);

  autoTable(doc, {
    head: [HEADERS],
    body,
    foot: [
      [
        "",
        "",
        "",
        "",
        formatMoney(total),
        "",
        "",
        'סה"כ',
      ],
    ],
    startY: 70,
    margin: { top: 70, right: 40, left: 40 },
    styles: {
      font: "Heebo",
      fontStyle: "normal",
      halign: "right",
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      font: "Heebo",
      fontStyle: "bold",
      fillColor: [37, 99, 235], // primary-600
      textColor: 255,
      halign: "right",
    },
    footStyles: {
      font: "Heebo",
      fontStyle: "bold",
      fillColor: [239, 246, 255], // primary-50
      textColor: [15, 23, 42],
      halign: "right",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // bg-surface
    },
  });

  const filename = `דוח-קניות-${periodSlug}.pdf`;
  doc.save(filename);
}
