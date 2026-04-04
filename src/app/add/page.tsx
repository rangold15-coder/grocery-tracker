"use client";

import { useState } from "react";
import Link from "next/link";
import ManualEntry from "@/components/ManualEntry";
import BudgetSettingsModal from "@/components/BudgetSettingsModal";

export default function AddPage() {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [currentBudgetLimit, setCurrentBudgetLimit] = useState(0);
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-surface)] flex flex-col items-center justify-center px-4">
        <div className="text-center animate-scale-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">החשבונית נשמרה!</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">המוצרים נוספו להיסטוריה ולמזווה</p>
          <div className="flex flex-col gap-3 w-full max-w-[280px] mx-auto">
            <button
              onClick={() => setSaved(false)}
              className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
            >
              חשבונית נוספת
            </button>
            <Link
              href="/"
              className="w-full py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-[var(--color-text-secondary)] font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center"
            >
              חזרה לדף הראשי
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-surface)] flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="h-14 flex items-center px-4 max-w-[430px] mx-auto w-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-5 h-5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">חזרה</span>
          </Link>
          <h1 className="flex-1 text-center text-base font-bold text-[var(--color-text-primary)] ml-12">
            הזנה ידנית
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-[430px] mx-auto px-4 pb-8 pt-4">
        <ManualEntry onSaved={() => setSaved(true)} />
      </div>

      {showBudgetModal && (
        <BudgetSettingsModal
          currentLimit={currentBudgetLimit}
          onSaved={() => setShowBudgetModal(false)}
          onClose={() => setShowBudgetModal(false)}
        />
      )}
    </div>
  );
}
