"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { getCategoryInfo } from "@/lib/categories";

interface MonthlyData {
  month: string;
  [category: string]: string | number;
}

interface CategoryDrilldownProps {
  data: MonthlyData[];
  categories: string[];
}

interface ProductData {
  name: string;
  totalSpent: number;
  purchaseCount: number;
  unit: string;
  avgUnitPrice: number;
  normalizedPrice: number;
  normalizedLabel: string;
  priceHistory: { date: string; price: number }[];
  trend: "up" | "down" | "stable";
}

export default function CategoryDrilldown({ data, categories }: CategoryDrilldownProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [level, setLevel] = useState<1 | 2>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Aggregate totals per category
  const categoryTotals = categories
    .map((cat) => {
      const info = getCategoryInfo(cat);
      return {
        category: cat,
        total: Math.round(data.reduce((sum, row) => sum + (Number(row[cat]) || 0), 0)),
        color: info.color,
        emoji: info.emoji,
      };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  const tooltipBg = isDark ? "#1E293B" : "#FFFFFF";
  const tooltipBorder = isDark ? "#334155" : "#E2E8F0";

  async function handleCategoryClick(categoryName: string) {
    setSelectedCategory(categoryName);
    setLevel(2);
    setLoadingProducts(true);

    try {
      const res = await fetch(`/api/category-products?category=${encodeURIComponent(categoryName)}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    }

    setLoadingProducts(false);
  }

  function handleBack() {
    setLevel(1);
    setSelectedCategory(null);
    setProducts([]);
  }

  const trendColor = (trend: string) =>
    trend === "up" ? "#EF4444" : trend === "down" ? "#22C55E" : "#9CA3AF";

  const trendIcon = (trend: string) =>
    trend === "up" ? "▲" : trend === "down" ? "▼" : "—";

  // ── Level 1: Donut Chart ──────────────────────────────────

  if (level === 1) {
    return (
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
        <h3 className="font-bold text-[var(--color-text-primary)] mb-1">הוצאות לפי קטגוריה</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">לחץ על קטגוריה לניתוח מוצרים</p>

        <div className="relative">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryTotals}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={110}
                paddingAngle={2}
                cursor="pointer"
                onClick={(_, index) => handleCategoryClick(categoryTotals[index].category)}
              >
                {categoryTotals.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  const percent = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : "0";
                  return (
                    <div
                      className="rounded-xl px-3 py-2 text-sm shadow-lg"
                      style={{
                        background: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                      }}
                    >
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {item.emoji} {item.category}
                      </p>
                      <p className="text-[var(--color-text-secondary)]">
                        {item.total}&#8362; ({percent}%)
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 0, height: 260 }}>
            <div className="text-center">
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {grandTotal.toLocaleString()}&#8362;
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">סה&quot;כ</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
          {categoryTotals.map((entry) => {
            const percent = grandTotal > 0 ? ((entry.total / grandTotal) * 100).toFixed(1) : "0";
            return (
              <button
                key={entry.category}
                onClick={() => handleCategoryClick(entry.category)}
                className="flex items-center gap-2 text-start hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 py-1.5 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-[var(--color-text-secondary)] truncate flex-1">
                  {entry.emoji} {entry.category}
                </span>
                <span className="text-xs font-medium text-[var(--color-text-muted)] flex-shrink-0">
                  {percent}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Level 2: Product Drill-down ───────────────────────────

  const catInfo = selectedCategory ? getCategoryInfo(selectedCategory) : null;
  const maxSpent = products.length > 0 ? products[0].totalSpent : 1;

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <span className="text-[var(--color-text-secondary)]">→</span>
        </button>
        <div>
          <h3 className="font-bold text-[var(--color-text-primary)]">
            {catInfo?.emoji} {selectedCategory}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">Top 10 מוצרים לפי הוצאה</p>
        </div>
      </div>

      {loadingProducts && (
        <div className="text-center py-8 text-gray-400">טוען נתונים...</div>
      )}

      {!loadingProducts && products.length === 0 && (
        <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
          אין נתונים לקטגוריה זו
        </div>
      )}

      {!loadingProducts && products.length > 0 && (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3"
            >
              {/* Product name & trend */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[var(--color-text-primary)] truncate">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {product.purchaseCount} רכישות
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {product.normalizedPrice.toFixed(2)}&#8362; {product.normalizedLabel}
                    </span>
                  </div>
                </div>
                <div className="text-start flex-shrink-0 mr-3">
                  <p className="text-[10px] text-[var(--color-text-muted)] text-center">סה&quot;כ רכישות</p>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">
                    {product.totalSpent.toFixed(0)}&#8362;
                  </p>
                  <p
                    className="text-[10px] font-bold text-center"
                    style={{ color: trendColor(product.trend) }}
                  >
                    {trendIcon(product.trend)} {product.trend === "up" ? "עלייה" : product.trend === "down" ? "ירידה" : "יציב"}
                  </p>
                </div>
              </div>

              {/* Horizontal bar + Sparkline */}
              <div className="flex items-center gap-3">
                {/* Spend bar */}
                <div className="flex-1">
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(product.totalSpent / maxSpent) * 100}%`,
                        backgroundColor: catInfo?.color || "#6B7280",
                      }}
                    />
                  </div>
                </div>

                {/* Sparkline */}
                {product.priceHistory.length >= 2 && (
                  <div className="w-16 flex-shrink-0">
                    <ResponsiveContainer width="100%" height={28}>
                      <LineChart data={product.priceHistory}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={trendColor(product.trend)}
                          strokeWidth={1.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
