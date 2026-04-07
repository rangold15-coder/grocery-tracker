import { supabase } from "@/lib/supabase";
import { formatMonthYear } from "@/lib/export/hebrew-months";
import type { ExportRow, ExportPeriod } from "@/lib/export/types";

interface ReceiptItemRow {
  receipt_id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  total_price: number;
  receipts: {
    purchase_date: string;
    store_name: string | null;
  } | null;
}

interface PeriodRange {
  from: string | null; // inclusive, YYYY-MM-DD
  to: string | null; // exclusive, YYYY-MM-DD
  label: string;
  slug: string;
}

function resolvePeriod(
  period: ExportPeriod,
  month: number,
  year: number
): PeriodRange | null {
  if (period === "all") {
    return { from: null, to: null, label: "כל התקופה", slug: "הכל" };
  }
  if (period === "year") {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
    return {
      from: `${year}-01-01`,
      to: `${year + 1}-01-01`,
      label: `שנת ${year}`,
      slug: `${year}`,
    };
  }
  // month
  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const label = formatMonthYear(month, year);
  return { from, to, label, slug: label.replace(/\s+/g, "-") };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "month") as ExportPeriod;
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (period !== "month" && period !== "year" && period !== "all") {
      return Response.json(
        { success: false, error: "תקופה לא תקינה" },
        { status: 400 }
      );
    }

    const range = resolvePeriod(period, month, year);
    if (!range) {
      return Response.json(
        { success: false, error: "חודש או שנה לא תקינים" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("receipt_items")
      .select(
        `receipt_id, name, category, quantity, unit, unit_price, total_price,
         receipts!inner (purchase_date, store_name)`
      );
    if (range.from) query = query.gte("receipts.purchase_date", range.from);
    if (range.to) query = query.lt("receipts.purchase_date", range.to);

    const { data, error } = await query;

    if (error) {
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const items = (data ?? []) as unknown as ReceiptItemRow[];

    const rows: ExportRow[] = items
      .filter((item) => item.receipts !== null)
      .map((item) => {
        const paid = Number(item.total_price) || 0;
        const original =
          Number(item.unit_price) * Number(item.quantity) || paid;
        const discount = Math.max(0, original - paid);
        return {
          receipt_id: item.receipt_id,
          purchase_date: item.receipts!.purchase_date,
          name: item.name,
          category: item.category,
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
          paid_price: Math.round(paid * 100) / 100,
          original_price: Math.round(original * 100) / 100,
          discount_amount: Math.round(discount * 100) / 100,
          store_name: item.receipts!.store_name ?? "",
        };
      })
      .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));

    const total =
      Math.round(rows.reduce((sum, r) => sum + r.paid_price, 0) * 100) / 100;

    return Response.json({
      success: true,
      rows,
      total,
      period,
      periodLabel: range.label,
      periodSlug: range.slug,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה לא ידועה";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
