"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import { EmptyState } from "@/components/ui";
import type { Recipe, MealType } from "@/lib/recipes";

type TabInfo = { key: MealType; label: string; emoji: string };

const TABS: TabInfo[] = [
  { key: "breakfast", label: "בוקר", emoji: "🌅" },
  { key: "lunch", label: "צהריים", emoji: "☀️" },
  { key: "dinner", label: "ערב", emoji: "🌙" },
];

function getDefaultTab(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  return "dinner";
}

const difficultyColor: Record<string, string> = {
  "קל": "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  "בינוני": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  "מורכב": "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
};

export default function RecipesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MealType>(getDefaultTab);
  const [recipes, setRecipes] = useState<Record<MealType, Recipe[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
  });
  const [counts, setCounts] = useState<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const [b, l, d] = await Promise.all([
        fetch("/api/recipes?mealType=breakfast").then((r) => r.json()),
        fetch("/api/recipes?mealType=lunch").then((r) => r.json()),
        fetch("/api/recipes?mealType=dinner").then((r) => r.json()),
      ]);

      setRecipes({
        breakfast: b.success ? b.recipes : [],
        lunch: l.success ? l.recipes : [],
        dinner: d.success ? d.recipes : [],
      });
      setCounts({
        breakfast: b.success ? b.total : 0,
        lunch: l.success ? l.total : 0,
        dinner: d.success ? d.total : 0,
      });
    } catch {
      // Silent fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const currentRecipes = recipes[activeTab];
  const totalCount = counts.breakfast + counts.lunch + counts.dinner;

  return (
    <PageLayout title="מתכונים">
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setExpandedId(null);
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-[var(--color-primary-600)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {counts[tab.key] > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8 text-gray-400">
            מחפש מתכונים...
          </div>
        )}

        {/* Empty states */}
        {!loading && totalCount === 0 && (
          <EmptyState
            icon="🛒"
            title="עדיין אין מוצרים במלאי"
            description="סרוק חשבונית או הוסף מוצרים ידנית כדי לקבל הצעות למתכונים"
            action={{
              label: "הוסף מוצרים",
              onClick: () => router.push("/add"),
            }}
          />
        )}

        {!loading && totalCount > 0 && currentRecipes.length === 0 && (
          <EmptyState
            icon="🍳"
            title={`אין מתכוני ${TABS.find((t) => t.key === activeTab)?.label}`}
            description="אין מספיק מוצרים במלאי למתכונים מסוג זה. נסה סוג ארוחה אחר"
          />
        )}

        {/* Recipe cards */}
        {!loading && currentRecipes.length > 0 && (
          <div className="flex flex-col gap-3">
            {currentRecipes.map((recipe) => {
              const isExpanded = expandedId === recipe.id;

              return (
                <div
                  key={recipe.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-[var(--color-border)] overflow-hidden transition-all"
                >
                  {/* Card header — always visible */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : recipe.id)
                    }
                    className="w-full text-start p-4"
                  >
                    {/* Row 1: name + difficulty */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{recipe.emoji}</span>
                      <h3 className="font-medium text-[var(--color-text-primary)] flex-1">
                        {recipe.name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          difficultyColor[recipe.difficulty] || ""
                        }`}
                      >
                        {recipe.difficulty}
                      </span>
                    </div>

                    {/* Row 2: meta */}
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mb-2">
                      <span>⏱ {recipe.prepTime} דקות</span>
                      <span>🍽 {recipe.servings} מנות</span>
                    </div>

                    {/* Row 3: tags */}
                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {recipe.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Row 4: ingredients (green pills) */}
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients
                        .filter((i) => !i.isBase)
                        .map((ingredient) => (
                          <span
                            key={ingredient.name}
                            className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-0.5"
                          >
                            <span className="text-emerald-500">✓</span>
                            {ingredient.name}
                          </span>
                        ))}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)] p-4 space-y-4 animate-fade-in-up">
                      {/* Ingredients list */}
                      <div>
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">
                          מרכיבים
                        </h4>
                        <ul className="space-y-1.5">
                          {recipe.ingredients.map((ingredient) => (
                            <li
                              key={ingredient.name}
                              className={`flex items-center gap-2 text-sm ${
                                ingredient.isBase
                                  ? "text-[var(--color-text-muted)]"
                                  : "text-[var(--color-text-primary)]"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  ingredient.isBase
                                    ? "bg-gray-300 dark:bg-gray-600"
                                    : "bg-emerald-500"
                                }`}
                              />
                              <span className="font-medium">
                                {ingredient.amount} {ingredient.unit}
                              </span>
                              <span>{ingredient.name}</span>
                              {ingredient.isBase && (
                                <span className="text-[10px] text-[var(--color-text-muted)]">
                                  (בסיס)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Steps */}
                      <div>
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-2">
                          הוראות הכנה
                        </h4>
                        <ol className="space-y-3">
                          {recipe.steps.map((step, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                {step}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Close button */}
                      <button
                        onClick={() => setExpandedId(null)}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-[var(--color-text-secondary)] py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        סיימתי לבשל
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
