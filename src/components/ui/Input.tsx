"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  rightIcon?: ReactNode;
  leftIcon?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  rightIcon,
  leftIcon,
  value,
  onFocus,
  onBlur,
  className,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== "";
  const floated = focused || hasValue;

  return (
    <div className={`relative ${className || ""}`}>
      {/* Input wrapper */}
      <div
        className={`
          relative flex items-center transition-all duration-200
          ${focused
            ? "border border-[var(--color-border-focus)] rounded-xl"
            : "border-b border-[var(--color-border)]"
          }
          ${error ? "border-red-400" : ""}
        `}
      >
        {rightIcon && (
          <span className="pr-3 text-[var(--color-text-muted)]">{rightIcon}</span>
        )}

        <div className="relative flex-1">
          {label && (
            <label
              className={`
                absolute right-0 transition-all duration-200 pointer-events-none
                ${floated
                  ? "-top-2.5 text-[10px] font-medium text-[var(--color-border-focus)]"
                  : "top-3 text-sm text-[var(--color-text-muted)]"
                }
                ${error ? "text-red-400" : ""}
              `}
            >
              {label}
            </label>
          )}
          <input
            value={value}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={`
              w-full py-3 bg-transparent outline-none text-sm
              text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]
              ${label ? "pt-4" : ""}
            `}
            {...props}
          />
        </div>

        {leftIcon && (
          <span className="pl-3 text-[var(--color-text-muted)]">{leftIcon}</span>
        )}
      </div>

      {/* Error / Hint */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
    </div>
  );
}
