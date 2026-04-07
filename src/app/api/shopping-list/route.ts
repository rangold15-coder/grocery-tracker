import { supabase } from "@/lib/supabase";

// GET — return current shopping list
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("shopping_list")
      .select("*")
      .eq("is_checked", false)
      .eq("source", "manual")
      .order("category", { ascending: true });

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בטעינת הרשימה: ${error.message}` },
        { status: 500 }
      );
    }

    return Response.json({ success: true, items: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST — add item manually
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.product_name?.trim()) {
      return Response.json(
        { success: false, error: "שם המוצר חסר" },
        { status: 400 }
      );
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from("shopping_list")
      .select("id")
      .eq("product_name", body.product_name.trim())
      .eq("is_checked", false)
      .single();

    if (existing) {
      return Response.json(
        { success: false, error: `"${body.product_name}" כבר נמצא ברשימה` },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("shopping_list")
      .insert({
        product_name: body.product_name.trim(),
        category: body.category || "אחר",
        source: "manual",
        notes: body.notes || null,
        quantity: body.quantity || 1,
        unit: body.unit || 'יחידות',
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בהוספת המוצר: ${error.message}` },
        { status: 500 }
      );
    }

    return Response.json({ success: true, item: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PATCH — update item (quantity/unit or mark as checked)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return Response.json(
        { success: false, error: "מזהה הפריט חסר" },
        { status: 400 }
      );
    }

    // If updating quantity/unit only (no product_name = not a check operation)
    if ((body.quantity !== undefined || body.unit !== undefined) && !body.product_name) {
      const updates: Record<string, unknown> = {};
      if (body.quantity !== undefined) updates.quantity = body.quantity;
      if (body.unit !== undefined) updates.unit = body.unit;

      const { error } = await supabase
        .from("shopping_list")
        .update(updates)
        .eq("id", body.id);

      if (error) {
        return Response.json(
          { success: false, error: `שגיאה בעדכון: ${error.message}` },
          { status: 500 }
        );
      }

      return Response.json({ success: true });
    }

    const { error } = await supabase
      .from("shopping_list")
      .update({
        is_checked: true,
        checked_at: new Date().toISOString(),
      })
      .eq("id", body.id);

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בעדכון: ${error.message}` },
        { status: 500 }
      );
    }

    // Update products.last_purchased
    if (body.product_name) {
      await supabase
        .from("products")
        .update({ last_purchased: new Date().toISOString().split("T")[0] })
        .eq("name", body.product_name);
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE — clear checked items
export async function DELETE() {
  try {
    const { error } = await supabase
      .from("shopping_list")
      .delete()
      .eq("is_checked", true);

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה במחיקה: ${error.message}` },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
