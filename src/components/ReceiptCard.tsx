"use client";

import { ReceiptWithItems } from "@/lib/types";
import { CategoryBadge } from "@/components/ui";

interface ReceiptCardProps {
  receipt: ReceiptWithItems;
  onClick: () => void;
}

export default function ReceiptCard({ receipt, onClick }: ReceiptCardProps) {
  const categories = [
    ...new Set(receipt.receipt_items.map((item) => item.category)),
  ];
  const visibleCategories = categories.slice(0, 3);
  const extraCount = categories.length - 3;

  const formattedDate = new Date(receipt.purchase_date).toLocaleDateString(
    "he-IL",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-[var(--color-border)] p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-right"
    >
      {/* Top row: store name + date */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-[var(--color-text-primary)] text-base">
          {receipt.store_name}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {formattedDate}
        </span>
      </div>

      {/* Middle row: total + item count */}
      <div className="flex justify-between items-baseline mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-blue-500">
            {(receipt.total_after_discount ?? receipt.total_amount).toFixed(2)} &#8362;
          </span>
          {receipt.total_after_discount != null && receipt.total_after_discount < receipt.total_amount && (
            <>
              <span className="text-sm text-gray-400 line-through">
                {receipt.total_amount.toFixed(2)}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {receipt.discount_type === 'percent'
                  ? `-${receipt.discount_value}%`
                  : `-${receipt.discount_value}₪`}
              </span>
            </>
          )}
        </div>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {receipt.receipt_items.length} פריטים
        </span>
      </div>

      {/* Bottom row: category badges */}
      <div className="flex flex-wrap gap-1.5">
        {visibleCategories.map((cat) => (
          <CategoryBadge key={cat} category={cat} />
        ))}
        {extraCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            +{extraCount}
          </span>
        )}
      </div>

      {/* Units summary */}
      <div className="mt-2 text-xs text-[var(--color-text-muted)]">
        {receipt.receipt_items.length} פריטים • {Math.round(receipt.receipt_items.reduce((sum, i) => sum + i.quantity, 0))} יחידות סה&quot;כ
      </div>
    </button>
  );
}
