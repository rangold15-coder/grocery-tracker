export type ExportPeriod = "month" | "year" | "all";

export interface ExportRow {
  receipt_id: string;
  purchase_date: string; // ISO date string
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  paid_price: number; // total_price after discount
  original_price: number; // pre-discount (unit_price * quantity)
  discount_amount: number; // original_price - paid_price (>= 0)
  store_name: string;
}

export interface ExportPayload {
  rows: ExportRow[];
  total: number; // total spent in the period
  period: ExportPeriod;
  periodLabel: string; // e.g. "מרץ 2026" / "שנת 2026" / "כל התקופה"
  /** Slug suitable for filenames — e.g. "מרץ-2026", "2026", "הכל" */
  periodSlug: string;
}
