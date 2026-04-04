"use client";

import { UNITS, type Unit, getStep, getMin } from "@/lib/units";

interface QuantityInputProps {
  quantity: number;
  unit: Unit;
  onChange: (quantity: number, unit: Unit) => void;
  disabled?: boolean;
}

export function QuantityInput({ quantity, unit, onChange, disabled }: QuantityInputProps) {
  const step = getStep(unit);
  const min = getMin(unit);

  function handleDecrement() {
    const newVal = Math.max(min, +(quantity - step).toFixed(3));
    onChange(newVal, unit);
  }

  function handleIncrement() {
    onChange(+(quantity + step).toFixed(3), unit);
  }

  function handleUnitChange(newUnit: Unit) {
    onChange(1, newUnit);
  }

  function handleInputChange(value: string) {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= min) {
      onChange(+num.toFixed(3), unit);
    }
  }

  return (
    <div dir="ltr" className="inline-flex items-center h-9 border border-[var(--color-border)] rounded-lg overflow-hidden">
      {/* Minus button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || quantity <= min}
        className="w-9 h-9 flex items-center justify-center text-lg font-medium text-gray-600 hover:bg-gray-100 active:bg-blue-100 active:text-blue-600 transition-colors disabled:opacity-30 touch-manipulation"
        style={{ minWidth: 44, minHeight: 44, padding: "4px" }}
      >
        −
      </button>

      {/* Number input */}
      <input
        type="number"
        value={quantity}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={disabled}
        className="w-[60px] h-9 text-center text-sm font-medium border-x border-[var(--color-border)] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        min={min}
        step={step}
      />

      {/* Plus button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled}
        className="w-9 h-9 flex items-center justify-center text-lg font-medium text-gray-600 hover:bg-gray-100 active:bg-blue-100 active:text-blue-600 transition-colors disabled:opacity-30 touch-manipulation"
        style={{ minWidth: 44, minHeight: 44, padding: "4px" }}
      >
        +
      </button>

      {/* Unit dropdown */}
      <select
        value={unit}
        onChange={(e) => handleUnitChange(e.target.value as Unit)}
        disabled={disabled}
        className="h-9 px-2 text-xs font-medium bg-gray-50 border-r-0 border-l border-[var(--color-border)] focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>{u}</option>
        ))}
      </select>
    </div>
  );
}
