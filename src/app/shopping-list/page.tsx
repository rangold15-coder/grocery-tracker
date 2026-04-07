"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PageLayout from "@/components/layout/PageLayout";
import { EmptyState, QuantityInput } from "@/components/ui";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { hapticTap } from "@/lib/haptic";
import { detectUnit, type Unit } from "@/lib/units";
import { buildWhatsAppMessage, shareToWhatsApp, shareList, copyToClipboard } from "@/lib/shareUtils";
import { useToast } from "@/components/ui/Toast";

interface ShoppingItem {
  id: string;
  product_name: string;
  category: string;
  source: string;
  is_checked: boolean;
  notes: string | null;
  quantity: number;
  unit: string;
}

interface ProductSuggestion {
  name: string;
  category: string;
}

interface AISuggestion {
  name: string;
  category: string;
  reason: string;
}

const CATEGORIES = [
  "ירקות ופירות",
  "חלב וביצים",
  "בשר ודגים",
  "חטיפים",
  "שתייה קלה",
  "ניקיון ואחזקה",
  "טיפוח אישי",
  "רטבים וממרחים",
  "שימורים",
  "דגני בוקר",
  "לחם ומאפים",
  "קפואים",
  "חד פעמי",
  "אחר",
];

export default function ShoppingListPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState("אחר");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsMessage, setSuggestionsMessage] = useState<string | null>(null);
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnit, setNewUnit] = useState<Unit>('יחידות');
  const prevCountRef = useRef(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/shopping-list");
    const data = await res.json();
    if (data.success) {
      setItems(data.items);
    }
  }, []);

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await fetchList();
    },
  });

  useEffect(() => {
    async function init() {
      await fetchList();
      setLoading(false);
    }
    init();
  }, [fetchList]);

  // Flip counter when items count changes
  useEffect(() => {
    if (items.length !== prevCountRef.current && prevCountRef.current !== 0) {
      setFlipKey((k) => k + 1);
    }
    prevCountRef.current = items.length;
  }, [items.length]);

  // Auto-detect unit from product name
  useEffect(() => {
    if (searchText.length >= 2) {
      setNewUnit(detectUnit(searchText));
    }
  }, [searchText]);

  // Search products from DB
  useEffect(() => {
    if (searchText.length < 1) {
      setSuggestions([]);
      return;
    }
    const query = searchText.trim();
    supabase
      .from("products")
      .select("name, category")
      .ilike("name", `%${query}%`)
      .limit(6)
      .then(({ data }) => {
        if (data) {
          setSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      });
  }, [searchText]);

  // Close suggestions on outside click
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

  function selectSuggestion(product: ProductSuggestion) {
    setSearchText(product.name);
    setCategory(product.category);
    setNewUnit(detectUnit(product.name));
    setShowSuggestions(false);
  }

  async function addItem() {
    if (!searchText.trim()) return;
    setAdding(true);
    setError(null);

    const res = await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: searchText.trim(),
        category,
        notes: notes.trim() || null,
        quantity: newQuantity,
        unit: newUnit,
      }),
    });

    const data = await res.json();
    if (!data.success) {
      setError(data.error);
    } else {
      const newId = data.item?.id;
      setSearchText("");
      setCategory("אחר");
      setNotes("");
      setNewQuantity(1);
      setNewUnit('יחידות');
      await fetchList();
      if (newId) {
        setJustAddedId(newId);
        setTimeout(() => setJustAddedId(null), 300);
      }
    }
    setAdding(false);
  }

  async function toggleCheck(item: ShoppingItem) {
    hapticTap();
    // Optimistic UI
    setCheckedIds((prev) => new Set(prev).add(item.id));

    await fetch("/api/shopping-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, product_name: item.product_name }),
    });

    // Remove after animation
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 500);
  }

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function updateQuantity(itemId: string, quantity: number, unit: string) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity, unit } : i));

    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId]);
    }
    debounceTimers.current[itemId] = setTimeout(async () => {
      await fetch("/api/shopping-list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, quantity, unit }),
      });
    }, 500);
  }

  async function clearChecked() {
    await fetch("/api/shopping-list", { method: "DELETE" });
    await fetchList();
  }

  async function getSuggestions() {
    setLoadingSuggestions(true);
    setSuggestionsMessage(null);
    const currentNames = items.map((i) => i.product_name);
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_list: currentNames }),
    });
    const data = await res.json();
    if (data.success) {
      setAiSuggestions(data.suggestions || []);
      if (data.message) setSuggestionsMessage(data.message);
    }
    setLoadingSuggestions(false);
  }

  async function addSuggestion(suggestion: AISuggestion) {
    const res = await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: suggestion.name,
        category: suggestion.category,
      }),
    });
    const data = await res.json();
    if (data.success) {
      const newId = data.item?.id;
      setAddedSuggestions((prev) => new Set(prev).add(suggestion.name));
      await fetchList();
      if (newId) {
        setJustAddedId(newId);
        setTimeout(() => setJustAddedId(null), 300);
      }
    }
  }

  async function dismissSuggestion(name: string) {
    setAiSuggestions((prev) => prev.filter((s) => s.name !== name));
    await supabase.from("dismissed_suggestions").insert({ product_name: name });
  }

  // Group by category
  const grouped: Record<string, ShoppingItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <PageLayout title="רשימת קניות">
      <div className="space-y-4">
        <PullToRefresh {...pullToRefresh} />

        {/* Item counter */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">
              <span key={flipKey} className={flipKey > 0 ? "animate-flip" : ""}>{items.length}</span> פריטים ברשימה
            </span>
          </div>
        )}

        {/* Add item section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-bold text-gray-800 text-sm">הוסף מוצר לרשימה</h2>

          {/* Search with autocomplete */}
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() =>
                searchText.length >= 1 &&
                suggestions.length > 0 &&
                setShowSuggestions(true)
              }
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="שם המוצר..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
              >
                {suggestions.map((product) => (
                  <button
                    key={product.name}
                    onClick={() => selectSuggestion(product)}
                    className="w-full text-right px-4 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                  >
                    <span className="text-sm text-gray-900">
                      {product.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {product.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity + Unit */}
          <QuantityInput
            quantity={newQuantity}
            unit={newUnit}
            onChange={(q, u) => { setNewQuantity(q); setNewUnit(u); }}
          />

          {/* Category + Notes */}
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות (אופציונלי)"
              className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            onClick={addItem}
            disabled={adding || !searchText.trim()}
            className="w-full bg-blue-400 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {adding ? "מוסיף..." : "הוסף לרשימה"}
          </button>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-gray-800 text-sm">שכחת משהו?</h2>
              <p className="text-xs text-gray-400">הצעות לפי מה שקנית בעבר</p>
            </div>
            <button
              onClick={getSuggestions}
              disabled={loadingSuggestions}
              className="text-xs bg-blue-400 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {loadingSuggestions ? "בודק..." : "הצע לי מוצרים"}
            </button>
          </div>

          {suggestionsMessage && (
            <p className="text-sm text-gray-500 text-center py-2">
              {suggestionsMessage}
            </p>
          )}

          {aiSuggestions.length > 0 && (
            <div className="space-y-2">
              {aiSuggestions.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">
                      {s.name}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">{s.reason}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {addedSuggestions.has(s.name) ? (
                      <span className="text-xs text-blue-600 font-medium px-2">
                        נוסף!
                      </span>
                    ) : (
                      <button
                        onClick={() => addSuggestion(s)}
                        className="w-7 h-7 bg-blue-400 text-white rounded-full flex items-center justify-center text-lg hover:bg-blue-500 transition-colors"
                      >
                        +
                      </button>
                    )}
                    <button
                      onClick={() => dismissSuggestion(s.name)}
                      className="w-7 h-7 border border-gray-300 text-gray-400 rounded-full flex items-center justify-center text-sm hover:bg-gray-100 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingSuggestions && aiSuggestions.length === 0 && !suggestionsMessage && (
            <p className="text-xs text-gray-400 text-center">
              לחץ &quot;הצע לי מוצרים&quot; ונמליץ מה כדאי להוסיף לרשימה
            </p>
          )}
        </div>

        {/* Shopping list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען רשימה...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="✅"
            title="הרשימה ריקה"
            description="כל הכבוד! קנית הכל"
            action={{ label: "הוסף מוצר", onClick: () => searchRef.current?.focus() }}
          />
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-[var(--color-text-secondary)]">{cat}</span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
                <div className="space-y-1.5">
                  {catItems.map((item) => {
                    const isChecked = checkedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border border-[var(--color-border)] px-3 py-2.5 flex items-center gap-3 transition-all duration-300 ${
                          isChecked ? "opacity-40 scale-[0.97]" : ""
                        } ${item.id === justAddedId ? "animate-slide-down" : ""}`}
                      >
                        <button
                          onClick={() => toggleCheck(item)}
                          className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                            isChecked
                              ? "bg-blue-500 border-blue-500 text-white scale-110"
                              : "border-blue-300 hover:border-blue-400"
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3 animate-scale-in" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium transition-all duration-300 ${
                              isChecked ? "animate-strike-through text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"
                            }`}>
                              {item.product_name}
                          </span>
                          {!isChecked && (
                            <div className="mt-1.5">
                              <QuantityInput
                                quantity={item.quantity || 1}
                                unit={(item.unit || 'יחידות') as Unit}
                                onChange={(q, u) => updateQuantity(item.id, q, u)}
                              />
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Share buttons */}
        {items.length > 0 && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                const msg = buildWhatsAppMessage(items);
                if (msg) shareToWhatsApp(msg);
              }}
              disabled={!items.some((i) => !i.is_checked)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#25D366" }}
              title={!items.some((i) => !i.is_checked) ? "אין פריטים ברשימה" : undefined}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              שתף בוואטסאפ
            </button>
            <button
              onClick={() => {
                const msg = buildWhatsAppMessage(items);
                if (msg) shareList(msg);
              }}
              disabled={!items.some((i) => !i.is_checked)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-400 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              שתף רשימה
            </button>
            <button
              onClick={async () => {
                const msg = buildWhatsAppMessage(items);
                if (msg) {
                  const ok = await copyToClipboard(msg);
                  if (ok) showToast({ type: "success", message: "הרשימה הועתקה ללוח ✓" });
                  else showToast({ type: "error", message: "לא הצלחנו להעתיק" });
                }
              }}
              disabled={!items.some((i) => !i.is_checked)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              העתק רשימה
            </button>
          </div>
        )}

        {/* Bottom actions */}
        {items.length > 0 && (
          <div className="space-y-2 pt-2">
            <button
              onClick={clearChecked}
              className="w-full border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              נקה פריטים שנקנו
            </button>
            <Link
              href="/"
              className="block w-full text-center text-blue-600 text-sm font-medium py-2 hover:underline"
            >
              חזור לדף הראשי
            </Link>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
