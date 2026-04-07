"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { MonthPicker } from "./MonthPicker";
import { YearPicker } from "./YearPicker";
import { ReportChart } from "./ReportChart";
import { HEBREW_MONTHS } from "@/lib/export/hebrew-months";
import type { ExportPayload, ExportPeriod } from "@/lib/export/types";

type Format = "xlsx" | "pdf";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PERIOD_LABELS: Record<ExportPeriod, string> = {
  month: "חודש",
  year: "שנה",
  all: "הכל",
};

async function fetchExportData(
  period: ExportPeriod,
  month: number,
  year: number,
  signal: AbortSignal
): Promise<ExportPayload> {
  const params = new URLSearchParams({ period });
  if (period === "month" || period === "year") {
    params.set("year", String(year));
  }
  if (period === "month") {
    params.set("month", String(month));
  }
  const res = await fetch(`/api/export?${params.toString()}`, { signal });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "שגיאה בטעינת הדוח");
  }
  return {
    rows: json.rows,
    total: json.total,
    period: json.period,
    periodLabel: json.periodLabel,
    periodSlug: json.periodSlug,
  };
}

function getPriorPeriod(
  period: ExportPeriod,
  month: number,
  year: number
): { month: number; year: number } | null {
  if (period === "month") {
    if (month === 1) return { month: 12, year: year - 1 };
    return { month: month - 1, year };
  }
  if (period === "year") {
    return { month: 1, year: year - 1 };
  }
  return null;
}

function computeStats(payload: ExportPayload | null) {
  if (!payload || payload.rows.length === 0) {
    return { total: 0, discount: 0, receiptCount: 0, avgPerReceipt: 0 };
  }
  const receiptIds = new Set<string>();
  let totalDiscount = 0;
  for (const r of payload.rows) {
    receiptIds.add(r.receipt_id);
    totalDiscount += r.discount_amount;
  }
  const receiptCount = receiptIds.size;
  const avgPerReceipt = receiptCount > 0 ? payload.total / receiptCount : 0;
  return {
    total: payload.total,
    discount: Math.round(totalDiscount * 100) / 100,
    receiptCount,
    avgPerReceipt: Math.round(avgPerReceipt * 100) / 100,
  };
}

