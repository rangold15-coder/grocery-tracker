"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function QuickActions() {
  const [listCount, setListCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from("shopping_list")
        .select("*", { count: "exact", head: true })
        .eq("is_checked", false);
      setListCount(count || 0);
    }
    fetchCount();
  }, []);

  const actions = [
    {
      href: "/shopping-list",
      label: "רשימת קניות",
      badge: listCount > 0 ? String(listCount) : null,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l1 1 3-3M9 12l1 1 3-3M9 19l1 1 3-3M5 6h.01M5 13h.01M5 20h.01" />
        </svg>
      ),
      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      href: "/pantry",
      label: "המזווה",
      badge: null,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      href: "/insights",
      label: "השוואת מחירים",
      badge: null,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">גישה מהירה</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-md active:scale-[0.96] transition-all"
          >
            <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center ${action.color}`}>
              {action.icon}
              {action.badge && (
                <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {action.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] text-center leading-tight">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
