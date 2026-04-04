"use client";

import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────

interface ReceiptProduct {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  inlineDiscount: number;
}

interface ReceiptDiscount {
  description: string;
  amount: number;
  keyword: string;
}

interface MergedItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
  category: string;
}

interface ReceiptImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (storeName: string, date: string, items: MergedItem[]) => void;
}

// ── Category detection (same as ManualEntry) ───────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "ירקות ופירות": ["עגבני", "מלפפון", "בצל", "גזר", "תפוח", "בננ", "תפוז", "לימון", "אבוקדו", "פלפל", "חסה", "כרוב", "ברוקולי", "קישוא", "חציל", "תירס", "שום", "פטרוזיל", "נענע", "ענב", "אבטיח", "מנגו", "תות", "שזיף", "אפרסק", "בטטה", "דלעת", "סלרי", "סלק", "פטריו", "ירקות", "פירות", "זוקיני"],
  "חלב וביצים": ["חלב", "גבינ", "יוגורט", "שמנת", "ביצ", "קוטג", "לבן", "מוצרלה", "בולגרי", "צפתי", "גאודה", "עמק", "חמאה", "מעדן", "דנונה", "מילקי", "שוקו", "קפיר", "אשל", "אקטיבי", "נפוליאון", "פרו משקה חלב", "אקסטרה"],
  "בשר ודגים": ["עוף", "חזה", "כרעיי", "שניצל", "בשר", "טחון", "סטייק", "אנטריקוט", "צלעות", "כבד", "נקניק", "סלמון", "דג", "אמנון", "טונה", "דניס", "פילה", "קבב", "המבורגר", "פרגי", "הודו", "כבש", "קציצ", "אונטריב", "גורמה"],
  "חטיפים ומתוקים": ["במב", "ביסלי", "חטיף", "שוקולד", "וופל", "עוגי", "קרקר", "צ'יפס", "דוריטו", "פסק זמן", "קליק", "מקופלת", "אוראו", "בוטנ", "גרעינ", "שקד"],
  "שתייה": ["קולה", "ספרייט", "פאנטה", "מיץ", "מים", "סודה", "בירה", "יין", "קפה", "תה ", "נסקפה", "XL", "אנרגי", "משקה"],
  "ניקיון": ["אקונומיק", "סבון כלים", "נוזל כלים", "נוזל כביס", "מרכך", "מטליו", "ספוג", "שקיות אשפה", "נייר טואלט", "מגבו", "סנו"],
  "טיפוח": ["שמפו", "סבון", "דאודורנט", "משחת שינ", "מברשת שינ", "קרם", "מגבונ", "גילוח"],
  "רטבים ותבלינים": ["קטשופ", "חרדל", "מיונז", "טחינ", "חומוס", "סחוג", "רוטב", "ממרח", "נוטלה", "ריבה", "דבש", "סילאן", "שמן זית", "שמן קנולה", "חומץ"],
  "שימורים": ["שימור", "רסק", "זיתים", "מלפפון חמוץ", "חמוצים"],
  "דגני בוקר": ["קורנפלקס", "גרנולה", "שיבולת", "דגני"],
  "לחם ומאפים": ["לחם", "פיתה", "חלה", "לחמני", "באגט", "טוסט", "קרואסון", "בורקס", "מאפה", "עוג", "קמח מצה"],
  "קפואים": ["קפוא", "שלגון", "ארטיק", "גלידה", "פיצה קפוא", "נאגטס", "בצק עלים"],
  "חד פעמי": ["כוסות", "צלחות", "סכום", "מזלגות", "סכינים", "מפיות", "נייר כסף", "חד פעמי"],
};

function guessCategory(productName: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (productName.includes(keyword)) {
        return category;
      }
    }
  }
  return "אחר";
}

// ── Hardcoded receipt data ──────────────────────────────────

const HARDCODED_STORE = "קוקו כלי ראשל\"צ";
const HARDCODED_DATE = "2026-03-26";

const RAW_PRODUCTS: ReceiptProduct[] = [
  { name: "שניצל עוף טרי גורמה", quantity: 1.004, unit: "קג", unitPrice: 59.80, inlineDiscount: 0 },
  { name: "שניצל עוף טרי גורמה", quantity: 0.996, unit: "קג", unitPrice: 59.80, inlineDiscount: 0 },
  { name: "אנטריב טרי גורמה", quantity: 1.126, unit: "קג", unitPrice: 99.90, inlineDiscount: 0 },
  { name: "אקסטרה פרו משקה", quantity: 6, unit: "יחידות", unitPrice: 7.90, inlineDiscount: 0 },
  { name: "עמק גאודה 30%", quantity: 1, unit: "יחידות", unitPrice: 24.90, inlineDiscount: 5.00 },
  { name: "נפוליאון 16% גבינה 225 גרם", quantity: 1, unit: "יחידות", unitPrice: 17.40, inlineDiscount: 7.40 },
  { name: "שמן קנולה עץ הזית 1 ליטר", quantity: 2, unit: "יחידות", unitPrice: 16.90, inlineDiscount: 0 },
  { name: "בטטה", quantity: 0.935, unit: "קג", unitPrice: 12.90, inlineDiscount: 4.67 },
  { name: "קמח מצה 500 גרם", quantity: 2, unit: "יחידות", unitPrice: 8.90, inlineDiscount: 0 },
  { name: "קישוא זוקיני", quantity: 0.466, unit: "קג", unitPrice: 14.90, inlineDiscount: 0 },
];

