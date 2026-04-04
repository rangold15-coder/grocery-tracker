interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 animate-fade-in-up">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-blue-400 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
