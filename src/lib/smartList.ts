import { supabase } from "./supabase";

export async function refreshSmartList() {
  // 1. Get all products with at least 2 purchases
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .gte("purchase_count", 2)
    .not("last_purchased", "is", null);

  if (!products || products.length === 0) return;

  // 2. Get existing shopping list items (not checked)
  const { data: existingItems } = await supabase
    .from("shopping_list")
    .select("product_name")
    .eq("is_checked", false);

  const existingNames = new Set(
    (existingItems || []).map((item) => item.product_name)
  );

  const today = new Date();
  const itemsToAdd: { product_name: string; category: string; source: string }[] = [];

  for (const product of products) {
    // Skip if already in list
    if (existingNames.has(product.name)) continue;

    // Calculate days since last purchase
    const lastPurchased = new Date(product.last_purchased);
    const daysSince = Math.floor(
      (today.getTime() - lastPurchased.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate average days between purchases from receipt_items
    const { data: purchaseDates } = await supabase
      .from("receipt_items")
      .select("created_at")
      .eq("name", product.name)
      .order("created_at", { ascending: true });

    if (!purchaseDates || purchaseDates.length < 2) continue;

    // Calculate average gap between purchases
    let totalDays = 0;
    let gaps = 0;
    for (let i = 1; i < purchaseDates.length; i++) {
      const prev = new Date(purchaseDates[i - 1].created_at);
      const curr = new Date(purchaseDates[i].created_at);
      const diff = Math.floor(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff > 0) {
        totalDays += diff;
        gaps++;
      }
    }

    if (gaps === 0) continue;

    const avgDays = totalDays / gaps;

    // If days since last purchase > avg * 1.3 → probably ran out
    if (daysSince > avgDays * 1.3) {
      itemsToAdd.push({
        product_name: product.name,
        category: product.category,
        source: "auto",
      });
    }
  }

  // 3. Insert auto items
  if (itemsToAdd.length > 0) {
    await supabase.from("shopping_list").insert(itemsToAdd);
  }

  return itemsToAdd.length;
}
