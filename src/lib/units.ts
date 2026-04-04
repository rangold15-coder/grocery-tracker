export const UNITS = ['יחידות', 'קג', 'גרם', 'ליטר', 'מ"ל'] as const;
export type Unit = typeof UNITS[number];

export function detectUnit(productName: string): Unit {
  const name = productName.toLowerCase();

  const weightKeywords = ['קג', 'ק"ג', 'גרם', "ג'", 'kg', 'gram'];
  const volumeKeywords = ['ליטר', "ל'", 'מ"ל', 'מיליליטר', 'liter', 'ml'];

  if (weightKeywords.some(k => name.includes(k))) return 'קג';
  if (volumeKeywords.some(k => name.includes(k))) return 'ליטר';
  return 'יחידות';
}

export function formatQuantity(quantity: number, unit: string): string {
  if (unit === 'יחידות') {
    return `${Math.round(quantity)} ${unit}`;
  }
  return `${quantity % 1 === 0 ? quantity.toFixed(0) : quantity} ${unit}`;
}

export function getStep(unit: Unit): number {
  return unit === 'יחידות' ? 1 : 0.1;
}

export function getMin(unit: Unit): number {
  return unit === 'יחידות' ? 0.5 : 0.1;
}

export function normalizePricePer100(unitPrice: number, unit: string): { price: number; label: string } {
  switch (unit) {
    case 'קג':
      return { price: unitPrice / 10, label: 'ל-100 גרם' };
    case 'גרם':
      return { price: unitPrice * 100, label: 'ל-100 גרם' };
    case 'ליטר':
      return { price: unitPrice / 10, label: 'ל-100 מ"ל' };
    case 'מ"ל':
      return { price: unitPrice * 100, label: 'ל-100 מ"ל' };
    default:
      return { price: unitPrice, label: 'ליחידה' };
  }
}
