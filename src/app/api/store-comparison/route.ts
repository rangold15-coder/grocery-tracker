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

    const { data: history, error } = await supabase
      .from("receipt_items")
      .select("unit_price, quantity, total_price, created_at, receipts(purchase_date, store_name)")
      .eq("name", name)
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בשליפת נתונים: ${error.message}` },
        { status: 500 }
      );
    }

    if (!history || history.length === 0) {
      return Response.json(
        { success: false, error: "לא נמצאו רכישות למוצר זה" },
        { status: 404 }
      );
    }

    // Group by store
    const storeMap: Record<string, { prices: number[]; lastDate: string; totalQuantity: number }> = {};

    for (const item of history) {
      const receipt = item.receipts as unknown as { purchase_date: string; store_name: string } | null;
      const storeName = receipt?.store_name || "לא ידוע";
      const date = receipt?.purchase_date || item.created_at.split("T")[0];

      if (!storeMap[storeName]) {
        storeMap[storeName] = { prices: [], lastDate: date, totalQuantity: 0 };
      }
      storeMap[storeName].prices.push(item.unit_price);
      storeMap[storeName].totalQuantity += item.quantity;
      if (date > storeMap[storeName].lastDate) {
        storeMap[storeName].lastDate = date;
      }
    }

    const stores = Object.entries(storeMap)
      .map(([storeName, data]) => {
        const prices = data.prices;
        const avg = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
        return {
          store_name: storeName,
          avg_price: avg,
          min_price: Math.min(...prices),
          max_price: Math.max(...prices),
          last_price: prices[prices.length - 1],
          purchase_count: prices.length,
          last_date: data.lastDate,
        };
      })
      .sort((a, b) => a.avg_price - b.avg_price);

    return Response.json({ success: true, stores });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
