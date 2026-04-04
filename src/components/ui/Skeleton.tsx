interface SkeletonProps {
  variant?: "text" | "card" | "avatar" | "receipt-row";
  lines?: number;
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-gray-200 shimmer ${className || ""}`}
    />
  );
}

export function Skeleton({ variant = "text", lines = 3 }: SkeletonProps) {
  if (variant === "avatar") {
    return <ShimmerBlock className="w-10 h-10 rounded-full" />;
  }

  if (variant === "card") {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
        <ShimmerBlock className="h-4 w-3/4" />
        <ShimmerBlock className="h-3 w-1/2" />
        <ShimmerBlock className="h-3 w-5/6" />
      </div>
    );
  }

  if (variant === "receipt-row") {
    return (
      <div className="flex items-center gap-3 py-3">
        <ShimmerBlock className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-3.5 w-3/5" />
          <ShimmerBlock className="h-3 w-2/5" />
        </div>
        <ShimmerBlock className="h-4 w-14 flex-shrink-0" />
      </div>
    );
  }

  // text variant
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBlock
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-3/5" : "w-full"}`}
        />
      ))}
    </div>
  );
}
