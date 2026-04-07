"use client";

import PageLayout from "@/components/layout/PageLayout";
import { ExportReportCard } from "@/components/ExportReportCard";

export default function ReportsPage() {
  return (
    <PageLayout title="דוחות">
      <div className="space-y-4">
        <ExportReportCard />
      </div>
    </PageLayout>
  );
}
