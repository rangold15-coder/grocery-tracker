import { supabase } from "@/lib/supabase";
import { normalizePricePer100 } from "@/lib/units";

interface RawItem {
  name: string;
  unit: string;
  unit_price: number;
  total_price: number;
  receipts: { purchase_date: string } | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    if (!category) {
      return Response.json(
        { success: false, error: "חסר שם קטגוריה" },
        { status: 400 }
      );
    }

    const { data: items, error } = await supabase
      .from("receipt_items")
      .select("name, unit, unit_price, total_price, receipts(purchase_date)")
      .eq("category", category)
      .order("created_at", { ascending: true });

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בשליפת נתונים: ${error.message}` },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return Response.json(
        { success: false, error: "לא נמצאו מוצרים בקטגוריה זו" },
        { status: 404 }
      );
    }

    // Group by product name
    const productMap = new Map<
      string,
      {
        totalSpent: number;
        purchaseCount: number;
        units: Record<string, number>;
        prices: number[];
        priceHistory: { date: string; price: number }[];
      }
    >();

    for (const item of items as unknown as RawItem[]) {
      const receipt = item.receipts;
      const date = receipt?.purchase_date || "";

      if (!productMap.has(item.name)) {
        productMap.set(item.name, {
          totalSpent: 0,
          purchaseCount: 0,
          units: {},
          prices: [],
          priceHistory: [],
        });
      }

      const product = productMap.get(item.name)!;
      product.totalSpent += item.total_price;
      product.purchaseCount += 1;
      product.units[item.unit] = (product.units[item.unit] || 0) + 1;
      product.prices.push(item.unit_price);
      if (date) {
        product.priceHistory.push({ date, price: item.unit_price });
      }
    }

    // Build result array, sort by totalSpent desc, take top 10
    const products = Array.from(productMap.entries())
      .map(([name, data]) => {
        // Most common unit
        const unit = Object.entries(data.units).sort((a, b) => b[1] - a[1])[0][0];

        // Average unit price
        const avgUnitPrice =
          Math.round((data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100) / 100;

        // Normalized price
        const normalized = normalizePricePer100(avgUnitPrice, unit);

        // Sort price history by date, keep last 10
        const sortedHistory = data.priceHistory
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-10);

        // Trend: compare last price to average
        const lastPrice = data.prices[data.prices.length - 1];
        let trend: "up" | "down" | "stable" = "stable";
        if (lastPrice > avgUnitPrice * 1.02) trend = "up";
        else if (lastPrice < avgUnitPrice * 0.98) trend = "down";

        return {
          name,
          totalSpent: Math.round(data.totalSpent * 100) / 100,
          purchaseCount: data.purchaseCount,
          unit,
          avgUnitPrice,
          normalizedPrice: Math.round(normalized.price * 100) / 100,
          normalizedLabel: normalized.label,
          priceHistory: sortedHistory,
          trend,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return Response.json({ success: true, products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
