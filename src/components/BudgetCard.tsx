"use client";

import { useState, useEffect } from "react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface BudgetData {
  monthly_limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "ok" | "warning" | "exceeded";
  month_label: string;
}

interface BudgetCardProps {
  onEditBudget: (currentLimit: number) => void;
  refreshKey?: number;
}

export default function BudgetCard({ onEditBudget, refreshKey }: BudgetCardProps) {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBudget() {
      try {
        const res = await fetch("/api/budget");
        const data = await res.json();
        if (data.success) {
          setBudget(data.budget);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    fetchBudget();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
        <div className="h-4 w-32 bg-gray-200 rounded shimmer mb-3" />
        <div className="h-3 w-full bg-gray-100 rounded-full" />
      </div>
    );
  }

  if (!budget) return null;

  // Not configured — show setup prompt
  if (budget.monthly_limit === 0) {
    return (
      <button
        onClick={() => onEditBudget(0)}
        className="w-full bg-gradient-to-l from-blue-50 to-emerald-50 rounded-2xl border border-blue-200 p-4 text-right hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="text-sm font-medium text-gray-800">הגדר תקציב חודשי</p>
            <p className="text-xs text-gray-500">
              עקוב אחרי ההוצאות שלך והישאר במסגרת התקציב
            </p>
          </div>
        </div>
      </button>
    );
  }

  // Configured — show progress
  const statusColors = {
    ok: { bar: "bg-emerald-400", text: "text-emerald-600", border: "border-emerald-200", accent: "bg-emerald-400" },
    warning: { bar: "bg-amber-400", text: "text-amber-600", border: "border-amber-200", accent: "bg-amber-400" },
    exceeded: { bar: "bg-red-400", text: "text-red-500", border: "border-red-200", accent: "bg-red-400" },
  };

  const colors = statusColors[budget.status];

  return (
    <div className={`bg-white rounded-2xl border ${colors.border} p-4 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors.accent}`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">
            {budget.month_label}
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            budget.status === "exceeded"
              ? "bg-red-100 text-red-600"
              : budget.status === "warning"
                ? "bg-amber-100 text-amber-600"
                : "bg-emerald-100 text-emerald-600"
          }`}>
            {budget.percentage}%
          </span>
        </div>
        <button
          onClick={() => onEditBudget(budget.monthly_limit)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="ערוך תקציב"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      {/* Spent / Limit */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-xl font-bold ${colors.text}`}>
          {fmt(budget.spent)}&#8362;
        </span>
        <span className="text-sm text-gray-400">
          מתוך {fmt(budget.monthly_limit)}&#8362;
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
          style={{ width: `${Math.min(budget.percentage, 100)}%` }}
        />
      </div>

      {/* Remaining text */}
      <p className="text-xs text-gray-500">
        {budget.status === "exceeded" ? (
          <span className="text-red-500 font-medium">
            חריגה של {fmt(Math.abs(budget.remaining))}&#8362;
          </span>
        ) : budget.status === "warning" ? (
          <span className="text-amber-600 font-medium">
            נותרו רק {fmt(budget.remaining)}&#8362; — כדאי לשים לב
          </span>
        ) : (
          <>נותרו {fmt(budget.remaining)}&#8362;</>
        )}
      </p>
    </div>
  );
}
