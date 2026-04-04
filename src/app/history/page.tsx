"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ReceiptWithItems } from "@/lib/types";
import ReceiptCard from "@/components/ReceiptCard";
import ReceiptDetail from "@/components/ReceiptDetail";
import PageLayout from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/ui";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const PAGE_SIZE = 20;

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

interface GroupedReceipts {
  year: number;
  months: {
    month: number;
    monthName: string;
    receipts: ReceiptWithItems[];
  }[];
}

function groupReceiptsByTime(receipts: ReceiptWithItems[]): GroupedReceipts[] {
  const yearMap = new Map<number, Map<number, ReceiptWithItems[]>>();

  for (const r of receipts) {
    const date = new Date(r.purchase_date);
    const year = date.getFullYear();
    const month = date.getMonth();

    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(r);
  }

  return Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, monthMap]) => ({
      year,
      months: Array.from(monthMap.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, receipts]) => ({
          month,
          monthName: HEBREW_MONTHS[month],
          receipts,
        })),
    }));
}

type TimeFilter = "week" | "month" | "year" | "all";

function getFilterStartDate(filter: TimeFilter): string | null {
  const now = new Date();
  switch (filter) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    }
    case "month": {
      return new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    }
    case "year": {
      return new Date(now.getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0];
    }
    case "all":
      return null;
  }
}

export default function HistoryPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] =
    useState<ReceiptWithItems | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");

  const fetchReceipts = useCallback(async (offset = 0) => {
    const startDate = getFilterStartDate(timeFilter);
    let query = supabase
      .from("receipts")
      .select("*, receipt_items(*)")
      .order("purchase_date", { ascending: false });
    if (startDate) {
      query = query.gte("purchase_date", startDate);
    }
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return [];
    }

    setHasMore((data?.length || 0) === PAGE_SIZE);
    return (data as ReceiptWithItems[]) || [];
  }, [timeFilter]);

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      const data = await fetchReceipts();
      setReceipts(data);
    },
  });

  useEffect(() => {
    fetchReceipts().then((data) => {
      setReceipts(data);
      setLoading(false);
    });
  }, [fetchReceipts]);

  async function loadMore() {
    setLoadingMore(true);
    const more = await fetchReceipts(receipts.length);
    setReceipts((prev) => [...prev, ...more]);
    setLoadingMore(false);
  }

  function handleDeleted() {
    setSelectedReceipt(null);
    setLoading(true);
    fetchReceipts().then((data) => {
      setReceipts(data);
      setLoading(false);
    });
  }

  function handleUpdated() {
    setSelectedReceipt(null);
    setLoading(true);
    fetchReceipts().then((data) => {
      setReceipts(data);
      setLoading(false);
    });
  }

  // Stats based on filtered receipts
  const filteredTotal = receipts.reduce(
    (sum, r) => sum + (r.total_after_discount ?? r.total_amount),
    0
  );
  const filteredCount = receipts.length;
  const filteredAvg = filteredCount > 0 ? filteredTotal / filteredCount : 0;

  const filterLabels: Record<TimeFilter, string> = {
    week: "השבוע",
    month: "החודש",
    year: "השנה",
    all: "סה\"כ",
  };
  const periodLabel = filterLabels[timeFilter];

  // Most expensive category in period
  const categorySums: Record<string, number> = {};
  for (const r of receipts) {
    for (const item of r.receipt_items) {
      categorySums[item.category] =
        (categorySums[item.category] || 0) + item.total_price;
    }
  }
  const topCategory =
    Object.entries(categorySums).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return (
    <PageLayout title="היסטוריה">
      <div className="space-y-4">
        <PullToRefresh {...pullToRefresh} />

        {/* Time filter */}
        <div className="flex gap-2">
          {(["week", "month", "year", "all"] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === filter
                  ? "bg-blue-400 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {{ week: "שבוע", month: "חודש", year: "שנה", all: "הכל" }[filter]}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400" />
            <p className="text-2xl font-bold text-blue-600">
              {filteredTotal.toFixed(0)}&#8362;
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">הוצאות {periodLabel}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400" />
            <p className="text-2xl font-bold text-emerald-600">{filteredCount}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">קניות {periodLabel}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
            <p className="text-2xl font-bold text-amber-600">
              {filteredAvg.toFixed(0)}&#8362;
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">ממוצע לקנייה</p>
          </div>
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-400" />
            <p className="text-lg font-bold text-purple-600 leading-tight">
              {topCategory}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">קטגוריה מובילה</p>
          </div>
        </div>

        {/* Receipts list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-24 rounded bg-gray-200 shimmer" />
                  <div className="h-3 w-16 rounded bg-gray-200 shimmer" />
                </div>
                <div className="h-6 w-20 rounded bg-gray-200 shimmer" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-16 rounded-full bg-gray-200 shimmer" />
                  <div className="h-5 w-20 rounded-full bg-gray-200 shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <EmptyState
            icon="🧾"
            title="עדיין אין חשבוניות"
            description="סרוק את החשבונית הראשונה שלך"
            action={{ label: "התחל עכשיו", onClick: () => router.push("/") }}
          />
        ) : timeFilter === "all" ? (
          <div className="space-y-4">
            {groupReceiptsByTime(receipts).map((yearGroup) => (
              <div key={yearGroup.year} className="space-y-3">
                <h2 className="text-lg font-bold text-gray-800 sticky top-0 bg-[var(--color-bg)] py-2 z-10 border-b border-gray-200">
                  {yearGroup.year}
                </h2>
                {yearGroup.months.map((monthGroup) => (
                  <div key={monthGroup.month} className="space-y-2 pr-2">
                    <h3 className="text-sm font-semibold text-blue-600">
                      {monthGroup.monthName} {yearGroup.year}
                    </h3>
                    {monthGroup.receipts.map((receipt) => (
                      <ReceiptCard
                        key={receipt.id}
                        receipt={receipt}
                        onClick={() => setSelectedReceipt(receipt)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-60"
              >
                {loadingMore ? "טוען..." : "טען עוד"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                onClick={() => setSelectedReceipt(receipt)}
              />
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-blue-600 font-medium hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-60"
              >
                {loadingMore ? "טוען..." : "טען עוד"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Receipt detail modal */}
      {selectedReceipt && (
        <ReceiptDetail
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onDeleted={handleDeleted}
          onUpdated={handleUpdated}
        />
      )}
    </PageLayout>
  );
}
