"use client";

import { useState, useEffect } from "react";

interface ShoppingItem {
  id: string;
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
}

interface SelectedItem {
  product_name: string;
  category: string;
  quantity: number;
  unit: string;
  avgPrice: number | null;
}

interface ShoppingListModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (items: SelectedItem[]) => void;
}

export default function ShoppingListModal({ open, onClose, onAdd }: ShoppingListModalProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    fetchItems();
  }, [open]);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/shopping-list");
      const data = await res.json();
      const list: ShoppingItem[] = data.items || [];
      setItems(list);

      // Fetch avg prices for all items
      const prices: Record<string, number | null> = {};
      await Promise.all(
        list.map(async (item) => {
          try {
            const r = await fetch(`/api/products/search?q=${encodeURIComponent(item.product_name)}`);
            const d = await r.json();
            const match = d.products?.find((p: { name: string }) => p.name === item.product_name);
            prices[item.product_name] = match?.avg_price ?? null;
          } catch {
            prices[item.product_name] = null;
          }
        })
      );
      setPriceMap(prices);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  }

  function handleAdd() {
    const selectedItems: SelectedItem[] = items
      .filter(i => selected.has(i.id))
      .map(i => ({
        product_name: i.product_name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        avgPrice: priceMap[i.product_name] ?? null,
      }));
    onAdd(selectedItems);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] max-h-[70vh] bg-white dark:bg-gray-800 rounded-t-2xl flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            הוסף מרשימת קניות
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg shimmer" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
              רשימת הקניות ריקה
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Select all */}
              <button
                onClick={toggleAll}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium text-start mb-1"
              >
                {selected.size === items.length ? "בטל הכל" : "בחר הכל"}
              </button>

              {items.map(item => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selected.has(item.id)
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 accent-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                      {item.product_name}
                    </div>
                    <div className="text-xs text-gray-400 flex gap-2">
                      <span>{item.quantity} {item.unit}</span>
                      {priceMap[item.product_name] != null && (
                        <span>~ {priceMap[item.product_name]!.toFixed(2)}₪</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleAdd}
              disabled={selected.size === 0}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
                selected.size > 0
                  ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              הוסף {selected.size > 0 ? `${selected.size} מוצרים` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
