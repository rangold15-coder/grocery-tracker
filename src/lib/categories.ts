export interface CategoryInfo {
  name: string;
  color: string;
  bgColor: string;
  emoji: string;
}

export const CATEGORIES: Record<string, CategoryInfo> = {
  "ירקות ופירות": { name: "ירקות ופירות", color: "#16A34A", bgColor: "#DCFCE7", emoji: "🥦" },
  "חלב וביצים": { name: "חלב וביצים", color: "#2563EB", bgColor: "#DBEAFE", emoji: "🥛" },
  "בשר ודגים": { name: "בשר ודגים", color: "#DC2626", bgColor: "#FEE2E2", emoji: "🥩" },
  "חטיפים ומתוקים": { name: "חטיפים ומתוקים", color: "#D97706", bgColor: "#FEF3C7", emoji: "🍫" },
  "שתייה": { name: "שתייה", color: "#0891B2", bgColor: "#CFFAFE", emoji: "🥤" },
  "ניקיון": { name: "ניקיון", color: "#7C3AED", bgColor: "#EDE9FE", emoji: "🧹" },
  "טיפוח": { name: "טיפוח", color: "#DB2777", bgColor: "#FCE7F3", emoji: "🧴" },
  "רטבים ותבלינים": { name: "רטבים ותבלינים", color: "#EA580C", bgColor: "#FFEDD5", emoji: "🌶️" },
  "שימורים": { name: "שימורים", color: "#65A30D", bgColor: "#ECFCCB", emoji: "🥫" },
  "דגני בוקר": { name: "דגני בוקר", color: "#CA8A04", bgColor: "#FEF9C3", emoji: "🥣" },
  "לחם ומאפים": { name: "לחם ומאפים", color: "#92400E", bgColor: "#FDE68A", emoji: "🍞" },
  "קפואים": { name: "קפואים", color: "#0369A1", bgColor: "#E0F2FE", emoji: "🧊" },
  "חד פעמי": { name: "חד פעמי", color: "#6B7280", bgColor: "#F3F4F6", emoji: "🍽️" },
  "אחר": { name: "אחר", color: "#9CA3AF", bgColor: "#F3F4F6", emoji: "📦" },
};

export function getCategoryInfo(categoryName: string): CategoryInfo {
  return CATEGORIES[categoryName] || CATEGORIES["אחר"];
}
