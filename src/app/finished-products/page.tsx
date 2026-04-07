"use client";

import { useState, useEffect, useCallback } from "react";
import PageLayout from "@/components/layout/PageLayout";

interface FinishedItem {
  id: string;
  product_name: string;
  category: string;
  quantity: number;
  finished_at: string;
}

const THRESHOLD_OPTIONS = [
  { label: "שבוע", days: 7 },
  { label: "שבועיים", days: 14 },
  { label: "חודש", days: 30 },
  { label: "חודשיים", days: 60 },
  { label: "3 חודשים", days: 90 },
];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function FinishedProductsPage() {
  const [items, setItems] = useState<FinishedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(30);

  useEffect(() => {
    const saved = localStorage.getItem("finished-threshold");
    if (saved) setThreshold(Number(saved));
  }, []);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/finished-products");
    const data = await res.json();
    if (data.success) {
      setItems(data.items);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await fetchItems();
      setLoading(false);
    }
    init();
  }, [fetchItems]);

  function handleThresholdChange(days: number) {
    setThreshold(days);
    localStorage.setItem("finished-threshold", String(days));
  }

  async function handleReturnToPantry(id: string) {
    setFadingOut((prev) => new Set(prev).add(id));

    await fetch("/api/finished-products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setFadingOut((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את המוצר לצמיתות?")) return;

    setFadingOut((prev) => new Set(prev).add(id));

    await fetch("/api/finished-products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setFadingOut((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }

  return (
    <PageLayout title="מוצרים שנגמרו">
      <div className="space-y-4">
        {/* Threshold selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500 font-medium">סף התראה:</span>
          <div className="flex gap-1.5 flex-wrap">
            {THRESHOLD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => handleThresholdChange(opt.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  threshold === opt.days
                    ? "bg-blue-400 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען מוצרים...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-600 text-lg font-medium mb-1">
              אין מוצרים שנגמרו
            </p>
            <p className="text-gray-400 text-sm">
              כשמוצר נגמר מהמזווה, הוא יופיע כאן
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const days = daysSince(item.finished_at);
              const isOld = days >= threshold;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border border-gray-200 p-3 transition-all duration-400 ${
                    fadingOut.has(item.id)
                      ? "opacity-0 translate-x-4 scale-95"
                      : "opacity-100"
                  } ${isOld ? "border-r-4 border-r-amber-400" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isOld && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-amber-500 shrink-0"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        )}
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {item.product_name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        כמות אחרונה:{" "}
                        {Number.isInteger(item.quantity)
                          ? `${item.quantity} יח׳`
                          : `${item.quantity.toFixed(2)} ק״ג`}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          isOld ? "text-amber-600 font-medium" : "text-gray-400"
                        }`}
                      >
                        ברשימה {days} ימים
                      </p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleReturnToPantry(item.id)}
                        disabled={fadingOut.has(item.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                      >
                        החזר למזווה
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={fadingOut.has(item.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        לא רלוונטי
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
