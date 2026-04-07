import ExcelJS from "exceljs";
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

// Color palette (matches PDF export and app UI)
const COLORS = {
  primary600: "2563EB",
  primary50: "EFF6FF",
  white: "FFFFFF",
  slate800: "1E293B",
  slate600: "475569",
  slate200: "E2E8F0",
  surface: "F8FAFC",
};

const PRICE_FORMAT = '#,##0.00" ₪"';
const SUMMARY_START_ROW = 3;
const HEADER_ROW = 8;
const DATA_START_ROW = 9;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatQuantity(qty: number, unit: string | null): string {
  const qtyStr = Number.isInteger(qty) ? String(qty) : String(qty);
  return unit ? `${qtyStr} ${unit}` : qtyStr;
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: COLORS.slate200 },
  };
  return { top: side, bottom: side, left: side, right: side };
}

function triggerDownload(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generateExcel(payload: ExportPayload): Promise<void> {
  const { rows, total, periodLabel, periodSlug } = payload;

  // Compute summary stats
  const receiptIds = new Set(rows.map((r) => r.receipt_id));
  const receiptCount = receiptIds.size;
  const totalDiscount = Math.round(
    rows.reduce((sum, r) => sum + r.discount_amount, 0) * 100
  ) / 100;
  const avgPerReceipt =
    receiptCount > 0
      ? Math.round((total / receiptCount) * 100) / 100
      : 0;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Grocery Tracker";
  wb.created = new Date();

  const rawSheetName = `קניות ${periodLabel}`;
  const sheetName = rawSheetName.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
  const ws = wb.addWorksheet(sheetName, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: HEADER_ROW }],
  });

  // ── Title Row (row 1) ──
  ws.mergeCells("A1:H1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `דוח קניות — ${periodLabel}`;
  titleCell.font = {
    bold: true,
    size: 16,
    color: { argb: COLORS.slate800 },
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.primary50 },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 36;

  // ── Row 2: spacer ──
  ws.getRow(2).height = 8;

  // ── Summary Block (rows 3-6) ──
  const summaryItems = [
    { label: 'סה"כ הוצאות', value: total, isCurrency: true },
    { label: "חיסכון מהנחות", value: totalDiscount, isCurrency: true },
    { label: "מספר קבלות", value: receiptCount, isCurrency: false },
    { label: "ממוצע לקנייה", value: avgPerReceipt, isCurrency: true },
  ];

  for (let i = 0; i < summaryItems.length; i++) {
    const row = ws.getRow(SUMMARY_START_ROW + i);
    const item = summaryItems[i];

    // Label in columns G-H (merged)
    ws.mergeCells(SUMMARY_START_ROW + i, 7, SUMMARY_START_ROW + i, 8);
    const labelCell = row.getCell(7);
    labelCell.value = item.label;
    labelCell.font = {
      bold: true,
      size: 11,
      color: { argb: COLORS.slate600 },
    };
    labelCell.alignment = { horizontal: "right", vertical: "middle" };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.surface },
    };

    // Value in columns E-F (merged)
    ws.mergeCells(SUMMARY_START_ROW + i, 5, SUMMARY_START_ROW + i, 6);
    const valueCell = row.getCell(5);
    valueCell.value = item.value;
    if (item.isCurrency) {
      valueCell.numFmt = PRICE_FORMAT;
    }
    valueCell.font = {
      bold: true,
      size: 12,
      color: { argb: COLORS.primary600 },
    };
    valueCell.alignment = { horizontal: "center", vertical: "middle" };
    valueCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.surface },
    };

    row.height = 22;
  }

  // ── Row 7: spacer ──
  ws.getRow(7).height = 8;

  // ── Header Row (row 8) ──
  const headerRow = ws.getRow(HEADER_ROW);
  HEADERS.forEach((header, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = header;
    cell.font = {
      bold: true,
      size: 11,
      color: { argb: COLORS.white },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.primary600 },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  });
  headerRow.height = 28;

  // Auto-filter on header row
  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: 8 },
  };

  // ── Data Rows ──
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = DATA_START_ROW + i;
    const row = ws.getRow(rowNum);
    const isEven = i % 2 === 0;
    const bgColor = isEven ? COLORS.white : COLORS.surface;

    const values: (string | number)[] = [
      formatDate(r.purchase_date),
      r.name,
      r.category ?? "",
      formatQuantity(r.quantity, r.unit),
      r.paid_price,
      r.original_price,
      r.discount_amount,
      r.store_name,
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { size: 10, color: { argb: COLORS.slate800 } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: bgColor },
      };
      cell.border = thinBorder();
      cell.alignment = { horizontal: "center", vertical: "middle" };

      // Currency format for price columns (5, 6, 7)
      if (colIdx >= 4 && colIdx <= 6 && typeof val === "number") {
        cell.numFmt = PRICE_FORMAT;
      }
    });

    row.height = 22;
  }

  // ── Blank Row + Total Row ──
  const blankRowNum = DATA_START_ROW + rows.length;
  ws.getRow(blankRowNum).height = 8;

  const totalRowNum = blankRowNum + 1;
  const totalRow = ws.getRow(totalRowNum);

  // Label
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = 'סה"כ';
  totalLabelCell.font = {
    bold: true,
    size: 12,
    color: { argb: COLORS.slate800 },
  };
  totalLabelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.primary50 },
  };
  totalLabelCell.alignment = { horizontal: "center", vertical: "middle" };
  totalLabelCell.border = {
    ...thinBorder(),
    top: { style: "medium", color: { argb: COLORS.primary600 } },
  };

  // Fill empty cells in total row
  for (let col = 2; col <= 8; col++) {
    const cell = totalRow.getCell(col);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.primary50 },
    };
    cell.border = {
      ...thinBorder(),
      top: { style: "medium", color: { argb: COLORS.primary600 } },
    };
  }

  // Total value
  const totalValueCell = totalRow.getCell(5);
  totalValueCell.value = total;
  totalValueCell.numFmt = PRICE_FORMAT;
  totalValueCell.font = {
    bold: true,
    size: 12,
    color: { argb: COLORS.primary600 },
  };
  totalValueCell.alignment = { horizontal: "center", vertical: "middle" };

  totalRow.height = 28;

  // ── Column Widths ──
  const colWidths = HEADERS.map((h, colIdx) => {
    let maxLen = h.length;
    for (const r of rows) {
      const vals = [
        formatDate(r.purchase_date),
        r.name,
        r.category ?? "",
        formatQuantity(r.quantity, r.unit),
        String(r.paid_price),
        String(r.original_price),
        String(r.discount_amount),
        r.store_name,
      ];
      const len = vals[colIdx].length;
      if (len > maxLen) maxLen = len;
    }
    return Math.min(Math.max(maxLen + 4, 10), 40);
  });

  ws.columns = colWidths.map((width) => ({ width }));

  // ── Generate & Download ──
  const buffer = await wb.xlsx.writeBuffer();
  const filename = `דוח-קניות-${periodSlug}.xlsx`;
  triggerDownload(buffer as ArrayBuffer, filename);
}
