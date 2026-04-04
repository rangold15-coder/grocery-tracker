"use client";

import { useState } from "react";

interface BudgetSettingsModalProps {
  currentLimit: number;
  onSaved: () => void;
  onClose: () => void;
}

export default function BudgetSettingsModal({
  currentLimit,
  onSaved,
  onClose,
}: BudgetSettingsModalProps) {
  const [limit, setLimit] = useState(currentLimit > 0 ? String(currentLimit) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const value = parseFloat(limit);
    if (isNaN(value) || value < 0) {
      setError("הכנס סכום תקף (0 או יותר)");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_limit: value }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error || "שגיאה בשמירה");
      }
    } catch {
      setError("שגיאה בשמירה");
    }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-800 mb-1">תקציב חודשי</h2>
        <p className="text-sm text-gray-500 mb-4">
          הגדר סכום מקסימלי להוצאות חודשיות
        </p>

        <div className="relative mb-3">
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="למשל: 2000"
            min="0"
            step="100"
            dir="ltr"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            &#8362;
          </span>
        </div>

        {error && (
          <p className="text-red-500 text-xs mb-3">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-400 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {saving ? "שומר..." : "שמור"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
