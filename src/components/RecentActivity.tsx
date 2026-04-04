"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface RecentReceipt {
  id: string;
  store_name: string;
  purchase_date: string;
  total_amount: number;
  total_after_discount: number | null;
}

export default function RecentActivity() {
  const [receipts, setReceipts] = useState<RecentReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      const { data } = await supabase
        .from("receipts")
        .select("id, store_name, purchase_date, total_amount, total_after_discount")
        .order("purchase_date", { ascending: false })
        .limit(3);
      setReceipts(data || []);
      setLoading(false);
    }
    fetchRecent();
  }, []);

  if (loading) {
    return (
      <div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">פעילות אחרונה</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">פעילות אחרונה</h3>
        <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
          <p>עדיין אין קבלות</p>
          <p className="text-xs mt-1">סרוק קבלה ראשונה כדי להתחיל</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">פעילות אחרונה</h3>
        <Link href="/history" className="text-xs text-[var(--color-primary-600)] font-medium">
          הצג הכל
        </Link>
      </div>
      <div className="space-y-2">
        {receipts.map((receipt) => {
          const total = receipt.total_after_discount ?? receipt.total_amount;
          return (
            <div
              key={receipt.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4.5 h-4.5 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{receipt.store_name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(new Date(receipt.purchase_date), "d בMMMM", { locale: he })}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-[var(--color-primary-600)] whitespace-nowrap mr-2">
                {total.toFixed(2)}₪
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
