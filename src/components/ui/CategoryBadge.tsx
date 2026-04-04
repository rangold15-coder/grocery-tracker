import { getCategoryInfo } from "@/lib/categories";

interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const info = getCategoryInfo(category);

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: info.bgColor, color: info.color }}
    >
      <span>{info.emoji}</span>
      {info.name}
    </span>
  );
}
