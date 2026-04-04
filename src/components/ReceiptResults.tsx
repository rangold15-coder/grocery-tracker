"use client";

import { useState, useCallback } from "react";
import { CategoryBadge } from "@/components/ui";
import { hapticSuccess, hapticError } from "@/lib/haptic";
import { formatQuantity } from "@/lib/units";
import DiscountSection, { DiscountInfo } from "@/components/DiscountSection";

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

interface ReceiptResultsProps {
  storeName: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
  onNewReceipt: () => void;
}

export default function ReceiptResults({
  storeName,
  date,
  totalAmount,
  items: initialItems,
  onNewReceipt,
}: ReceiptResultsProps) {
  const [items, setItems] = useState<ReceiptItem[]>(initialItems);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  const handleDiscountChange = useCallback((discount: DiscountInfo) => {
    setDiscountType(discount.type);
    setDiscountValue(discount.value);
    setFinalTotal(discount.finalTotal);
  }, []);

  function handleEdit(index: number, field: "name" | "totalPrice", value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "totalPrice" ? parseFloat(value) || 0 : value,
            }
          : item
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/save-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          date,
          totalAmount: calculatedTotal,
          items,
          discountType,
          discountValue: discountType ? discountValue : null,
          totalAfterDiscount: discountType ? finalTotal : null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "שגיאה לא ידועה");
      }

      hapticSuccess();
      setSaved(true);
    } catch (err: unknown) {
      hapticError();
      const message = err instanceof Error ? err.message : "שגיאה לא ידועה";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const calculatedTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header - store info */}
      <div className="bg-blue-400 text-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-xl font-bold">{storeName}</h2>
        <div className="flex justify-between mt-2 text-blue-100">
          <span>{date}</span>
          <span className="font-bold text-white text-lg">
            {totalAmount.toFixed(2)} &#8362;
          </span>
        </div>
      </div>

      {/* Items as cards */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            onClick={() => setEditingIndex(index)}
            className="bg-white rounded-xl border border-[var(--color-border)] p-3 cursor-pointer hover:shadow-sm transition-all animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CategoryBadge category={item.category} />
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleEdit(index, "name", e.target.value)}
                    className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {item.name}
                  </span>
                )}
              </div>
              <div className="text-left flex-shrink-0">
                {editingIndex === index ? (
                  <input
                    type="number"
                    value={item.totalPrice}
                    onChange={(e) => handleEdit(index, "totalPrice", e.target.value)}
                    className="w-20 border border-blue-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                    step="0.01"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-sm font-bold text-blue-600">
                    {item.totalPrice.toFixed(2)} &#8362;
                  </span>
                )}
              </div>
            </div>
            {editingIndex !== index && (
              <div className="flex gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                <span>{formatQuantity(item.quantity, item.unit || 'יחידות')}</span>
                <span>מחיר: {item.unitPrice.toFixed(2)} &#8362;</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total (without discount) */}
      {!discountType && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[var(--color-border)] p-4 flex justify-between items-center">
          <span className="font-bold text-[var(--color-text-primary)]">סה&quot;כ</span>
          <span className="text-xl font-bold text-blue-600">
            {calculatedTotal.toFixed(2)} &#8362;
          </span>
        </div>
      )}

      {/* Discount section */}
      <DiscountSection subtotal={calculatedTotal} onDiscountChange={handleDiscountChange} />

      <p className="text-xs text-[var(--color-text-muted)] text-center">
        לחץ על שורה כדי לערוך
      </p>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Action buttons - sticky */}
      <div className="sticky bottom-24 flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full py-3.5 rounded-xl text-lg font-medium transition-all duration-200 ${
            saved
              ? "bg-emerald-500 text-white scale-[0.98]"
              : "bg-blue-400 text-white hover:bg-blue-500 active:scale-[0.97]"
          } disabled:opacity-60`}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              שומר...
            </span>
          ) : saved ? (
            "✓ נשמר בהצלחה!"
          ) : (
            "אשר ושמור"
          )}
        </button>

        <button
          onClick={onNewReceipt}
          className="w-full border-2 border-blue-400 text-blue-600 py-3 rounded-xl text-base font-medium hover:bg-blue-50 transition-colors"
        >
          חשבונית חדשה
        </button>
      </div>
    </div>
  );
}
