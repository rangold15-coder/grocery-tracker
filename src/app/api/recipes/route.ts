import { supabase } from "@/lib/supabase";
import { RECIPES, MealType } from "@/lib/recipes";
import { getAvailableRecipes } from "@/lib/recipesMatcher";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mealType = searchParams.get("mealType") as MealType | null;

    // Fetch current pantry items (not finished)
    const { data: pantry, error } = await supabase
      .from("pantry")
      .select("product_name")
      .eq("is_finished", false);

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בשליפת נתונים: ${error.message}` },
        { status: 500 }
      );
    }

    if (!pantry || pantry.length === 0) {
      return Response.json({
        success: true,
        recipes: [],
        total: 0,
        message: "אין מוצרים במלאי",
      });
    }

    // Get unique product names
    const pantryProducts = [...new Set(pantry.map((p) => p.product_name))];

    // Find matching recipes
    const matches = getAvailableRecipes(
      RECIPES,
      pantryProducts,
      mealType || undefined
    );

    return Response.json({
      success: true,
      recipes: matches.map((m) => m.recipe),
      total: matches.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
