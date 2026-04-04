"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const NAV_ITEMS = [
  {
    href: "/",
    label: "ראשי",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    href: "/shopping-list",
    label: "רשימה",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l1 1 3-3M9 12l1 1 3-3M9 19l1 1 3-3M5 6h.01M5 13h.01M5 20h.01" />
      </svg>
    ),
  },
  {
    href: "/recipes",
    label: "מתכונים",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
      </svg>
    ),
  },
  {
    href: "/history",
    label: "היסטוריה",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/insights",
    label: "תובנות",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V13a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0V5a2 2 0 012-2h2a2 2 0 012 2v14" />
      </svg>
    ),
  },
];

const HIDDEN_ROUTES = ["/scan", "/add"];

export default function BottomNav() {
  const pathname = usePathname();
  const [pressed, setPressed] = useState<string | null>(null);
  const { theme } = useTheme();

  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  function handlePress(href: string) {
    setPressed(href);
    setTimeout(() => setPressed(null), 200);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        height: "calc(64px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: theme === "dark" ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid var(--color-border)",
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
      }}
    >
      <div className="h-16 max-w-lg mx-auto flex items-center">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handlePress(item.href)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5 h-full
                transition-all duration-150 ease-out
                ${pressed === item.href ? "scale-[0.88]" : "scale-100"}
                ${isActive ? "text-[var(--color-primary-600)]" : "text-[var(--color-text-muted)]"}
              `}
            >
              <div className="relative">
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[var(--color-primary-600)] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
