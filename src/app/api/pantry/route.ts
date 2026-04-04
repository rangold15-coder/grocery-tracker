import { supabase } from "@/lib/supabase";

// GET — return all items in pantry (not finished)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pantry")
      .select("*")
      .eq("is_finished", false)
      .order("category", { ascending: true })
      .order("product_name", { ascending: true });

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בטעינה: ${error.message}` },
        { status: 500 }
      );
    }

    // ניקוי מוצרים יתומים — מוצרים שאין להם חשבונית תואמת
    if (data && data.length > 0) {
      const uniqueNames = [...new Set(data.map((item: { product_name: string }) => item.product_name))];
      const { data: existingItems } = await supabase
        .from("receipt_items")
        .select("name")
        .in("name", uniqueNames);

      const existingNames = new Set((existingItems || []).map((i: { name: string }) => i.name));
      const orphanedItems = data.filter((item: { product_name: string }) => !existingNames.has(item.product_name));

      if (orphanedItems.length > 0) {
        const orphanedIds = orphanedItems.map((item: { id: string }) => item.id);
        await supabase.from("pantry").delete().in("id", orphanedIds);
        // החזרת רק מוצרים תקינים
        const validItems = data.filter((item: { product_name: string }) => existingNames.has(item.product_name));
        return Response.json({ success: true, items: validItems });
      }
    }

    return Response.json({ success: true, items: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PATCH — mark item as finished
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return Response.json(
        { success: false, error: "מזהה חסר" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("pantry")
      .update({
        is_finished: true,
        finished_at: new Date().toISOString(),
      })
      .eq("id", body.id);

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בעדכון: ${error.message}` },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