function deltaPct(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

function DeltaBadge({
  delta,
  lowerIsBetter = false,
}: {
  delta: number | null;
  lowerIsBetter?: boolean;
}) {
  if (delta === null || delta === 0) return null;
  const isUp = delta > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;
  const color = isGood ? "text-emerald-600" : "text-red-600";
  const arrow = isUp ? "▲" : "▼";
  return (
    <p className={`text-[10px] font-medium ${color} mt-0.5`}>
      {arrow} {Math.abs(delta)}%
    </p>
  );
}

export function ExportReportCard() {
  const now = new Date();
  const [period, setPeriod] = useState<ExportPeriod>("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loadingFormat, setLoadingFormat] = useState<Format | null>(null);
  const [preview, setPreview] = useState<ExportPayload | null>(null);
  const [priorPreview, setPriorPreview] = useState<ExportPayload | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const { showToast } = useToast();

  // Auto-fetch preview + prior period when period/month/year changes
  useEffect(() => {
    const controller = new AbortController();
    setPreviewLoading(true);
    setPreviewError(null);

    const prior = getPriorPeriod(period, month, year);
    const priorFetch = prior
      ? fetchExportData(period, prior.month, prior.year, controller.signal).catch(
          () => null
        )
      : Promise.resolve(null);

    Promise.all([
      fetchExportData(period, month, year, controller.signal),
      priorFetch,
    ])
      .then(([data, priorData]) => {
        setPreview(data);
        setPriorPreview(priorData);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setPreviewError(err instanceof Error ? err.message : "שגיאה בטעינה");
        setPreview(null);
        setPriorPreview(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    return () => controller.abort();
  }, [period, month, year]);

  // Derived stats
  const stats = useMemo(() => {
    if (!preview || preview.rows.length === 0) return null;
    return computeStats(preview);
  }, [preview]);

  // Top month (year/all views only)
  const topMonth = useMemo(() => {
    if (period === "month") return null;
    if (!preview || preview.rows.length === 0) return null;
    const monthTotals = new Map<string, number>();
    for (const r of preview.rows) {
      const key = r.purchase_date.slice(0, 7); // YYYY-MM
      monthTotals.set(key, (monthTotals.get(key) ?? 0) + r.paid_price);
    }
    let bestKey: string | null = null;
    let bestVal = 0;
    for (const [k, v] of monthTotals) {
      if (v > bestVal) {
        bestVal = v;
        bestKey = k;
      }
    }
    if (!bestKey) return null;
    const [y, m] = bestKey.split("-");
    const label =
      period === "year"
        ? HEBREW_MONTHS[Number(m) - 1]
        : `${HEBREW_MONTHS[Number(m) - 1]} ${y}`;
    return { label, total: Math.round(bestVal * 100) / 100 };
  }, [preview, period]);

  const priorStats = useMemo(() => {
    if (period === "all") return null;
    if (!priorPreview) return null;
    return computeStats(priorPreview);
  }, [priorPreview, period]);

  function handleWhatsAppShare() {
    if (!preview || preview.rows.length === 0 || !stats) {
      showToast({ type: "info", message: "אין נתונים לשיתוף" });
      return;
    }
    const lines = [
      `📊 דוח קניות - ${preview.periodLabel}`,
      "",
      `💰 סה"כ הוצאות: ${fmt(stats.total)}₪`,
      `🏷️ חיסכון מהנחות: ${fmt(stats.discount)}₪`,
      `🧾 מס' קבלות: ${stats.receiptCount}`,
      `📈 ממוצע לקנייה: ${fmt(stats.avgPerReceipt)}₪`,
    ];
    if (topMonth) {
      lines.push(
        "",
        `🔺 החודש היקר ביותר: ${topMonth.label} (${fmt(topMonth.total)}₪)`
      );
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function handleExport(format: Format) {
    if (loadingFormat || !preview) return;
    if (preview.rows.length === 0) {
      showToast({ type: "info", message: "אין נתונים לתקופה זו" });
      return;
    }
    setLoadingFormat(format);
    try {
      if (format === "xlsx") {
        const { generateExcel } = await import("@/lib/export/excel");
        await generateExcel(preview);
      } else {
        const { generatePdf } = await import("@/lib/export/pdf");
        await generatePdf(preview);
      }
      showToast({ type: "success", message: "הדוח הורד בהצלחה" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בייצוא הדוח";
      showToast({ type: "error", message });
    } finally {
      setLoadingFormat(null);
    }
  }

  const exportDisabled =
    loadingFormat !== null ||
    previewLoading ||
    !preview ||
    preview.rows.length === 0;

  return (
    <div className="space-y-4">
      {/* Export controls */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
        <h2 className="text-base font-bold text-text-primary">ייצוא דוח</h2>

        {/* Period type tabs */}
        <div className="flex gap-2">
          {(["month", "year", "all"] as ExportPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Conditional picker */}
        {period === "month" && (
          <MonthPicker
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />
        )}
        {period === "year" && <YearPicker year={year} onChange={setYear} />}
        {period === "all" && (
          <p className="text-sm text-center text-[var(--color-text-secondary)] py-2">
            ייצוא של כל הרכישות מכל הזמנים
          </p>
        )}

        {/* Export buttons */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={loadingFormat === "xlsx"}
              disabled={exportDisabled && loadingFormat !== "xlsx"}
              onClick={() => handleExport("xlsx")}
            >
              הורד כ-Excel
            </Button>
          </div>
          <div className="flex-1">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              loading={loadingFormat === "pdf"}
              disabled={exportDisabled && loadingFormat !== "pdf"}
              onClick={() => handleExport("pdf")}
            >
              הורד כ-PDF
            </Button>
          </div>
        </div>

        {/* WhatsApp share */}
        <button
          type="button"
          onClick={handleWhatsAppShare}
          disabled={exportDisabled}
          className="w-full py-2.5 px-3 rounded-lg text-sm font-medium bg-[#25D366] text-white hover:bg-[#1ebe5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          שתף בווטסאפ
        </button>
      </div>

      {/* Summary stats */}
      {previewLoading && !preview && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[var(--color-border)] p-4 h-[88px] shimmer"
            />
          ))}
        </div>
      )}

      {previewError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 text-center">
          {previewError}
        </div>
      )}

      {!previewLoading && preview && preview.rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 text-center">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            אין רכישות לתקופה זו
          </p>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400" />
            <p className="text-2xl font-bold text-blue-600">
              {fmt(stats.total)}&#8362;
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              סה&quot;כ הוצאות
            </p>
            {priorStats && (
              <DeltaBadge
                delta={deltaPct(stats.total, priorStats.total)}
                lowerIsBetter
              />
            )}
          </div>
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400" />
            <p className="text-2xl font-bold text-emerald-600">
              {fmt(stats.discount)}&#8362;
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              חיסכון מהנחות
            </p>
            {priorStats && (
              <DeltaBadge delta={deltaPct(stats.discount, priorStats.discount)} />
            )}
          </div>
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-400" />
            <p className="text-2xl font-bold text-purple-600">
              {stats.receiptCount}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              מס&apos; קבלות
            </p>
            {priorStats && (
              <DeltaBadge
                delta={deltaPct(stats.receiptCount, priorStats.receiptCount)}
              />
            )}
          </div>
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
            <p className="text-2xl font-bold text-amber-600">
              {fmt(stats.avgPerReceipt)}&#8362;
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              ממוצע לקנייה
            </p>
            {priorStats && (
              <DeltaBadge
                delta={deltaPct(stats.avgPerReceipt, priorStats.avgPerReceipt)}
                lowerIsBetter
              />
            )}
          </div>
        </div>
      )}

      {preview && preview.rows.length > 0 && (
        <ReportChart payload={preview} period={period} />
      )}

      {topMonth && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-400" />
          <div className="flex items-center justify-between gap-3">
            <div className="text-right">
              <p className="text-xs text-[var(--color-text-secondary)]">
                החודש היקר ביותר
              </p>
              <p className="text-lg font-bold text-rose-600 leading-tight">
                {topMonth.label}
              </p>
            </div>
            <p className="text-2xl font-bold text-rose-600">
              {topMonth.total.toFixed(0)}&#8362;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
