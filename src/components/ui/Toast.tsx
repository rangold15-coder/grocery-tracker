"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface ToastItem {
  id: number;
  type: "success" | "error" | "info";
  message: string;
  leaving?: boolean;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const ICONS = {
  success: "✓",
  error: "✗",
  info: "ℹ",
};

const STYLES = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-blue-500 text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = nextId.current++;

      setToasts((prev) => {
        const updated = [...prev, { ...toast, id }];
        // Max 3 toasts
        if (updated.length > 3) return updated.slice(-3);
        return updated;
      });

      // Start leave animation after 2.5s
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
      }, 2500);

      // Remove after 3s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 min-w-[200px] max-w-sm
              pointer-events-auto
              ${STYLES[toast.type]}
              ${toast.leaving
                ? "animate-[fadeOut_500ms_ease-out_forwards]"
                : "animate-[slideUp_300ms_ease-out_forwards]"
              }
            `}
          >
            <span className="text-lg font-bold">{ICONS[toast.type]}</span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
