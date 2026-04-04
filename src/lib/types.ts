export interface Receipt {
  id: string;
  created_at: string;
  store_name: string;
  purchase_date: string;
  total_amount: number;
  image_url: string | null;
  notes: string | null;
  discount_type: 'percent' | 'fixed' | null;
  discount_value: number | null;
  total_after_discount: number | null;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  created_at: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  is_edited: boolean;
  discount_type: 'percent' | 'fixed' | null;
  discount_value: number | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  last_purchased: string | null;
  avg_price: number | null;
  purchase_count: number;
}

// Receipt with its items included
export interface ReceiptWithItems extends Receipt {
  receipt_items: ReceiptItem[];
}

export interface BudgetSettings {
  id: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  monthly_limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}
