"use client";

import { useState, useEffect } from "react";

export interface DiscountInfo {
  type: 'percent' | 'fixed' | null;
  value: number;
  finalTotal: number;
}

interface DiscountSectionProps {
  subtotal: number;
  onDiscountChange: (discount: DiscountInfo) => void;
}

export default function DiscountSection({ subtotal, onDiscountChange }: DiscountSectionProps) {
  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | null>(null);
  const [discountValue, setDiscountValue] = useState("");

  const numericValue = parseFloat(discountValue) || 0;

  // חישוב הנחה
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = subtotal * (Math.min(numericValue, 100) / 100);
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(numericValue, subtotal);
  }
  const finalTotal = Math.max(subtotal - discountAmount, 0);

  const isOverLimit = discountType === 'fixed' && numericValue > subtotal;

  useEffect(() => {
    onDiscountChange({
      type: discountType,
      value: numericValue,
      finalTotal,
    });
  }, [discountType, numericValue, finalTotal, onDiscountChange]);

  function handleToggle(type: 'percent' | 'fixed') {
    if (discountType === type) {
      setDiscountType(null);
      setDiscountValue("");
    } else {
      setDiscountType(type);
      setDiscountValue("");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* כפתורי בחירת סוג הנחה */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleToggle('percent')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            discountType === 'percent'
              ? 'bg-blue-400 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          הנחה באחוזים (%)
        </button>
        <button
          type="button"
          onClick={() => handleToggle('fixed')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
            discountType === 'fixed'
              ? 'bg-blue-400 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          הנחה בשקלים (&#8362;)
        </button>
      </div>

      {/* שדה הזנת הנחה */}
      {discountType && (
        <div className="animate-fade-in-up">
          <div className="relative">
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? "0" : "0.00"}
              min="0"
              max={discountType === 'percent' ? "100" : undefined}
              step={discountType === 'percent' ? "1" : "0.01"}
              dir="ltr"
              className={`w-full border rounded-xl px-4 py-3 text-lg text-center font-medium focus:outline-none focus:ring-2 transition-colors ${
                isOverLimit
                  ? 'border-red-300 focus:ring-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 focus:ring-blue-400 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white'
              }`}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
              {discountType === 'percent' ? '%' : '₪'}
            </span>
          </div>
          {isOverLimit && (
            <p className="text-red-500 text-xs mt-1">
              ההנחה לא יכולה להיות גדולה מהסה&quot;כ ({subtotal.toFixed(2)} &#8362;)
            </p>
          )}
        </div>
      )}

      {/* תצוגת סיכום הנחה */}
      {discountType && numericValue > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 animate-fade-in-up">
          <div className="flex justify-between items-center text-sm text-[var(--color-text-secondary)]">
            <span>סה&quot;כ לפני הנחה</span>
            <span>{subtotal.toFixed(2)} &#8362;</span>
          </div>
          <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400 mt-1">
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              הנחה {discountType === 'percent' ? `(${numericValue}%)` : ''}
            </span>
            <span>-{discountAmount.toFixed(2)} &#8362;</span>
          </div>
          <div className="border-t border-blue-200 dark:border-blue-700 mt-3 pt-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[var(--color-text-primary)]">סה&quot;כ סופי</span>
              <span
                className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-all duration-300"
              >
                {finalTotal.toFixed(2)} &#8362;
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
