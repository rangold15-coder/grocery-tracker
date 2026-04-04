import { supabase } from "@/lib/supabase";

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export async function GET() {
  try {
    // Get budget settings
    const { data: settings } = await supabase
      .from("budget_settings")
      .select("*")
      .limit(1)
      .single();

    const monthlyLimit = settings?.monthly_limit ?? 0;

    // Calculate current month spending
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const nextMonth = now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;

    const { data: receipts } = await supabase
      .from("receipts")
      .select("total_amount, total_after_discount")
      .gte("purchase_date", firstOfMonth)
      .lt("purchase_date", nextMonth);

    const spent = (receipts || []).reduce((sum: number, r: { total_after_discount?: number | null; total_amount?: number | null }) => sum + (r.total_after_discount ?? r.total_amount ?? 0), 0);
    const remaining = monthlyLimit - spent;
    const percentage = monthlyLimit > 0 ? Math.round((spent / monthlyLimit) * 100) : 0;

    let status: "ok" | "warning" | "exceeded" = "ok";
    if (percentage >= 100) status = "exceeded";
    else if (percentage >= 80) status = "warning";

    const monthLabel = `${HEBREW_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

    return Response.json({
      success: true,
      budget: {
        monthly_limit: monthlyLimit,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percentage,
        status,
        month_label: monthLabel,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const monthlyLimit = Number(body.monthly_limit);

    if (isNaN(monthlyLimit) || monthlyLimit < 0) {
      return Response.json(
        { success: false, error: "תקציב חייב להיות 0 או יותר" },
        { status: 400 }
      );
    }

    // Get existing row id
    const { data: existing } = await supabase
      .from("budget_settings")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from("budget_settings")
        .update({
          monthly_limit: monthlyLimit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("budget_settings").insert({
        monthly_limit: monthlyLimit,
      });
    }

    return Response.json({ success: true, monthly_limit: monthlyLimit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
