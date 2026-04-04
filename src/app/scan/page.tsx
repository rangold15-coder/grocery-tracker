"use client";

import { useState } from "react";
import Link from "next/link";
import ReceiptUploader from "@/components/ReceiptUploader";
import ReceiptResults, { ReceiptItem } from "@/components/ReceiptResults";

type Step = "upload" | "loading" | "review";

interface ParsedReceipt {
  storeName: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
}

export default function ScanPage() {
  const [step, setStep] = useState<Step>("upload");
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);

  function handleResult(data: {
    items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number; category: string }>;
    storeName: string;
    totalAmount: number;
    date: string;
  }) {
    setReceipt({
      ...data,
      items: data.items.map((item) => ({
        ...item,
        unit: "יחידות",
      })),
    });
    setStep("review");
  }

  function handleNewReceipt() {
    setReceipt(null);
    setStep("upload");
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-surface)] flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="h-14 flex items-center px-4 max-w-[430px] mx-auto w-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-5 h-5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">חזרה</span>
          </Link>
          <h1 className="flex-1 text-center text-base font-bold text-[var(--color-text-primary)] ml-12">
            סריקת קבלה
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-[430px] mx-auto px-4 pb-8 pt-4">
        {step === "upload" && (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">צלם או העלה קבלה</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                ה-AI יזהה אוטומטית את כל המוצרים והמחירים
              </p>
            </div>

            <ReceiptUploader onResult={handleResult} />

            <div className="text-center pt-2">
              <Link
                href="/add"
                className="text-sm text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-primary-600)] transition-colors"
              >
                או הזן ידנית
              </Link>
            </div>
          </div>
        )}

        {step === "review" && receipt && (
          <ReceiptResults
            storeName={receipt.storeName}
            date={receipt.date}
            totalAmount={receipt.totalAmount}
            items={receipt.items}
            onNewReceipt={handleNewReceipt}
          />
        )}
      </div>
    </div>
  );
}
