import { supabase } from "@/lib/supabase";

interface UpdateItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  discountType?: 'percent' | 'fixed' | null;
  discountValue?: number | null;
}

interface UpdateReceiptRequest {
  storeName: string;
  date: string;
  totalAmount: number;
  items: UpdateItem[];
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateReceiptRequest = await request.json();

    if (!body.storeName || !body.date || !body.items || body.items.length === 0) {
      return Response.json(
        { success: false, error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    // Update receipt record
    const { error: receiptError } = await supabase
      .from("receipts")
      .update({
        store_name: body.storeName,
        purchase_date: body.date,
        total_amount: body.totalAmount,
      })
      .eq("id", id);

    if (receiptError) {
      return Response.json(
        { success: false, error: `שגיאה בעדכון החשבונית: ${receiptError.message}` },
        { status: 500 }
      );
    }

    // Delete old items and insert new ones
    const { error: deleteError } = await supabase
      .from("receipt_items")
      .delete()
      .eq("receipt_id", id);

    if (deleteError) {
      return Response.json(
        { success: false, error: `שגיאה במחיקת פריטים ישנים: ${deleteError.message}` },
        { status: 500 }
      );
    }

    const newItems = body.items.map((item) => ({
      receipt_id: id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit || 'יחידות',
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      is_edited: true,
      discount_type: item.discountType || null,
      discount_value: item.discountValue || 0,
    }));

    const { error: insertError } = await supabase
      .from("receipt_items")
      .insert(newItems);

    if (insertError) {
      return Response.json(
        { success: false, error: `שגיאה בשמירת פריטים חדשים: ${insertError.message}` },
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
