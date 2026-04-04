import { supabase } from "@/lib/supabase";

interface MealSuggestion {
  name: string;
  type: "בוקר" | "צהריים" | "ערב";
  ingredients: string[];
  missing: string[];
}

export async function GET() {
  try {
    // Get available pantry items
    const { data: pantry } = await supabase
      .from("pantry")
      .select("product_name, category")
      .eq("is_finished", false);

    if (!pantry || pantry.length === 0) {
      return Response.json({
        success: true,
        meals: [],
        message: "אין מוצרים בבית. שמור חשבונית כדי לעדכן את המלאי",
      });
    }

    const availableProducts = pantry.map((p) => p.product_name);
    const uniqueProducts = [...new Set(availableProducts)];

    // Try Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const meals = await getGeminiMeals(geminiKey, uniqueProducts);
        if (meals.length > 0) {
          return Response.json({ success: true, meals });
        }
      } catch {
        // Fallback to algorithmic
      }
    }

    // Algorithmic fallback
    const meals = getAlgorithmicMeals(uniqueProducts);
    return Response.json({ success: true, meals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function getGeminiMeals(
  apiKey: string,
  products: string[]
): Promise<MealSuggestion[]> {
  const prompt = `אתה שף ישראלי שמתכנן ארוחות למשפחה.

המוצרים שיש לי בבית:
${products.join(", ")}

הצע 3 ארוחות — אחת לבוקר, אחת לצהריים, ואחת לערב.
כללים:
- השתמש רק במוצרים שיש לי (או מוצרים בסיסיים כמו מלח, פלפל, שמן שסביר שיש)
- אם חסר מוצר חשוב — ציין אותו ב-missing
- שמות ארוחות בעברית
- ענה JSON בלבד:
[{ "name": "שם הארוחה", "type": "בוקר/צהריים/ערב", "ingredients": ["מוצר1", "מוצר2"], "missing": ["מוצר חסר"] }]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!response.ok) throw new Error("Gemini API error");

  const data = await response.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(text) as MealSuggestion[];
}

function getAlgorithmicMeals(products: string[]): MealSuggestion[] {
  const has = (keyword: string) =>
    products.some((p) => p.includes(keyword));

  const meals: MealSuggestion[] = [];

  // Breakfast
  if (has("ביצ") || has("לחם") || has("גבינ") || has("חלב")) {
    const ingredients: string[] = [];
    const missing: string[] = [];
    if (has("ביצ")) ingredients.push("ביצים");
    else missing.push("ביצים");
    if (has("לחם") || has("חלה") || has("טוסט")) ingredients.push("לחם");
    else missing.push("לחם");
    if (has("גבינ")) ingredients.push(products.find((p) => p.includes("גבינ")) || "גבינה");
    if (has("עגבני")) ingredients.push("עגבנייה");
    if (has("מלפפון")) ingredients.push("מלפפון");

    meals.push({
      name: "ארוחת בוקר ישראלית",
      type: "בוקר",
      ingredients,
      missing,
    });
  }

  // Lunch
  if (has("עוף") || has("שניצל") || has("בשר") || has("אונטריב")) {
    const ingredients: string[] = [];
    const missing: string[] = [];
    const meat = products.find((p) => p.includes("עוף") || p.includes("שניצל") || p.includes("אונטריב"));
    if (meat) ingredients.push(meat);
    if (has("אורז")) ingredients.push("אורז");
    else missing.push("אורז");
    if (has("בטטה")) ingredients.push("בטטה");
    if (has("שמן")) ingredients.push(products.find((p) => p.includes("שמן")) || "שמן");

    meals.push({
      name: meat?.includes("שניצל") ? "שניצל עם תוספות" : "עוף צלוי עם ירקות",
      type: "צהריים",
      ingredients,
      missing,
    });
  }

  // Dinner
  if (has("גבינ") || has("ביצ") || has("לחם")) {
    const ingredients: string[] = [];
    const missing: string[] = [];
    if (has("ביצ")) ingredients.push("ביצים");
    if (has("גבינ")) ingredients.push(products.find((p) => p.includes("גבינ")) || "גבינה");
    if (has("לחם") || has("פיתה")) ingredients.push("לחם/פיתה");
    if (has("חומוס") || has("טחינ")) ingredients.push(products.find((p) => p.includes("חומוס") || p.includes("טחינ")) || "חומוס");
    if (has("ירקות") || has("עגבני") || has("מלפפון")) ingredients.push("סלט ירקות");

    meals.push({
      name: "ארוחה קלה — לחם עם גבינות",
      type: "ערב",
      ingredients,
      missing,
    });
  }

  return meals;
}
