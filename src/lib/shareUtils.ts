import { getCategoryInfo } from "./categories";

interface ShareableItem {
  product_name: string;
  category: string;
  is_checked: boolean;
  quantity: number;
  unit: string;
  notes: string | null;
}

export function buildWhatsAppMessage(items: ShareableItem[]): string | null {
  const unchecked = items.filter((i) => !i.is_checked);
  if (unchecked.length === 0) return null;

  // Group by category
  const grouped: Record<string, ShareableItem[]> = {};
  for (const item of unchecked) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const today = new Date();
  const date = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  let msg = `🛒 *רשימת קניות*\n📅 תאריך: ${date}\n`;

  for (const [cat, catItems] of Object.entries(grouped)) {
    const info = getCategoryInfo(cat);
    msg += `\n*${info.emoji} ${cat}:*\n`;

    for (const item of catItems) {
      let line = `• ${item.product_name}`;

      // Add quantity
      if (item.quantity > 1 || (item.unit && item.unit !== "יחידות")) {
        if (item.unit === "יחידות") {
          line += ` × ${item.quantity}`;
        } else {
          line += ` × ${item.quantity} ${item.unit}`;
        }
      }

      // Add notes
      if (item.notes) {
        line += ` (${item.notes})`;
      }

      msg += line + "\n";
    }
  }

  msg += `\n———————————\nסה"כ: ${unchecked.length} פריטים\n📲 נשלח מאפליקציית grocery-tracker`;

  return msg;
}

export function shareToWhatsApp(message: string): void {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
}

export async function shareList(message: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "רשימת קניות",
        text: message,
      });
      return;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }
  shareToWhatsApp(message);
}

export async function copyToClipboard(message: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message);
    return true;
  } catch {
    return false;
  }
}