const RAW_DISCOUNTS: ReceiptDiscount[] = [
  { description: "הנחה שניצל עוף טרי גורמה 2 ק\"ג ב-110", amount: 9.60, keyword: "שניצל עוף טרי גורמה" },
  { description: "הנחה אנטריב טרי גורמה", amount: 11.26, keyword: "אנטריב טרי גורמה" },
  { description: "הנחה משקאות פרו 350 מ\"ל 3 ב-7.60", amount: 7.60, keyword: "פרו משקה" },
  { description: "הנחה שמן קנולה עץ הזית 2 ב-29", amount: 3.90, keyword: "שמן קנולה עץ הזית" },
  { description: "הנחה קמח מצה 2 ב-15", amount: 1.90, keyword: "קמח מצה" },
];

// ── Discount merging logic ─────────────────────────────────

function mergeDiscounts(): MergedItem[] {
  // Start with inline discounts
  const items: MergedItem[] = RAW_PRODUCTS.map(p => {
    const rawTotal = Math.round(p.quantity * p.unitPrice * 100) / 100;
    return {
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      unitPrice: p.unitPrice,
      discount: p.inlineDiscount,
      total: Math.round((rawTotal - p.inlineDiscount) * 100) / 100,
      category: guessCategory(p.name),
    };
  });

  // Apply external discount lines
  for (const disc of RAW_DISCOUNTS) {
    const matchingIndices = items
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => item.name.includes(disc.keyword) || disc.keyword.includes(item.name.split(" ").slice(0, 2).join(" ")));

    if (matchingIndices.length === 0) continue;

    if (matchingIndices.length === 1) {
      const idx = matchingIndices[0].i;
      items[idx].discount = Math.round((items[idx].discount + disc.amount) * 100) / 100;
      items[idx].total = Math.round((items[idx].quantity * items[idx].unitPrice - items[idx].discount) * 100) / 100;
    } else {
      // Proportional split by raw total (qty * unitPrice)
      const rawTotals = matchingIndices.map(({ item }) => item.quantity * item.unitPrice);
      const sumRaw = rawTotals.reduce((a, b) => a + b, 0);

      matchingIndices.forEach(({ i }, j) => {
        const share = Math.round((disc.amount * rawTotals[j] / sumRaw) * 100) / 100;
        items[i].discount = Math.round((items[i].discount + share) * 100) / 100;
        items[i].total = Math.round((items[i].quantity * items[i].unitPrice - items[i].discount) * 100) / 100;
      });
    }
  }

  return items;
}

// ── Unit display helper ────────────────────────────────────

function unitLabel(unit: string): string {
  if (unit === "קג") return "ק\"ג";
  return unit;
}

// ── Component ──────────────────────────────────────────────

export default function ReceiptImport({ open, onClose, onImport }: ReceiptImportProps) {
  const initialItems = useMemo(() => mergeDiscounts(), []);
  const [items, setItems] = useState<MergedItem[]>(initialItems);
  const [storeName, setStoreName] = useState(HARDCODED_STORE);
  const [date, setDate] = useState(HARDCODED_DATE);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const total = useMemo(
    () => Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100,
    [items]
  );

  function handleDelete(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (editingIdx === index) setEditingIdx(null);
  }

  function handleEditField(index: number, field: keyof MergedItem, value: string) {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "name") {
        item.name = value;
        item.category = guessCategory(value);
      } else if (field === "quantity") {
        item.quantity = parseFloat(value) || 0;
      } else if (field === "unitPrice") {
        item.unitPrice = parseFloat(value) || 0;
      } else if (field === "discount") {
        item.discount = parseFloat(value) || 0;
      }

      item.total = Math.round((item.quantity * item.unitPrice - item.discount) * 100) / 100;
      updated[index] = item;
      return updated;
    });
  }

  function handleConfirm() {
    onImport(storeName, date, items);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] max-h-[85vh] bg-white dark:bg-gray-800 rounded-t-2xl flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            ייבוא חשבונית
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Store & Date */}
        <div className="p-4 pb-2 flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">שם חנות</label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div className="w-[130px]">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">תאריך</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              dir="ltr"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Items count */}
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {items.length} מוצרים
          </span>
          <span className="text-xs text-gray-400">
            לחץ על שורה לעריכה
          </span>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                onClick={() => setEditingIdx(editingIdx === index ? null : index)}
                className={`bg-gray-50 dark:bg-gray-750 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                  editingIdx === index
                    ? 'border-blue-400 dark:border-blue-500 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Summary row */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {item.name}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {item.quantity} {unitLabel(item.unit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mr-2">
                    {item.discount > 0 && (
                      <span className="text-xs text-emerald-500 dark:text-emerald-400 whitespace-nowrap">
                        -{item.discount.toFixed(2)}₪
                      </span>
                    )}
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm whitespace-nowrap">
                      {item.total.toFixed(2)}₪
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                      className="p-1 text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Edit row (expanded) */}
                {editingIdx === index && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex flex-col gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleEditField(index, "name", e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder="שם מוצר"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-0.5">כמות</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={e => handleEditField(index, "quantity", e.target.value)}
                          onClick={e => e.stopPropagation()}
                          dir="ltr"
                          step="0.001"
                          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-0.5">מחיר ליח&apos;</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={item.unitPrice}
                          onChange={e => handleEditField(index, "unitPrice", e.target.value)}
                          onClick={e => e.stopPropagation()}
                          dir="ltr"
                          step="0.01"
                          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] text-gray-400 mb-0.5">הנחה ₪</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={item.discount}
                          onChange={e => handleEditField(index, "discount", e.target.value)}
                          onClick={e => e.stopPropagation()}
                          dir="ltr"
                          step="0.01"
                          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-800 dark:text-gray-200">סה&quot;כ חשבונית</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {total.toFixed(2)}₪
            </span>
          </div>
          <button
            onClick={handleConfirm}
            disabled={items.length === 0}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
              items.length > 0
                ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            אשר והוסף {items.length} מוצרים
          </button>
        </div>
      </div>
    </div>
  );
}
