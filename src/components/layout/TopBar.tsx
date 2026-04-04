"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4
        transition-all duration-200
        ${scrolled
          ? "bg-[var(--color-bg-base)]/90 backdrop-blur-md shadow-sm border-b border-[var(--color-border)]"
          : "bg-[var(--color-bg-base)]"
        }
      `}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="max-w-[430px] mx-auto w-full flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
          {title}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-input)] transition-colors"
            title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <span className="text-sm text-[var(--color-text-muted)] font-medium">
            גרוסרי
          </span>
        </div>
      </div>
    </header>
  );
}
