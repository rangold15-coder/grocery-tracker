import { supabase } from "@/lib/supabase";

interface Suggestion {
  name: string;
  category: string;
  reason: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentList: string[] = body.current_list || [];

    // Check minimum history
    const { count: receiptCount } = await supabase
      .from("receipts")
      .select("*", { count: "exact", head: true });

    if (!receiptCount || receiptCount < 3) {
      return Response.json({
        success: true,
        suggestions: [],
        message: "צבור עוד קניות כדי לקבל הצעות מותאמות אישית",
      });
    }

    // Get dismissed suggestions from last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: dismissed } = await supabase
      .from("dismissed_suggestions")
      .select("product_name")
      .gte("dismissed_at", weekAgo.toISOString());

    const dismissedNames = new Set(
      (dismissed || []).map((d) => d.product_name)
    );

    // Get top products by purchase count
    const { data: topProducts } = await supabase
      .from("products")
      .select("name, category, purchase_count, last_purchased, avg_price")
      .order("purchase_count", { ascending: false })
      .limit(20);

    // Get last 10 receipts with items
    const { data: recentReceipts } = await supabase
      .from("receipts")
      .select("id, purchase_date, receipt_items(name, category)")
      .order("purchase_date", { ascending: false })
      .limit(10);

    // Build frequent combos (products that appear together in 3+ receipts)
    const coOccurrence: Record<string, Record<string, number>> = {};
    if (recentReceipts) {
      for (const receipt of recentReceipts) {
        const items = receipt.receipt_items as { name: string; category: string }[];
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            const key = items[i].name;
            const val = items[j].name;
            if (!coOccurrence[key]) coOccurrence[key] = {};
            if (!coOccurrence[val]) coOccurrence[val] = {};
            coOccurrence[key][val] = (coOccurrence[key][val] || 0) + 1;
            coOccurrence[val][key] = (coOccurrence[val][key] || 0) + 1;
          }
        }
      }
    }

    // Try Gemini API first
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const suggestions = await getGeminiSuggestions(
          geminiKey,
          topProducts || [],
          recentReceipts || [],
          coOccurrence,
          currentList
        );
        if (suggestions.length > 0) {
          const filtered = suggestions.filter(
            (s) => !currentList.includes(s.name) && !dismissedNames.has(s.name)
          );
          return Response.json({ success: true, suggestions: filtered.slice(0, 5) });
        }
      } catch {
        // Fallback to algorithmic
      }
    }

    // Algorithmic suggestions (fallback)
    const suggestions = getAlgorithmicSuggestions(
      topProducts || [],
      coOccurrence,
      currentList,
      dismissedNames
    );

    return Response.json({ success: true, suggestions: suggestions.slice(0, 5) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function getGeminiSuggestions(
  apiKey: string,
  topProducts: { name: string; category: string; purchase_count: number }[],
  recentReceipts: { id: string; purchase_date: string; receipt_items: unknown }[],
  coOccurrence: Record<string, Record<string, number>>,
  currentList: string[]
): Promise<Suggestion[]> {
  const currentMonth = new Date().toLocaleString("he-IL", { month: "long" });

  // Build frequent combos string
  const combos: string[] = [];
  const seen = new Set<string>();
  for (const [product, partners] of Object.entries(coOccurrence)) {
    for (const [partner, count] of Object.entries(partners)) {
      if (count >= 3 && !seen.has(`${partner}|${product}`)) {
        combos.push(`${product} + ${partner} (${count} פעמים)`);
        seen.add(`${product}|${partner}`);
      }
    }
  }

  const prompt = `אתה עוזר חכם לניהול קניות משפחה ישראלית.
בהתבסס על ההיסטוריה הבאה:
- מוצרים שנקנים הכי הרבה: ${topProducts.slice(0, 10).map((p) => `${p.name} (${p.purchase_count} פעמים)`).join(", ")}
- חודש נוכחי: ${currentMonth}
- צמדי מוצרים שנרכשים יחד: ${combos.slice(0, 5).join(", ") || "אין מספיק נתונים"}
- רשימת הקניות הנוכחית: ${currentList.join(", ") || "ריקה"}

הצע עד 5 מוצרים שכדאי להוסיף לרשימה.
כללים:
- אל תציע מוצרים שכבר ברשימה
- העדף מוצרים עם תדירות קנייה גבוהה
- הסבר בקצרה למה כל הצעה רלוונטית
- ענה JSON בלבד, ללא טקסט נוסף:
[{ "name": "string", "category": "string", "reason": "string" }]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      }),
    }
  );

  if (!response.ok) throw new Error("Gemini API error");

  const data = await response.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  // Clean markdown fences
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(text) as Suggestion[];
}

function getAlgorithmicSuggestions(
  topProducts: { name: string; category: string; purchase_count: number; last_purchased: string | null }[],
  coOccurrence: Record<string, Record<string, number>>,
  currentList: string[],
  dismissedNames: Set<string>
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const currentSet = new Set(currentList);

  // Strategy 1: Products bought frequently but not in current list
  for (const product of topProducts) {
    if (currentSet.has(product.name) || dismissedNames.has(product.name)) continue;

    const daysSince = product.last_purchased
      ? Math.floor(
          (Date.now() - new Date(product.last_purchased).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    if (daysSince && daysSince > 14) {
      suggestions.push({
        name: product.name,
        category: product.category,
        reason: `נקנה ${product.purchase_count} פעמים, לא נקנה ${daysSince} ימים`,
      });
    }

    if (suggestions.length >= 5) break;
  }

  // Strategy 2: Products commonly bought with items in current list
  if (suggestions.length < 5) {
    for (const item of currentList) {
      const partners = coOccurrence[item];
      if (!partners) continue;
      const sorted = Object.entries(partners).sort((a, b) => b[1] - a[1]);
      for (const [partner, count] of sorted) {
        if (
          count >= 2 &&
          !currentSet.has(partner) &&
          !dismissedNames.has(partner) &&
          !suggestions.find((s) => s.name === partner)
        ) {
          const product = topProducts.find((p) => p.name === partner);
          suggestions.push({
            name: partner,
            category: product?.category || "אחר",
            reason: `נקנה יחד עם ${item} ${count} פעמים`,
          });
          if (suggestions.length >= 5) break;
        }
      }
      if (suggestions.length >= 5) break;
    }
  }

  return suggestions;
}
