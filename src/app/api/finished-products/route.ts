import { supabase } from "@/lib/supabase";

// GET — return all finished pantry items
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pantry")
      .select("*")
      .eq("is_finished", true)
      .order("finished_at", { ascending: false });

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה בטעינה: ${error.message}` },
        { status: 500 }
      );
    }

    return Response.json({ success: true, items: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PATCH — repurchase item (return to pantry)
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
        is_finished: false,
        finished_at: null,
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

// DELETE — permanently remove item
export async function DELETE(request: Request) {
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
      .delete()
      .eq("id", body.id);

    if (error) {
      return Response.json(
        { success: false, error: `שגיאה במחיקה: ${error.message}` },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
