import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 1) {
    return Response.json(
      { success: false, error: "חסר פרמטר חיפוש" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("products")
    .select("name, category, avg_price")
    .ilike("name", `${q}%`)
    .order("purchase_count", { ascending: false })
    .limit(8);

  if (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return Response.json({ success: true, products: data || [] });
}
