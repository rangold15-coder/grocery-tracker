"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/components/ui/Toast";
import ShoppingListModal from "@/components/ShoppingListModal";
import ReceiptImport from "@/components/ReceiptImport";

// ── Interfaces ──────────────────────────────────────────────

interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  discountType: 'percent' | 'fixed' | null;
  discountValue: number;
  unitPrice: number;
  finalCost: number;
  category: string;
}

interface ProductSuggestion {
  name: string;
  category: string;
  avg_price: number | null;
}

interface ManualEntryProps {
  onSaved?: () => void;
}

// ── Units ───────────────────────────────────────────────────

const UNIT_OPTIONS = [
  { label: 'יחידות', value: 'יחידות' },
  { label: 'ק"ג', value: 'קג' },
  { label: 'גרם', value: 'גרם' },
] as const;

// ── Categories ──────────────────────────────────────────────

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

// ── Initial form state ──────────────────────────────────────

const INITIAL_FORM = {
  name: '',
  quantity: '1',
  unit: 'יחידות',
  discountType: 'fixed' as 'percent' | 'fixed',
  discountValue: '',
  unitPrice: '',
};

// ── Component ───────────────────────────────────────────────

export default function ManualEntry({ onSaved }: ManualEntryProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  // Receipt metadata
  const [storeName, setStoreName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Product form
  const [form, setForm] = useState({ ...INITIAL_FORM });

  // Invoice list
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProductAvgPrice, setSelectedProductAvgPrice] = useState<number | null>(null);
  const [pricePlaceholder, setPricePlaceholder] = useState("0.00");

  // Warnings & validation
  const [priceWarning, setPriceWarning] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Animations
  const [animatingItemIndex, setAnimatingItemIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [showReceiptImport, setShowReceiptImport] = useState(false);

  // ── Debounced autocomplete ──────────────────────────────

  const debouncedName = useDebounce(form.name, 300);

  useEffect(() => {
    if (!debouncedName || debouncedName.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    async function search() {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(debouncedName)}`);
        const data = await res.json();
        if (data.success && data.products?.length > 0) {
          setSuggestions(data.products);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
    search();
  }, [debouncedName]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Price anomaly check ─────────────────────────────────

  useEffect(() => {
    const price = parseFloat(form.unitPrice);
    if (!price || !selectedProductAvgPrice || selectedProductAvgPrice === 0) {
      setPriceWarning(null);
      return;
    }
    const diff = Math.abs(price - selectedProductAvgPrice) / selectedProductAvgPrice;
    if (diff >= 0.5) {
      setPriceWarning(`המחיר שונה משמעותית מהרכישה האחרונה (${selectedProductAvgPrice.toFixed(2)}₪)`);
    } else {
      setPriceWarning(null);
    }
  }, [form.unitPrice, selectedProductAvgPrice]);

  // ── Computed values ─────────────────────────────────────

  const numQuantity = parseFloat(form.quantity) || 0;
  const numUnitPrice = parseFloat(form.unitPrice) || 0;
  const numDiscount = parseFloat(form.discountValue) || 0;

  const rawCost = numQuantity * numUnitPrice;
  const discountAmount = numDiscount > 0
    ? (form.discountType === 'percent'
        ? rawCost * (Math.min(numDiscount, 100) / 100)
        : Math.min(numDiscount, rawCost))
    : 0;
  const finalCost = Math.round(Math.max(rawCost - discountAmount, 0) * 100) / 100;

  const invoiceTotal = useMemo(
    () => Math.round(items.reduce((sum, item) => sum + item.finalCost, 0) * 100) / 100,
    [items]
  );

  // ── Form helpers ────────────────────────────────────────

  function updateForm(field: string, value: string | number | null) {
    // Prevent negative numbers in numeric fields
    if (typeof value === 'string' && ['quantity', 'unitPrice', 'discountValue'].includes(field)) {
      value = value.replace(/-/g, '');
    }
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function resetForm() {
    setForm({ ...INITIAL_FORM });
    setEditingIndex(null);
    setFieldErrors({});
    setPriceWarning(null);
    setSelectedProductAvgPrice(null);
    setPricePlaceholder("0.00");
  }

  function selectSuggestion(product: ProductSuggestion) {
    setForm(prev => ({ ...prev, name: product.name }));
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedProductAvgPrice(product.avg_price);
    if (product.avg_price) {
      setPricePlaceholder(product.avg_price.toFixed(2));
    }
    if (fieldErrors.name) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  }

  // ── Validation ──────────────────────────────────────────

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.name.trim() || form.name.trim().length < 2) {
      errors.name = "שם מוצר חייב להכיל לפחות 2 תווים";
    }
    if (numQuantity <= 0) {
      errors.quantity = "כמות חייבת להיות מספר חיובי";
    }
    const isFullDiscount = form.discountType === 'percent' && numDiscount >= 100;
    if (numUnitPrice <= 0 && !isFullDiscount) {
      errors.unitPrice = "מחיר חייב להיות מספר חיובי";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Add / Update ────────────────────────────────────────

  const handleAddOrUpdate = useCallback(() => {
    if (!validate()) return;

    const hasDiscount = numDiscount > 0;
    const newItem: InvoiceItem = {
      name: form.name.trim(),
      quantity: numQuantity,
      unit: form.unit,
      discountType: hasDiscount ? form.discountType : null,
      discountValue: hasDiscount ? numDiscount : 0,
      unitPrice: numUnitPrice,
      finalCost,
      category: guessCategory(form.name.trim()),
    };

    if (editingIndex !== null) {
      setItems(prev => prev.map((item, i) => i === editingIndex ? newItem : item));
    } else {
      setItems(prev => {
        const next = [...prev, newItem];
        setAnimatingItemIndex(next.length - 1);
        setTimeout(() => setAnimatingItemIndex(null), 300);
        return next;
      });
    }

    resetForm();
    requestAnimationFrame(() => nameInputRef.current?.focus());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, numQuantity, numUnitPrice, numDiscount, finalCost, editingIndex]);

  function handleEdit(index: number) {
    const item = items[index];
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      discountType: item.discountType || 'fixed',
      discountValue: item.discountValue ? String(item.discountValue) : '',
      unitPrice: String(item.unitPrice),
    });
    setEditingIndex(index);
    setFieldErrors({});
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleDelete(index: number) {
    setDeletingIndex(index);
    setTimeout(() => {
      setItems(prev => prev.filter((_, i) => i !== index));
      setDeletingIndex(null);
      if (editingIndex === index) resetForm();
      else if (editingIndex !== null && editingIndex > index) {
        setEditingIndex(editingIndex - 1);
      }
    }, 300);
  }

  function cancelEdit() {
    resetForm();
  }

  // ── Enter key handler ───────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOrUpdate();
    }
  }

  // ── Shopping list import ────────────────────────────────

  function handleShoppingListAdd(selectedItems: Array<{ product_name: string; category: string; quantity: number; unit: string; avgPrice: number | null }>) {
    const newItems: InvoiceItem[] = selectedItems.map(item => {
      const price = item.avgPrice || 0;
      return {
        name: item.product_name,
        quantity: item.quantity,
        unit: item.unit || 'יחידות',
        discountType: null,
        discountValue: 0,
        unitPrice: price,
        finalCost: Math.round(item.quantity * price * 100) / 100,
        category: item.category || guessCategory(item.product_name),
      };
    });
    setItems(prev => [...prev, ...newItems]);
    showToast({ type: "success", message: `${newItems.length} מוצרים נוספו מרשימת הקניות` });
  }

  // ── Receipt import handler ─────────────────────────────

  function handleReceiptImport(importStoreName: string, importDate: string, importItems: Array<{ name: string; quantity: number; unit: string; unitPrice: number; discount: number; total: number; category: string }>) {
    setStoreName(importStoreName);
    setDate(importDate);
    const newItems: InvoiceItem[] = importItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      discountType: item.discount > 0 ? 'fixed' as const : null,
      discountValue: item.discount,
      unitPrice: item.unitPrice,
      finalCost: item.total,
      category: item.category,
    }));
    setItems(prev => [...prev, ...newItems]);
    showToast({ type: "success", message: `${newItems.length} מוצרים יובאו מהחשבונית` });
  }

  // ── Save receipt ────────────────────────────────────────

  async function handleSaveReceipt() {
    if (!storeName.trim()) {
      setFieldErrors({ storeName: "הכנס שם חנות" });
      return;
    }
    if (items.length === 0) {
      showToast({ type: "error", message: "הוסף לפחות מוצר אחד" });
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const res = await fetch("/api/save-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          date,
          totalAmount: invoiceTotal,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.finalCost,
            category: item.category,
            discountType: item.discountType,
            discountValue: item.discountValue,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast({ type: "error", message: data.error || "שגיאה בשמירת החשבונית" });
        return;
      }

      showToast({ type: "success", message: "החשבונית נשמרה בהצלחה!" });
      setStoreName("");
      setDate(new Date().toISOString().split("T")[0]);
      setItems([]);
      resetForm();
      onSaved?.();
    } catch {
      showToast({ type: "error", message: "שגיאה בשמירת החשבונית. נסה שוב." });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3 w-full">

      {/* ── Store info ──────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={storeName}
            onChange={(e) => {
              setStoreName(e.target.value);
              if (fieldErrors.storeName) {
                setFieldErrors(prev => { const n = { ...prev }; delete n.storeName; return n; });
              }
            }}
            placeholder="שם החנות"
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          {fieldErrors.storeName && (
            <p className="text-xs text-red-500 mt-0.5">{fieldErrors.storeName}</p>
          )}
        </div>
        <div className="w-[140px]">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* ── Product form (sticky) ───────────────────────── */}
      <div ref={formRef} className="sticky top-14 z-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-2.5 shadow-md">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
          {editingIndex !== null ? "עריכת מוצר" : "הוספת מוצר"}
        </h3>

        {/* Product name + autocomplete */}
        <div className="relative" ref={suggestionsRef}>
          <input
            ref={nameInputRef}
            type="text"
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="שם המוצר"
            autoComplete="off"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white ${
              fieldErrors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {fieldErrors.name && (
            <p className="text-xs text-red-500 mt-0.5">{fieldErrors.name}</p>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
              {suggestions.map((product, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSuggestion(product)}
                  className="w-full text-start px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-between border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{product.name}</span>
                  {product.avg_price != null && (
                    <span className="text-xs text-gray-400">{product.avg_price.toFixed(2)}₪</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Row 1: Quantity + Unit toggle + Price */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">כמות</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => updateForm('quantity', e.target.value)}
              onKeyDown={handleKeyDown}
              min="0.001"
              step={form.unit === 'קג' ? '0.001' : '1'}
              dir="ltr"
              className={`w-full border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                fieldErrors.quantity ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {fieldErrors.quantity && (
              <p className="text-xs text-red-500 mt-0.5">{fieldErrors.quantity}</p>
            )}
          </div>

          {/* Unit toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => updateForm('unit', 'קג')}
              className={`py-2 px-3 text-xs font-medium transition-all ${
                form.unit === 'קג'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              ק&quot;ג
            </button>
            <button
              type="button"
              onClick={() => updateForm('unit', 'יחידות')}
              className={`py-2 px-3 text-xs font-medium transition-all border-r border-gray-300 dark:border-gray-600 ${
                form.unit === 'יחידות'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              יח&apos;
            </button>
          </div>

          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">
              {form.unit === 'קג' ? 'מחיר לק"ג' : 'מחיר ליחידה'}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={form.unitPrice}
              onChange={(e) => updateForm('unitPrice', e.target.value)}
              onKeyDown={handleKeyDown}
              min="0"
              step="0.01"
              dir="ltr"
              placeholder={pricePlaceholder}
              className={`w-full border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                fieldErrors.unitPrice ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {fieldErrors.unitPrice && (
              <p className="text-xs text-red-500 mt-0.5">{fieldErrors.unitPrice}</p>
            )}
          </div>
        </div>

        {/* Price warning */}
        {priceWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300 animate-fade-in-up">
            ⚠ {priceWarning}
          </div>
        )}

        {/* Row 2: Discount + toggle + Computed total */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">הנחה</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.discountValue}
              onChange={(e) => updateForm('discountValue', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0"
              min="0"
              max={form.discountType === 'percent' ? 100 : undefined}
              step={form.discountType === 'percent' ? 1 : 0.01}
              dir="ltr"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Discount type toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => updateForm('discountType', 'fixed')}
              className={`py-2 px-3 text-xs font-medium transition-all ${
                form.discountType === 'fixed'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              ₪
            </button>
            <button
              type="button"
              onClick={() => updateForm('discountType', 'percent')}
              className={`py-2 px-3 text-xs font-medium transition-all border-r border-gray-300 dark:border-gray-600 ${
                form.discountType === 'percent'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              %
            </button>
          </div>

          {/* Computed total (read-only) */}
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-0.5">סה&quot;כ</label>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-2 text-sm text-center font-bold text-blue-600 dark:text-blue-400">
              {finalCost.toFixed(2)} ₪
            </div>
          </div>
        </div>

        {/* Add button (full width) */}
        <button
          type="button"
          onClick={handleAddOrUpdate}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
            editingIndex !== null
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:bg-blue-200'
          }`}
        >
          {editingIndex !== null ? "עדכן מוצר" : "הוסף לרשימה +"}
        </button>
        {editingIndex !== null && (
          <button
            type="button"
            onClick={cancelEdit}
            className="w-full py-2 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ביטול עריכה
          </button>
        )}
      </div>

      {/* ── Import buttons ──────────────────────────────── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowShoppingListModal(true)}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium border-2 border-dashed border-blue-300 dark:border-blue-600 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l1 1 3-3M9 12l1 1 3-3M9 19l1 1 3-3M5 6h.01M5 13h.01M5 20h.01" />
          </svg>
          מרשימת קניות
        </button>
        <button
          type="button"
          onClick={() => setShowReceiptImport(true)}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium border-2 border-dashed border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          ייבוא חשבונית
        </button>
      </div>

      {/* ── Product list ────────────────────────────────── */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2 pb-24">
          {/* List header */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              רשימת מוצרים
            </h3>
            <span className="text-xs text-gray-400">
              {items.length} מוצרים
            </span>
          </div>

          {items.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              onClick={() => handleEdit(index)}
              className={`bg-white dark:bg-gray-800 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                deletingIndex === index
                  ? 'animate-item-fade-out'
                  : animatingItemIndex === index
                    ? 'animate-slide-in-right'
                    : ''
              } ${
                editingIndex === index
                  ? 'border-blue-400 dark:border-blue-500 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                {/* Right: name + detail */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-white text-sm block truncate">
                    {item.name}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {item.quantity} {item.unit === 'קג' ? 'ק"ג' : item.unit === 'גרם' ? 'גרם' : 'יח\''} × {item.unitPrice.toFixed(2)} ₪
                  </span>
                </div>

                {/* Left: total + discount badge + delete */}
                <div className="flex items-center gap-2 mr-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {item.finalCost.toFixed(2)}₪
                    </span>
                    {item.discountType && item.discountValue > 0 && (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full mt-0.5">
                        -{item.discountType === 'percent' ? `${item.discountValue}%` : `${item.discountValue}₪`}
                      </span>
                    )}
                  </div>
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
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-6">
          הוסף מוצרים כדי לבנות את החשבונית
        </div>
      )}

      {/* ── Fixed bottom summary bar ────────────────────── */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <div className="max-w-[430px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">סה&quot;כ לתשלום</span>
              <span className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight">
                {invoiceTotal.toFixed(2)}₪
              </span>
            </div>
            <button
              type="button"
              onClick={handleSaveReceipt}
              disabled={saving}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-colors ${
                saving
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              }`}
            >
              {saving ? "שומר..." : "שמור חשבונית"}
            </button>
          </div>
        </div>
      )}

      {/* Shopping list modal */}
      <ShoppingListModal
        open={showShoppingListModal}
        onClose={() => setShowShoppingListModal(false)}
        onAdd={handleShoppingListAdd}
      />

      {/* Receipt import modal */}
      <ReceiptImport
        open={showReceiptImport}
        onClose={() => setShowReceiptImport(false)}
        onImport={handleReceiptImport}
      />
    </div>
  );
}
