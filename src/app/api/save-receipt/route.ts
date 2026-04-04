import { supabase } from "@/lib/supabase";

interface SaveReceiptItem {
  name: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  discountType?: 'percent' | 'fixed' | null;
  discountValue?: number | null;
}

interface SaveReceiptRequest {
  storeName: string;
  date: string;
  totalAmount: number;
  items: SaveReceiptItem[];
  discountType?: 'percent' | 'fixed' | null;
  discountValue?: number | null;
  totalAfterDiscount?: number | null;
}

export async function POST(request: Request) {
  try {
    const body: SaveReceiptRequest = await request.json();

    // בדיקת שדות חובה
    if (!body.storeName || !body.date || !body.items || body.items.length === 0) {
      return Response.json(
        { success: false, error: "חסרים שדות חובה: שם חנות, תאריך, או מוצרים" },
        { status: 400 }
      );
    }

    // שלב 1: שמירת החשבונית
    const receiptInsert: Record<string, unknown> = {
      store_name: body.storeName,
      purchase_date: body.date,
      total_amount: body.totalAmount,
    };
    if (body.discountType) {
      receiptInsert.discount_type = body.discountType;
      receiptInsert.discount_value = body.discountValue;
      receiptInsert.total_after_discount = body.totalAfterDiscount;
    }

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .insert(receiptInsert)
      .select()
      .single();

    if (receiptError) {
      return Response.json(
        { success: false, error: `שגיאה בשמירת החשבונית: ${receiptError.message}` },
        { status: 500 }
      );
    }

    // שלב 2: שמירת המוצרים
    const receiptItems = body.items.map((item) => ({
      receipt_id: receipt.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit || 'יחידות',
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      is_edited: false,
      discount_type: item.discountType || null,
      discount_value: item.discountValue || 0,
    }));

    const { error: itemsError } = await supabase
      .from("receipt_items")
      .insert(receiptItems);

    if (itemsError) {
      // Rollback — מחיקת החשבונית אם שמירת הפריטים נכשלה
      await supabase.from("receipts").delete().eq("id", receipt.id);
      return Response.json(
        { success: false, error: `שגיאה בשמירת המוצרים: ${itemsError.message}` },
        { status: 500 }
      );
    }

    // שלב 3: עדכון טבלת מוצרים
    for (const item of body.items) {
      const { data: existing } = await supabase
        .from("products")
        .select()
        .eq("name", item.name)
        .single();

      if (existing) {
        const newCount = existing.purchase_count + item.quantity;
        const newAvg =
          ((existing.avg_price || 0) * existing.purchase_count +
            item.unitPrice * item.quantity) /
          newCount;

        await supabase
          .from("products")
          .update({
            category: item.category,
            last_purchased: body.date,
            avg_price: Math.round(newAvg * 100) / 100,
            purchase_count: newCount,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("products").insert({
          name: item.name,
          category: item.category,
          last_purchased: body.date,
          avg_price: item.unitPrice,
          purchase_count: item.quantity,
        });
      }
    }

    // שלב 4: עדכון מלאי הבית
    for (const item of body.items) {
      // בדיקה אם המוצר כבר קיים במזווה (ולא סומן כנגמר)
      const { data: existingPantry } = await supabase
        .from("pantry")
        .select("id, quantity")
        .eq("product_name", item.name)
        .eq("is_finished", false)
        .limit(1);

      if (existingPantry && existingPantry.length > 0) {
        // מוצר קיים — עדכון כמות
        await supabase
          .from("pantry")
          .update({ quantity: existingPantry[0].quantity + item.quantity })
          .eq("id", existingPantry[0].id);
      } else {
        // מוצר חדש — הוספה למזווה
        await supabase.from("pantry").insert({
          product_name: item.name,
          category: item.category,
          quantity: item.quantity,
        });
      }
    }

    return Response.json({ success: true, receiptId: receipt.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { success: false, error: `שגיאה בשמירת החשבונית: ${message}` },
      { status: 500 }
    );
  }
}
