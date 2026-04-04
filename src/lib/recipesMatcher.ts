import { Recipe, MealType } from "./recipes";

export interface RecipeMatch {
  recipe: Recipe;
  matchedIngredients: string[];
}

// ── Ingredient synonym groups ────────────────────────────
// Each group lists names that can substitute for one another.
// If a pantry item matches ANY word in a group, it can satisfy
// a recipe ingredient that matches ANY other word in that group.

const SYNONYM_GROUPS: string[][] = [
  // עוף — chicken cuts
  ["עוף", "חזה עוף", "שניצל עוף", "פרגית", "כרעיים", "עוף טחון", "שוקיים עוף", "כנפיים"],
  // בשר — beef / general meat cuts
  ["בשר", "בשר טחון", "סינטה", "אנטריקוט", "אונטריב", "דנוור", "צלעות", "שפונדרה", "סטייק"],
  // נקניקיות
  ["נקניקיות", "נקניק", "קבנוס"],
  // כבד
  ["כבד", "כבד עוף", "כבד פטם"],
];

/**
 * Check if pantryName belongs to the same synonym group as recipeName.
 */
function synonymMatch(pantryName: string, recipeName: string): boolean {
  const pLower = pantryName.trim();
  const rLower = recipeName.trim();

  for (const group of SYNONYM_GROUPS) {
    let pantryInGroup = false;
    let recipeInGroup = false;

    for (const term of group) {
      if (!pantryInGroup && pLower.includes(term)) pantryInGroup = true;
      if (!recipeInGroup && (rLower === term || rLower.includes(term) || term.includes(rLower))) recipeInGroup = true;
      if (pantryInGroup && recipeInGroup) return true;
    }
  }
  return false;
}

/**
 * Check if a pantry product name matches a recipe ingredient name.
 * Handles: exact match, contains (partial), Hebrew plural/singular (ים/ות),
 * and synonym groups for meat/poultry.
 */
export function ingredientMatch(
  pantryProductName: string,
  recipeIngredientName: string
): boolean {
  const pantry = pantryProductName.trim();
  const recipe = recipeIngredientName.trim();

  // Exact match
  if (pantry === recipe) return true;

  // Guard: skip contains-match for very short recipe names to avoid false positives
  // e.g. "שמן" should not match "שמנת"
  if (recipe.length < 3) return false;

  // Contains: "חלב תנובה 3%" contains "חלב"
  if (pantry.includes(recipe)) return true;

  // Synonym groups (e.g. "שניצל עוף טרי" matches "חזה עוף")
  if (synonymMatch(pantry, recipe)) return true;

  // Hebrew plural/singular normalization
  // Strip common suffixes: ים, ות, ה, יות
  const stripPlural = (s: string): string => {
    if (s.endsWith("יות")) return s.slice(0, -3);
    if (s.endsWith("ים")) return s.slice(0, -2);
    if (s.endsWith("ות")) return s.slice(0, -2);
    if (s.endsWith("ה")) return s.slice(0, -1);
    return s;
  };

  const pantryBase = stripPlural(pantry);
  const recipeBase = stripPlural(recipe);

  // Compare roots
  if (pantryBase === recipeBase) return true;

  // Root contains: "ביצים חופש" base "ביצ" contains "ביצ"
  if (recipeBase.length >= 3 && pantryBase.includes(recipeBase)) return true;
  if (pantryBase.length >= 3 && pantry.includes(recipeBase)) return true;

  return false;
}

/**
 * Get recipes where ALL non-base ingredients exist in the user's pantry.
 * Sorted by simplicity (fewer non-base ingredients first), then prepTime.
 */
export function getAvailableRecipes(
  recipes: Recipe[],
  pantryProducts: string[],
  mealType?: MealType
): RecipeMatch[] {
  const filtered = mealType
    ? recipes.filter((r) => r.mealType === mealType)
    : recipes;

  return filtered
    .map((recipe) => {
      const nonBase = recipe.ingredients.filter((i) => !i.isBase);
      const matched: string[] = [];
      const missing: string[] = [];

      for (const ingredient of nonBase) {
        const found = pantryProducts.some((p) =>
          ingredientMatch(p, ingredient.name)
        );
        if (found) {
          matched.push(ingredient.name);
        } else {
          missing.push(ingredient.name);
        }
      }

      return {
        recipe,
        matchedIngredients: matched,
        isFullMatch: missing.length === 0,
        nonBaseCount: nonBase.length,
      };
    })
    .filter((m) => m.isFullMatch)
    .sort((a, b) => {
      // Simpler recipes first, then by prep time
      if (a.nonBaseCount !== b.nonBaseCount)
        return a.nonBaseCount - b.nonBaseCount;
      return a.recipe.prepTime - b.recipe.prepTime;
    })
    .map(({ recipe, matchedIngredients }) => ({ recipe, matchedIngredients }));
}
