"use client";

import { useState, useRef, type ReactNode, type MouseEvent } from "react";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  success?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

const VARIANT_STYLES = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
  secondary: "bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100",
  ghost: "bg-transparent text-text-secondary hover:bg-bg-surface",
  danger: "bg-danger/10 text-danger hover:bg-danger/20",
};

const SIZE_STYLES = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  success = false,
  fullWidth = false,
  disabled = false,
  children,
  onClick,
}: ButtonProps) {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);
  const [pressed, setPressed] = useState(false);
  const nextId = useRef(0);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (loading || disabled) return;

    // Ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = nextId.current++;
    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);

    // Press animation
    setPressed(true);
    setTimeout(() => setPressed(false), 150);

    onClick?.(e);
  }

  const showSuccess = success && !loading;

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden font-medium transition-all duration-150 ease-out
        inline-flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${fullWidth ? "w-full" : ""}
        ${pressed ? "scale-[0.96]" : "scale-100"}
      `}
    >
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-[ripple_600ms_ease-out_forwards] pointer-events-none"
          style={{
            left: ripple.x - 50,
            top: ripple.y - 50,
            width: 100,
            height: 100,
          }}
        />
      ))}

      {/* Content */}
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : showSuccess ? (
        <span className="animate-scale-in text-green-500">&#10003;</span>
      ) : (
        children
      )}
    </button>
  );
}
