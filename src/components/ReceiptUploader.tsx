"use client";

import { useState, useRef } from "react";

interface ReceiptUploaderProps {
  onResult: (data: {
    items: ReceiptItem[];
    storeName: string;
    totalAmount: number;
    date: string;
  }) => void;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ReceiptUploader({ onResult }: ReceiptUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("הקובץ גדול מדי. הגודל המקסימלי הוא 10MB.");
      return;
    }

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ];
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".heic")) {
      setError("סוג קובץ לא נתמך. השתמש ב-JPG, PNG, WebP או HEIC.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      const base64 = result.split(",")[1];
      const mimeType = file.type === "image/heic" ? "image/jpeg" : file.type;
      setImageData({ base64, mimeType });
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imageData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData.base64,
          mimeType: imageData.mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "שגיאה בניתוח החשבונית");
        return;
      }

      onResult(data);
    } catch {
      setError("שגיאה בתקשורת עם השרת. בדוק את החיבור לאינטרנט.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPreview(null);
    setImageData(null);
    setError(null);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {!preview ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-400 text-white py-4 px-6 rounded-xl text-lg font-medium hover:bg-blue-500 active:bg-blue-600 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              צלם חשבונית
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-700 py-4 px-6 rounded-xl text-lg font-medium hover:bg-blue-50 active:bg-blue-100 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              העלה תמונה
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <p className="text-sm text-gray-500">
            תומך ב-JPG, PNG, WebP, HEIC — עד 10MB
          </p>
        </>
      ) : (
        <>
          <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-white">
            <img
              src={preview}
              alt="תצוגה מקדימה של החשבונית"
              className="w-full max-h-80 object-contain"
            />
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-400 text-white py-3 px-6 rounded-xl text-lg font-medium hover:bg-blue-500 active:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  מנתח חשבונית...
                </>
              ) : (
                "נתח חשבונית"
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              className="py-3 px-4 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
