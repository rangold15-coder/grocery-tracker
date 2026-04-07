"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { HEBREW_MONTHS } from "@/lib/export/hebrew-months";
import type { ExportPayload, ExportPeriod } from "@/lib/export/types";

interface Props {
  payload: ExportPayload;
  period: ExportPeriod;
}

interface Bucket {
  label: string;
  total: number;
}

function bucketize(payload: ExportPayload, period: ExportPeriod): Bucket[] {
  const totals = new Map<string, number>();

  if (period === "month") {
    // daily buckets
    for (const r of payload.rows) {
      const day = r.purchase_date.slice(8, 10);
      totals.set(day, (totals.get(day) ?? 0) + r.paid_price);
    }
    return Array.from(totals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, total]) => ({
        label: String(Number(day)),
        total: Math.round(total * 100) / 100,
      }));
  }

  if (period === "year") {
    // monthly buckets
    for (const r of payload.rows) {
      const key = r.purchase_date.slice(5, 7);
      totals.set(key, (totals.get(key) ?? 0) + r.paid_price);
    }
    return Array.from(totals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, total]) => ({
        label: HEBREW_MONTHS[Number(m) - 1],
        total: Math.round(total * 100) / 100,
      }));
  }

  // all: yearly buckets
  for (const r of payload.rows) {
    const key = r.purchase_date.slice(0, 4);
    totals.set(key, (totals.get(key) ?? 0) + r.paid_price);
  }
  return Array.from(totals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([y, total]) => ({
      label: y,
      total: Math.round(total * 100) / 100,
    }));
}

export function ReportChart({ payload, period }: Props) {
  const data = useMemo(() => bucketize(payload, period), [payload, period]);

  if (data.length === 0) return null;

  const title =
    period === "month"
      ? "הוצאות לפי יום"
      : period === "year"
      ? "הוצאות לפי חודש"
      : "הוצאות לפי שנה";

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
      <h3 className="text-sm font-bold text-text-primary mb-3 text-right">
        {title}
      </h3>
      <div style={{ width: "100%", height: 180 }} dir="ltr">
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              formatter={(val) => [`${Number(val).toFixed(0)}₪`, "הוצאות"]}
              labelStyle={{ fontSize: 12, direction: "rtl" }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                direction: "rtl",
              }}
            />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
