"use client";

import { HEBREW_MONTHS } from "@/lib/export/hebrew-months";

interface MonthPickerProps {
  month: number; // 1-12
  year: number;
  onChange: (month: number, year: number) => void;
  maxMonth?: { month: number; year: number };
}

function compare(
  a: { month: number; year: number },
  b: { month: number; year: number }
): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function MonthPicker({
  month,
  year,
  onChange,
  maxMonth,
}: MonthPickerProps) {
  const now = new Date();
  const effectiveMax = maxMonth ?? {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };

  const current = { month, year };
  const atMax = compare(current, effectiveMax) >= 0;

  function goPrev() {
    if (month === 1) onChange(12, year - 1);
    else onChange(month - 1, year);
  }

  function goNext() {
    if (atMax) return;
    if (month === 12) onChange(1, year + 1);
    else onChange(month + 1, year);
  }

  const label = `${HEBREW_MONTHS[month - 1]} ${year}`;

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      {/* In RTL, the arrow visually on the right points to "older" (prev) */}
      <button
        type="button"
        onClick={goPrev}
        aria-label="חודש קודם"
        className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 active:scale-95 transition flex items-center justify-center text-lg font-bold"
      >
        &#8594;
      </button>

      <div className="flex-1 text-center">
        <span className="text-base font-semibold text-text-primary">
          {label}
        </span>
      </div>

      <button
        type="button"
        onClick={goNext}
        disabled={atMax}
        aria-label="חודש הבא"
        className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 active:scale-95 transition flex items-center justify-center text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-50"
      >
        &#8592;
      </button>
    </div>
  );
}
