import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return Response.json(
        { success: false, error: "חסר שם מוצר" },
        { status: 400 }
      );
    }

    // Get purchase history with store names
    const { data: history, error } = await supabase
      .from("receipt_items")
      .select("unit_price, quantity, total_price, created_at, receipt_id, discount_type, discount_value, receipts(purchase_date, store_name, discount_type, discount_value)")
      .eq("name", name)
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בשליפת נתונים: ${error.message}` },
        { status: 500 }
      );
    }

    if (!history || history.length === 0) {
      // Clean up orphaned product entry (no receipt_items exist for it)
      await supabase.from("products").delete().eq("name", name);

      return Response.json(
        { success: false, error: "לא נמצאו רכישות למוצר זה" },
        { status: 404 }
      );
    }

    // Format the results
    const purchases = history.map((item) => {
      const receipt = item.receipts as unknown as { purchase_date: string; store_name: string; discount_type: string | null; discount_value: number | null } | null;

      // Item-level discount takes priority, then receipt-level
      const hasItemDiscount = item.discount_type && item.discount_value && item.discount_value > 0;
      const hasReceiptDiscount = receipt?.discount_type && receipt?.discount_value && receipt.discount_value > 0;

      return {
        purchase_date: receipt?.purchase_date || item.created_at.split("T")[0],
        unit_price: item.unit_price,
        quantity: item.quantity,
        total_price: item.total_price,
        store_name: receipt?.store_name || "לא ידוע",
        discount_type: hasItemDiscount ? item.discount_type : hasReceiptDiscount ? receipt!.discount_type : null,
        discount_value: hasItemDiscount ? item.discount_value : hasReceiptDiscount ? receipt!.discount_value : null,
      };
    });

    // Calculate statistics
    const prices = purchases.map((p) => p.unit_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
    const lastPrice = prices[prices.length - 1];
    const totalPurchases = purchases.length;

    let price_trend: "עלייה" | "ירידה" | "יציב" = "יציב";
    if (lastPrice > avgPrice * 1.02) price_trend = "עלייה";
    else if (lastPrice < avgPrice * 0.98) price_trend = "ירידה";

    // Find dates for min/max
    const minEntry = purchases.find((p) => p.unit_price === minPrice);
    const maxEntry = purchases.find((p) => p.unit_price === maxPrice);

    return Response.json({
      success: true,
      purchases,
      stats: {
        min_price: minPrice,
        min_price_date: minEntry?.purchase_date,
        max_price: maxPrice,
        max_price_date: maxEntry?.purchase_date,
        avg_price: avgPrice,
        total_purchases: totalPurchases,
        price_trend,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
