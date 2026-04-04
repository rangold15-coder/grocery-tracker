"use client";

import { useState, useEffect, useCallback } from "react";
import PageLayout from "@/components/layout/PageLayout";

interface PantryItem {
  id: string;
  product_name: string;
  category: string;
  quantity: number;
  added_at: string;
}

interface MealSuggestion {
  name: string;
  type: "בוקר" | "צהריים" | "ערב";
  ingredients: string[];
  missing: string[];
}

const MEAL_ICONS: Record<string, string> = {
  "בוקר": "🌅",
  "צהריים": "☀️",
  "ערב": "🌙",
};

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const [meals, setMeals] = useState<MealSuggestion[]>([]);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/pantry");
    const data = await res.json();
    if (data.success) {
      setItems(data.items);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await fetchItems();
      setLoading(false);
    }
    init();
  }, [fetchItems]);

  async function markFinished(id: string) {
    setFadingOut((prev) => new Set(prev).add(id));

    await fetch("/api/pantry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setFadingOut((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }

  async function loadMeals() {
    setMealsLoading(true);
    const res = await fetch("/api/meals");
    const data = await res.json();
    if (data.success) {
      setMeals(data.meals);
    }
    setMealsLoading(false);
    setMealsLoaded(true);
  }

  // Filter items by search query
  const filteredItems = searchQuery
    ? items.filter((item) =>
        item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  // Group items by category
  const grouped = filteredItems.reduce<Record<string, PantryItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <PageLayout title="המזווה שלי">
      <div className="space-y-6">
        {/* Search */}
        {!loading && items.length > 0 && (
          <div className="flex items-center gap-2">
            {searchOpen ? (
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש מוצר..."
                  autoFocus
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-right placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1" />
            )}
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery("");
              }}
              className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        )}

        {/* Products Section */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">טוען מוצרים...</div>
        ) : searchQuery && filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">
              לא נמצאו מוצרים עבור &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-gray-600 text-lg font-medium mb-1">
              המזווה ריקה
            </p>
            <p className="text-gray-400 text-sm">
              שמור חשבונית כדי להוסיף מוצרים
            </p>
          </div>
        ) : (
          <>
            {categories.map((category) => (
              <div key={category}>
                <h2 className="text-sm font-bold text-gray-500 mb-2">
                  {category}
                </h2>
                <div className="space-y-2">
                  {grouped[category].map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between transition-all duration-400 ${
                        fadingOut.has(item.id)
                          ? "opacity-0 translate-x-4 scale-95"
                          : "opacity-100"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {Number.isInteger(item.quantity)
                            ? `${item.quantity} יח׳`
                            : `${item.quantity.toFixed(2)} ק״ג`}
                        </p>
                      </div>
                      <button
                        onClick={() => markFinished(item.id)}
                        disabled={fadingOut.has(item.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        נגמר
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Meal Suggestions Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              מה מכינים היום?
            </h2>
            <button
              onClick={loadMeals}
              disabled={mealsLoading}
              className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {mealsLoading ? "חושב..." : "הצע לי ארוחות"}
            </button>
          </div>

          {mealsLoading && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2 animate-bounce">🍳</div>
              <p>מחפש רעיונות לארוחות...</p>
            </div>
          )}

          {mealsLoaded && !mealsLoading && meals.length === 0 && (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">
                אין מספיק מוצרים להציע ארוחות. הוסף עוד מוצרים!
              </p>
            </div>
          )}

          {meals.length > 0 && !mealsLoading && (
            <div className="space-y-3">
              {meals.map((meal, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">
                      {MEAL_ICONS[meal.type] || "🍽️"}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">{meal.name}</p>
                      <p className="text-xs text-gray-400">{meal.type}</p>
                    </div>
                  </div>

                  {/* Available ingredients */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">מרכיבים זמינים:</p>
                    <div className="flex flex-wrap gap-1">
                      {meal.ingredients.map((ing, j) => (
                        <span
                          key={j}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing ingredients */}
                  {meal.missing.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">חסר:</p>
                      <div className="flex flex-wrap gap-1">
                        {meal.missing.map((m, j) => (
                          <span
                            key={j}
                            className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
