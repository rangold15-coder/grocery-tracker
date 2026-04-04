"use client";

import Link from "next/link";

export default function ScanHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-bl from-blue-500 to-blue-600 p-6 text-white shadow-lg">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="80" cy="20" r="30" fill="white" />
          <circle cx="10" cy="80" r="20" fill="white" />
        </svg>
      </div>

      <div className="relative flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold">סרוק קבלה</h2>
          <p className="text-blue-100 text-sm mt-1">צלם את הקבלה ו-AI יעשה את השאר</p>
        </div>

        <Link
          href="/scan"
          className="w-full py-3.5 rounded-xl bg-white text-blue-600 font-bold text-base text-center hover:bg-blue-50 active:scale-[0.97] transition-all shadow-sm"
        >
          התחל סריקה
        </Link>

        <Link
          href="/add"
          className="text-sm text-blue-200 underline underline-offset-2 hover:text-white transition-colors"
        >
          או הזן ידנית
        </Link>
      </div>
    </div>
  );
}
