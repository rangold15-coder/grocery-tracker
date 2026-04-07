export const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
] as const;

/**
 * Format a (month, year) pair as a Hebrew label, e.g. "מרץ 2026".
 * @param month 1-12
 * @param year e.g. 2026
 */
export function formatMonthYear(month: number, year: number): string {
  return `${HEBREW_MONTHS[month - 1]} ${year}`;
}
