import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
  hoverable?: boolean;
  onClick?: () => void;
}

const PADDING_STYLES = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  padding = "md",
  hoverable = false,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-sm
        ${PADDING_STYLES[padding]}
        ${hoverable ? "transition-all duration-220 hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}
        ${onClick ? "cursor-pointer" : ""}
      `}
    >
      {children}
    </div>
  );
}
