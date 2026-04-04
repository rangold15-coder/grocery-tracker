"use client";

import { useState } from "react";
import { ReceiptWithItems, ReceiptItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { formatQuantity } from "@/lib/units";
import { useToast } from "@/components/ui/Toast";

interface ReceiptDetailProps {
  receipt: ReceiptWithItems;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated?: () => void;
}

interface EditItem {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  category: string;
  discountType: 'percent' | 'fixed' | null;
  discountValue: string;
}

const UNIT_OPTIONS = [
  { label: 'יחידות', value: 'יחידות' },
  { label: 'ק"ג', value: 'קג' },
  { label: 'גרם', value: 'גרם' },
];

export default function ReceiptDetail({
  receipt,
  onClose,
  onDeleted,
  onUpdated,
}: ReceiptDetailProps) {
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStoreName, setEditStoreName] = useState(receipt.store_name);
  const [editDate, setEditDate] = useState(receipt.purchase_date);
  const [editItems, setEditItems] = useState<EditItem[]>(() =>
    receipt.receipt_items.map(item => ({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit || 'יחידות',
      unitPrice: String(item.unit_price),
      category: item.category,
      discountType: item.discount_type || null,
      discountValue: item.discount_value ? String(item.discount_value) : '',
    }))
  );

  // Group items by category (view mode)
  const grouped: Record<string, ReceiptItem[]> = {};
  for (const item of receipt.receipt_items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  // Recalculate total from items to avoid floating-point rounding issues
  const computedTotal = Math.round(
    receipt.receipt_items.reduce((sum, item) => sum + Math.round(item.total_price * 100) / 100, 0) * 100
  ) / 100;

  const formattedDate = new Date(receipt.purchase_date).toLocaleDateString(
    "he-IL",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Edit helpers
  function updateEditItem(index: number, field: keyof EditItem, value: string) {
    setEditItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  }

  function removeEditItem(index: number) {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  }

  function getItemFinalCost(item: EditItem) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const raw = qty * price;
    const disc = parseFloat(item.discountValue) || 0;
    if (item.discountType === 'percent') return Math.round(Math.max(raw - raw * (Math.min(disc, 100) / 100), 0) * 100) / 100;
    if (item.discountType === 'fixed') return Math.round(Math.max(raw - Math.min(disc, raw), 0) * 100) / 100;
    return Math.round(raw * 100) / 100;
  }

  function getEditTotal() {
    return Math.round(editItems.reduce((sum, item) => sum + getItemFinalCost(item), 0) * 100) / 100;
  }

  function startEditing() {
    setEditing(true);
    setEditStoreName(receipt.store_name);
    setEditDate(receipt.purchase_date);
    setEditItems(
      receipt.receipt_items.map(item => ({
        name: item.name,
        quantity: String(item.quantity),
        unit: item.unit || 'יחידות',
        unitPrice: String(item.unit_price),
        category: item.category,
        discountType: item.discount_type || null,
        discountValue: item.discount_value ? String(item.discount_value) : '',
      }))
    );
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function handleSaveEdit() {
    if (!editStoreName.trim()) {
      showToast({ type: "error", message: "הכנס שם חנות" });
      return;
    }
    if (editItems.length === 0) {
      showToast({ type: "error", message: "חייב להיות לפחות מוצר אחד" });
      return;
    }

    setSaving(true);
    try {
      const totalAmount = getEditTotal();
      const res = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: editStoreName.trim(),
          date: editDate,
          totalAmount,
          items: editItems.map(item => ({
            name: item.name,
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit,
            unitPrice: parseFloat(item.unitPrice) || 0,
            totalPrice: getItemFinalCost(item),
            category: item.category,
            discountType: item.discountType,
            discountValue: parseFloat(item.discountValue) || 0,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast({ type: "error", message: data.error || "שגיאה בעדכון" });
        return;
      }

      showToast({ type: "success", message: "החשבונית עודכנה בהצלחה" });
      setEditing(false);
      onUpdated?.();
    } catch {
      showToast({ type: "error", message: "שגיאה בעדכון החשבונית" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);

    // 1. Get the items before deleting so we can clean up products & pantry
    const { data: items } = await supabase
      .from("receipt_items")
      .select("name, quantity")
      .eq("receipt_id", receipt.id);

    // 2. Delete receipt_items and receipt
    await supabase.from("receipt_items").delete().eq("receipt_id", receipt.id);
    await supabase.from("receipts").delete().eq("id", receipt.id);

    // 3. Clean up products and pantry for each deleted item
    if (items && items.length > 0) {
      for (const item of items) {
        // Check if this product has any remaining receipt_items
        const { count } = await supabase
          .from("receipt_items")
          .select("id", { count: "exact", head: true })
          .eq("name", item.name);

        if (count === 0) {
          // No more purchases — remove product entirely
          await supabase.from("products").delete().eq("name", item.name);
        } else {
          // Recalculate product stats from remaining receipt_items
          const { data: remaining } = await supabase
            .from("receipt_items")
            .select("unit_price, quantity, created_at, receipts(purchase_date)")
            .eq("name", item.name)
            .order("created_at", { ascending: false });

          if (remaining && remaining.length > 0) {
            const totalQty = remaining.reduce((sum, r) => sum + r.quantity, 0);
            const avgPrice =
              Math.round(
                (remaining.reduce((sum, r) => sum + r.unit_price * r.quantity, 0) /
                  totalQty) *
                  100
              ) / 100;
            const lastReceipt = remaining[0].receipts as unknown as { purchase_date: string } | null;
            const lastPurchased = lastReceipt?.purchase_date || remaining[0].created_at.split("T")[0];

            await supabase
              .from("products")
              .update({
                avg_price: avgPrice,
                purchase_count: totalQty,
                last_purchased: lastPurchased,
              })
              .eq("name", item.name);
          }
        }

        // Reduce pantry quantity (handle multiple entries)
        const { data: pantryItems } = await supabase
          .from("pantry")
          .select("id, quantity")
          .eq("product_name", item.name)
          .eq("is_finished", false);

        if (pantryItems && pantryItems.length > 0) {
          let qtyToRemove = item.quantity;
          for (const pantryItem of pantryItems) {
            if (qtyToRemove <= 0) break;
            const newQty = pantryItem.quantity - qtyToRemove;
            if (newQty <= 0) {
              await supabase.from("pantry").delete().eq("id", pantryItem.id);
              qtyToRemove = -newQty; // carry over excess
            } else {
              await supabase
                .from("pantry")
                .update({ quantity: newQty })
                .eq("id", pantryItem.id);
              qtyToRemove = 0;
            }
          }
        }
      }
    }

    setDeleting(false);
    onDeleted();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[var(--color-bg-card)] w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-400 text-white p-4 flex justify-between items-start">
          <div>
            {editing ? (
              <input
                type="text"
                value={editStoreName}
                onChange={e => setEditStoreName(e.target.value)}
                className="text-xl font-bold bg-blue-500/50 rounded-lg px-2 py-1 text-white placeholder:text-blue-200 w-full focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            ) : (
              <h2 className="text-xl font-bold">{receipt.store_name}</h2>
            )}
            {editing ? (
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="mt-1 text-sm bg-blue-500/50 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            ) : (
              <p className="text-blue-100 text-sm">{formattedDate}</p>
            )}
          </div>
          <div className="text-left">
            {editing ? (
              <span className="text-2xl font-bold">
                {getEditTotal().toFixed(2)} &#8362;
              </span>
            ) : receipt.total_after_discount != null && receipt.total_after_discount < computedTotal ? (
              <div className="flex flex-col items-end">
                <span className="text-sm text-blue-200 line-through">
                  {computedTotal.toFixed(2)} &#8362;
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-blue-300/30 text-blue-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {receipt.discount_type === 'percent'
                      ? `-${receipt.discount_value}%`
                      : `-${receipt.discount_value}₪`}
                  </span>
                  <span className="text-2xl font-bold">
                    {receipt.total_after_discount.toFixed(2)} &#8362;
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-2xl font-bold">
                {computedTotal.toFixed(2)} &#8362;
              </span>
            )}
            <button
              onClick={onClose}
              className="block mt-1 text-blue-200 hover:text-white text-sm"
            >
              סגור &times;
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editing ? (
            /* ── Edit mode ────────────────────────────── */
            <div className="space-y-2">
              {editItems.map((item, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => updateEditItem(index, 'name', e.target.value)}
                      className="font-medium text-sm bg-transparent border-b border-gray-300 dark:border-gray-500 focus:border-blue-400 focus:outline-none flex-1 ml-2 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => removeEditItem(index)}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">כמות</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={e => updateEditItem(index, 'quantity', e.target.value.replace(/-/g, ''))}
                        min="0"
                        step="0.01"
                        dir="ltr"
                        className="w-full border border-gray-300 dark:border-gray-500 rounded px-2 py-1 text-sm text-center bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">יחידה</label>
                      <select
                        value={item.unit}
                        onChange={e => updateEditItem(index, 'unit', e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-500 rounded px-1 py-1 text-sm bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {UNIT_OPTIONS.map(u => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">מחיר (₪)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={e => updateEditItem(index, 'unitPrice', e.target.value.replace(/-/g, ''))}
                        min="0"
                        step="0.01"
                        dir="ltr"
                        className="w-full border border-gray-300 dark:border-gray-500 rounded px-2 py-1 text-sm text-center bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  {/* Discount row */}
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">הנחה:</span>
                    <button
                      type="button"
                      onClick={() => updateEditItem(index, 'discountType', item.discountType === 'percent' ? '' : 'percent')}
                      className={`py-1 px-2 rounded text-[10px] font-medium transition-all ${
                        item.discountType === 'percent'
                          ? 'bg-blue-400 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEditItem(index, 'discountType', item.discountType === 'fixed' ? '' : 'fixed')}
                      className={`py-1 px-2 rounded text-[10px] font-medium transition-all ${
                        item.discountType === 'fixed'
                          ? 'bg-blue-400 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      ₪
                    </button>
                    {item.discountType && (
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.discountValue}
                        onChange={e => updateEditItem(index, 'discountValue', e.target.value.replace(/-/g, ''))}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        className="w-16 border border-gray-300 dark:border-gray-500 rounded px-2 py-1 text-[11px] text-center bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                  </div>
                  <div className="text-left text-xs text-blue-600 dark:text-blue-400 font-bold">
                    {getItemFinalCost(item).toFixed(2)}₪
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── View mode ────────────────────────────── */
            Object.entries(grouped).map(([category, items]) => {
              const categoryTotal = Math.round(items.reduce((sum, item) => sum + Math.round(item.total_price * 100) / 100, 0) * 100) / 100;
              return (
                <div key={category}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800">{category}</h3>
                    <span className="text-sm font-medium text-blue-600">
                      {categoryTotal.toFixed(2)} &#8362;
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center px-3 py-2 text-sm gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-gray-900 truncate">{item.name}</span>
                          <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                            {formatQuantity(item.quantity, item.unit || 'יחידות')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-gray-400 text-xs">
                            {item.unit_price.toFixed(2)} &#8362;
                          </span>
                          <span className="text-blue-600 font-bold">
                            {item.total_price.toFixed(2)} &#8362;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-border)] space-y-2">
          {editing ? (
            /* Edit mode buttons */
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl font-medium hover:bg-blue-600 disabled:opacity-60 transition-colors"
              >
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
              <button
                onClick={cancelEditing}
                className="flex-1 border border-gray-300 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                ביטול
              </button>
            </div>
          ) : (
            /* View mode buttons */
            <>
              <button
                onClick={startEditing}
                className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                ערוך חשבונית
              </button>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleting ? "מוחק..." : "כן, מחק לצמיתות"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50"
                  >
                    ביטול
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-red-500 hover:text-red-700 text-sm py-2"
                >
                  מחק חשבונית
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
