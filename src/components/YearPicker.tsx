"use client";

interface YearPickerProps {
  year: number;
  onChange: (year: number) => void;
  maxYear?: number;
  minYear?: number;
}

export function YearPicker({
  year,
  onChange,
  maxYear = new Date().getFullYear(),
  minYear = 2020,
}: YearPickerProps) {
  const atMax = year >= maxYear;
  const atMin = year <= minYear;

  return (
    <div className="flex items-center justify-between gap-2 w-full">
      <button
        type="button"
        onClick={() => !atMin && onChange(year - 1)}
        disabled={atMin}
        aria-label="שנה קודמת"
        className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 active:scale-95 transition flex items-center justify-center text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-50"
      >
        &#8594;
      </button>

      <div className="flex-1 text-center">
        <span className="text-base font-semibold text-text-primary">{year}</span>
      </div>

      <button
        type="button"
        onClick={() => !atMax && onChange(year + 1)}
        disabled={atMax}
        aria-label="שנה הבאה"
        className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 active:scale-95 transition flex items-center justify-center text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-50"
      >
        &#8592;
      </button>
    </div>
  );
}
