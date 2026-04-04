"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import PriceChart from "@/components/PriceChart";
import CategoryDrilldown from "@/components/CategoryDrilldown";
import PageLayout from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/ui";

// ── Interfaces ─────────────────────────────────────────────

interface Purchase {
  purchase_date: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  store_name: string;
  discount_type: "percent" | "fixed" | null;
  discount_value: number | null;
}

interface Stats {
  min_price: number;
  min_price_date: string;
  max_price: number;
  max_price_date: string;
  avg_price: number;
  total_purchases: number;
  price_trend: string;
}

interface StoreData {
  store_name: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  last_price: number;
  purchase_count: number;
  last_date: string;
}

interface ProductSuggestion {
  name: string;
  category: string;
}

interface MonthlyData {
  month: string;
  [category: string]: string | number;
}

type Tab = "analysis" | "comparison";

// ── Component ──────────────────────────────────────────────

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("analysis");

  // Shared search state
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price analysis state
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [changePeriod, setChangePeriod] = useState<number>(0);

  // Store comparison state
  const [stores, setStores] = useState<StoreData[]>([]);

  // Monthly data
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [monthlyCategories, setMonthlyCategories] = useState<string[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ── Load monthly expenses ────────────────────────────────

  const loadMonthlyData = useCallback(async () => {
    const { data: items } = await supabase
      .from("receipt_items")
      .select("category, total_price, created_at, receipts(purchase_date)")
      .order("created_at", { ascending: true });

    if (!items || items.length === 0) {
      setLoadingMonthly(false);
      return;
    }

    const monthMap: Record<string, Record<string, number>> = {};
    const catSet = new Set<string>();

    for (const item of items) {
      const receipt = item.receipts as unknown as { purchase_date: string } | null;
      const dateStr = receipt?.purchase_date || item.created_at.split("T")[0];
      const month = dateStr.substring(0, 7);

      if (!monthMap[month]) monthMap[month] = {};
      monthMap[month][item.category] =
        (monthMap[month][item.category] || 0) + item.total_price;
      catSet.add(item.category);
    }

    const sorted = Object.keys(monthMap).sort();
    const result: MonthlyData[] = sorted.map((key) => {
      const entry = monthMap[key];
      const row: MonthlyData = { month: format(parseISO(key + "-01"), "MM/yyyy") };
      for (const cat of catSet) {
        row[cat] = Math.round((entry[cat] || 0) * 100) / 100;
      }
      return row;
    });

    setMonthlyData(result);
    setMonthlyCategories([...catSet]);
    setLoadingMonthly(false);
  }, []);

  useEffect(() => {
    loadMonthlyData();
  }, [loadMonthlyData]);

  // ── Search products ──────────────────────────────────────

  useEffect(() => {
    if (searchText.length < 1) {
      setSuggestions([]);
      return;
    }
    // Search from receipt_items directly to avoid orphaned products
    supabase
      .from("receipt_items")
      .select("name, category")
      .ilike("name", `%${searchText.trim()}%`)
      .limit(50)
      .then(({ data }) => {
        if (data) {
          // Deduplicate by name, keep first category found
          const seen = new Map<string, string>();
          for (const item of data) {
            if (!seen.has(item.name)) {
              seen.set(item.name, item.category);
            }
          }
          const unique = Array.from(seen.entries())
            .slice(0, 8)
            .map(([name, category]) => ({ name, category }));
          setSuggestions(unique);
          setShowSuggestions(unique.length > 0);
        }
      });
  }, [searchText]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Select product (fetch both datasets) ─────────────────

  async function selectProduct(name: string) {
    setSelectedProduct(name);
    setSearchText(name);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);

    const [historyRes, comparisonRes] = await Promise.all([
      fetch(`/api/product-history?name=${encodeURIComponent(name)}`),
      fetch(`/api/store-comparison?name=${encodeURIComponent(name)}`),
    ]);

    const historyData = await historyRes.json();
    const comparisonData = await comparisonRes.json();

    if (!historyData.success) {
      setError(historyData.error);
      setPurchases([]);
      setStats(null);
    } else {
      setPurchases(historyData.purchases);
      setStats(historyData.stats);
    }

    if (comparisonData.success) {
      setStores(comparisonData.stores);
    } else {
      setStores([]);
    }

    setLoading(false);
  }

  // ── Computed values ──────────────────────────────────────

  const periodOptions = [
    { label: "הכל", days: 0 },
    { label: "חודש", days: 30 },
    { label: "3 חודשים", days: 90 },
    { label: "6 חודשים", days: 180 },
    { label: "שנה", days: 365 },
  ];

  const priceChangePercent = (() => {
    if (!purchases || purchases.length < 2) return null;
    const now = new Date();
    const filtered =
      changePeriod === 0
        ? purchases
        : purchases.filter((p) => {
            const d = new Date(p.purchase_date);
            return now.getTime() - d.getTime() <= changePeriod * 86400000;
          });
    if (filtered.length < 2) return null;
    const first = filtered[0].unit_price;
    const last = filtered[filtered.length - 1].unit_price;
    if (first === 0) return null;
    return Math.round(((last - first) / first) * 1000) / 10;
  })();

  const trendColor: Record<string, string> = {
    "עלייה": "text-red-600",
    "ירידה": "text-blue-600",
    "יציב": "text-gray-600",
  };

  const trendIcon: Record<string, string> = {
    "עלייה": "▲",
    "ירידה": "▼",
    "יציב": "—",
  };

  const cheapest = stores.length > 0 ? stores[0].avg_price : 0;
  const mostExpensive = stores.length > 0 ? stores[stores.length - 1].avg_price : 0;
  const savings = mostExpensive - cheapest;

  // ── Render ───────────────────────────────────────────────

  return (
    <PageLayout title="תובנות">
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "analysis"
                ? "bg-white dark:bg-gray-700 text-[var(--color-primary-600)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            ניתוח מחירים
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "comparison"
                ? "bg-white dark:bg-gray-700 text-[var(--color-primary-600)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            השוואת חנויות
          </button>
        </div>

        {/* Shared search */}
        <div className="relative">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              if (selectedProduct) {
                setSelectedProduct(null);
                setPurchases([]);
                setStats(null);
                setStores([]);
              }
            }}
            onFocus={() =>
              searchText.length >= 1 &&
              suggestions.length > 0 &&
              setShowSuggestions(true)
            }
            placeholder="חפש מוצר..."
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-48 overflow-y-auto"
            >
              {suggestions.map((product) => (
                <button
                  key={product.name}
                  onClick={() => selectProduct(product.name)}
                  className="w-full text-start px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex justify-between items-center"
                >
                  <span className="text-sm text-gray-900 dark:text-gray-100">{product.name}</span>
                  <span className="text-xs text-gray-400">{product.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-400">טוען נתונים...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* ── Price Analysis Tab ────────────────────────────── */}
        {activeTab === "analysis" && (
          <>
            {!stats && !loading && !error && !selectedProduct && (
              <EmptyState
                icon="📊"
                title="בחר מוצר לניתוח"
                description="חפש מוצר כדי לראות את היסטוריית המחירים שלו"
              />
            )}

            {stats && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400" />
                    <p className="text-xl font-bold text-emerald-600">{stats.min_price.toFixed(2)}&#8362;</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">מחיר נמוך</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {stats.min_price_date && format(parseISO(stats.min_price_date), "dd/MM/yy")}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-400" />
                    <p className="text-xl font-bold text-red-500">{stats.max_price.toFixed(2)}&#8362;</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">מחיר גבוה</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {stats.max_price_date && format(parseISO(stats.max_price_date), "dd/MM/yy")}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400" />
                    <p className="text-xl font-bold text-blue-600">{stats.avg_price.toFixed(2)}&#8362;</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">מחיר ממוצע</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[var(--color-border)] p-4 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                    <p className={`text-xl font-bold ${trendColor[stats.price_trend] || "text-gray-600"}`}>
                      {trendIcon[stats.price_trend] || "—"} {stats.price_trend}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">מגמה</p>
                  </div>
                </div>

                {purchases.length >= 2 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[var(--color-border)] p-4 relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{
                        background:
                          priceChangePercent === null ? "#9CA3AF"
                            : priceChangePercent > 0 ? "#EF4444"
                            : priceChangePercent < 0 ? "#22C55E"
                            : "#9CA3AF",
                      }}
                    />
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[var(--color-text-secondary)] font-medium">שינוי במחיר</p>
                      <div className="flex gap-1">
                        {periodOptions.map((opt) => (
                          <button
                            key={opt.days}
                            onClick={() => setChangePeriod(opt.days)}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              changePeriod === opt.days
                                ? "bg-blue-500 text-white"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      {priceChangePercent === null ? (
                        <p className="text-sm text-gray-400">אין מספיק נתונים בתקופה</p>
                      ) : (
                        <p
                          className="text-2xl font-bold"
                          style={{
                            color:
                              priceChangePercent > 0 ? "#EF4444"
                                : priceChangePercent < 0 ? "#22C55E"
                                : "#9CA3AF",
                          }}
                        >
                          {priceChangePercent > 0
                            ? `▲ +${priceChangePercent}%`
                            : priceChangePercent < 0
                              ? `▼ ${priceChangePercent}%`
                              : "ללא שינוי"}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {purchases.length >= 2 && (
                  <PriceChart
                    purchases={purchases}
                    avgPrice={stats.avg_price}
                    productName={selectedProduct || ""}
                    priceTrend={stats.price_trend}
                  />
                )}

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="grid grid-cols-[3fr_3fr_2fr_2fr_2fr_2fr] bg-gray-100 dark:bg-gray-700 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                    <div>תאריך</div>
                    <div>חנות</div>
                    <div className="text-center">כמות</div>
                    <div className="text-center">מחיר</div>
                    <div className="text-center">הנחה</div>
                    <div className="text-center">סה&quot;כ</div>
                  </div>
                  {[...purchases].reverse().map((p, i) => (
                    <div key={i} className="grid grid-cols-[3fr_3fr_2fr_2fr_2fr_2fr] px-3 py-2.5 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0 items-center">
                      <div className="text-gray-700 dark:text-gray-300">
                        {format(parseISO(p.purchase_date), "dd/MM/yy")}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 truncate">{p.store_name}</div>
                      <div className="text-center text-gray-600 dark:text-gray-400">{p.quantity}</div>
                      <div className="text-center text-gray-600 dark:text-gray-400">{p.unit_price.toFixed(2)}&#8362;</div>
                      <div className="text-center">
                        {p.discount_value && p.discount_value > 0 ? (
                          <span className="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {p.discount_type === "percent" ? `-${p.discount_value}%` : `-${p.discount_value}₪`}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </div>
                      <div className="text-center font-medium text-gray-800 dark:text-gray-200">{p.total_price.toFixed(2)}&#8362;</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {loadingMonthly ? (
              <div className="text-center py-4 text-gray-400 text-sm">טוען הוצאות חודשיות...</div>
            ) : monthlyData.length > 0 ? (
              <CategoryDrilldown data={monthlyData} categories={monthlyCategories} />
            ) : null}
          </>
        )}

        {/* ── Store Comparison Tab ──────────────────────────── */}
        {activeTab === "comparison" && (
          <>
            {!loading && !error && !selectedProduct && (
              <EmptyState
                icon="🏪"
                title="השוואת מחירים בין חנויות"
                description="חפש מוצר כדי לראות איפה הכי זול לקנות אותו"
              />
            )}

            {stores.length > 1 && savings > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    אפשר לחסוך {savings.toFixed(2)}&#8362; למוצר
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    בקנייה ב{stores[0].store_name} במקום ב{stores[stores.length - 1].store_name}
                  </p>
                </div>
              </div>
            )}

            {stores.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {stores.length} חנויות מכרו את &quot;{selectedProduct}&quot;
                </h3>

                {stores.map((store, index) => {
                  const isCheapest = index === 0 && stores.length > 1;
                  const isMostExpensive = index === stores.length - 1 && stores.length > 1;
                  const priceDiff = store.avg_price - cheapest;

                  return (
                    <div
                      key={store.store_name}
                      className={`bg-white dark:bg-gray-800 rounded-xl border p-4 relative overflow-hidden ${
                        isCheapest ? "border-emerald-300 dark:border-emerald-700"
                          : isMostExpensive ? "border-red-200 dark:border-red-800"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        isCheapest ? "bg-emerald-400" : isMostExpensive ? "bg-red-400" : "bg-gray-300"
                      }`} />

                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-[var(--color-text-primary)]">{store.store_name}</h4>
                            {isCheapest && (
                              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                הכי זול
                              </span>
                            )}
                            {isMostExpensive && (
                              <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                הכי יקר
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-[var(--color-text-muted)]">{store.purchase_count} רכישות</span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              אחרונה: {format(parseISO(store.last_date), "dd/MM/yy")}
                            </span>
                          </div>
                        </div>

                        <div className="text-start">
                          <p className={`text-xl font-bold ${
                            isCheapest ? "text-emerald-600" : isMostExpensive ? "text-red-500" : "text-[var(--color-text-primary)]"
                          }`}>
                            {store.avg_price.toFixed(2)}&#8362;
                          </p>
                          <p className="text-[10px] text-[var(--color-text-muted)] text-center">ממוצע</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-[var(--color-text-muted)]">נמוך</p>
                          <p className="text-sm font-medium text-emerald-600">{store.min_price.toFixed(2)}&#8362;</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-text-muted)]">אחרון</p>
                          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{store.last_price.toFixed(2)}&#8362;</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-text-muted)]">גבוה</p>
                          <p className="text-sm font-medium text-red-500">{store.max_price.toFixed(2)}&#8362;</p>
                        </div>
                      </div>

                      {stores.length > 1 && (
                        <div className="mt-3">
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCheapest ? "bg-emerald-400" : isMostExpensive ? "bg-red-400" : "bg-blue-400"
                              }`}
                              style={{
                                width: mostExpensive > 0 ? `${(store.avg_price / mostExpensive) * 100}%` : "100%",
                              }}
                            />
                          </div>
                          {priceDiff > 0 && (
                            <p className="text-[10px] text-red-400 mt-1">+{priceDiff.toFixed(2)}&#8362; מהחנות הזולה</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedProduct && stores.length === 1 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-300 text-center">
                המוצר נרכש רק ב{stores[0].store_name}. קנה בחנויות נוספות כדי להשוות מחירים.
              </div>
            )}

            {selectedProduct && stores.length === 0 && !loading && !error && (
              <div className="text-center py-4 text-[var(--color-text-muted)] text-sm">
                אין נתוני חנויות למוצר זה
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
