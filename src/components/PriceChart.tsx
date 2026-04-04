"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";

interface Purchase {
  purchase_date: string;
  unit_price: number;
  store_name: string;
}

interface PriceChartProps {
  purchases: Purchase[];
  avgPrice: number;
  productName: string;
  priceTrend: string;
}

export default function PriceChart({
  purchases,
  avgPrice,
  productName,
  priceTrend,
}: PriceChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  type Trend = "up" | "down" | "same" | "first";

  const data = purchases.map((p, i) => {
    const prev = i > 0 ? purchases[i - 1].unit_price : null;
    const price = p.unit_price;
    const priceChange =
      prev !== null ? Math.round((price - prev) * 100) / 100 : null;
    const percentChange =
      prev !== null
        ? Math.round(((price - prev) / prev) * 1000) / 10
        : null;
    const trend: Trend =
      prev === null
        ? "first"
        : price > prev
          ? "up"
          : price < prev
            ? "down"
            : "same";
    return {
      date: format(parseISO(p.purchase_date), "dd/MM/yy"),
      price,
      store: p.store_name,
      rawDate: p.purchase_date,
      priceChange,
      percentChange,
      trend,
    };
  });

  const dateRange = data.length >= 2
    ? `${data[0].date} — ${data[data.length - 1].date}`
    : "";

  const gridColor = isDark ? "#334155" : "#f0f0f0";
  const axisColor = "#94A3B8";
  const tooltipBg = isDark ? "#1E293B" : "#FFFFFF";
  const tooltipText = isDark ? "#F1F5F9" : "var(--color-text-primary)";
  const tooltipBorder = isDark ? "#334155" : "var(--color-border)";
  const dotBg = isDark ? "#1E293B" : "#FFFFFF";

  const trendColor = (trend: Trend) =>
    trend === "up" ? "#EF4444" : trend === "down" ? "#22C55E" : "#9CA3AF";

  // Custom shape: colored line segments between points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderColoredLine = (props: any) => {
    const points = props?.points as { x: number; y: number }[] | undefined;
    if (!points || points.length < 2) return null;
    return (
      <g>
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          return (
            <line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={point.x}
              y2={point.y}
              stroke={trendColor(data[i].trend)}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    );
  };

  // Percentage labels above/below each point
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPercentLabel = (props: any) => {
    const x = props?.x as number | undefined;
    const y = props?.y as number | undefined;
    const index = props?.index as number | undefined;
    if (x == null || y == null || index == null) return null;
    const point = data[index];
    if (!point || point.trend === "first" || point.trend === "same") return null;
    const isUp = point.trend === "up";
    const color = trendColor(point.trend);
    const symbol = isUp ? "▲" : "▼";
    const label = `${symbol} ${isUp ? "+" : ""}${point.percentChange}%`;
    return (
      <text
        key={index}
        x={x}
        y={y}
        dy={isUp ? -14 : 18}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill={color}
      >
        {label}
      </text>
    );
  };

  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-[var(--color-text-primary)]">
          מחיר {productName} לאורך זמן
        </h3>
        {priceTrend === "עלייה" && (
          <span className="text-red-500 text-lg" title="מגמת עלייה">
            &#9650;
          </span>
        )}
      </div>
      {dateRange && (
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{dateRange}</p>
      )}

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 25, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: axisColor }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: axisColor }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}₪`}
            width={50}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const color = trendColor(d.trend);
              return (
                <div
                  dir="rtl"
                  className="rounded-xl p-3 text-sm"
                  style={{
                    background: tooltipBg,
                    border: `1px solid ${tooltipBorder}`,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    color: tooltipText,
                    minWidth: 160,
                  }}
                >
                  <p className="font-bold">{d.date}</p>
                  <p className="font-medium">
                    מחיר ששולם: {d.price.toFixed(2)}&#8362;
                  </p>
                  <p className="text-[var(--color-text-muted)] text-xs">{d.store}</p>
                  <p className="mt-1 font-semibold text-xs" style={{ color }}>
                    {d.trend === "first"
                      ? "רכישה ראשונה"
                      : d.trend === "same"
                        ? "ללא שינוי"
                        : d.trend === "up"
                          ? `▲ +${d.priceChange?.toFixed(2)}₪ (+${d.percentChange}%)`
                          : `▼ ${d.priceChange?.toFixed(2)}₪ (${d.percentChange}%)`}
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={avgPrice}
            stroke={axisColor}
            strokeDasharray="5 5"
            label={{
              value: `ממוצע: ${avgPrice.toFixed(2)}₪`,
              position: "insideTopLeft",
              fill: axisColor,
              fontSize: 11,
            }}
          />
          <Line
            type="linear"
            dataKey="price"
            stroke="#9CA3AF"
            strokeWidth={2.5}
            shape={renderColoredLine}
            label={renderPercentLabel}
            dot={(props: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
              const { cx, cy, index } = props;
              if (cx == null || cy == null || index == null) return <></>;
              const c = trendColor(data[index]?.trend ?? "first");
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={dotBg}
                  stroke={c}
                  strokeWidth={2}
                />
              );
            }}
            activeDot={(props: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
              const { cx, cy, index } = props;
              if (cx == null || cy == null || index == null) return <></>;
              const c = trendColor(data[index]?.trend ?? "first");
              return (
                <circle
                  key={`active-${index}`}
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill={c}
                  stroke={dotBg}
                  strokeWidth={2}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
