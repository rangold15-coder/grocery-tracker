"use client";

interface PullToRefreshProps {
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
  threshold: number;
}

export function PullToRefresh({ pulling, refreshing, pullDistance, threshold }: PullToRefreshProps) {
  if (!pulling && !refreshing) return null;

  const ready = pullDistance >= threshold;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: pullDistance }}
    >
      <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm">
        {refreshing ? (
          <>
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>מרענן...</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 transition-transform duration-200"
              style={{ transform: ready ? "rotate(180deg)" : "rotate(0deg)" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>{ready ? "שחרר לרענון..." : "גרור למטה לרענון"}</span>
          </>
        )}
      </div>
    </div>
  );
}
