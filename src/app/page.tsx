"use client";

import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import BudgetCard from "@/components/BudgetCard";
import BudgetSettingsModal from "@/components/BudgetSettingsModal";
import ScanHero from "@/components/ScanHero";
import QuickActions from "@/components/QuickActions";
import RecentActivity from "@/components/RecentActivity";

export default function Home() {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);
  const [currentBudgetLimit, setCurrentBudgetLimit] = useState(0);

  return (
    <PageLayout title="גרוסרי">
      <div className="flex flex-col gap-5">
        <ScanHero />

        <BudgetCard
          onEditBudget={(limit) => {
            setCurrentBudgetLimit(limit);
            setShowBudgetModal(true);
          }}
          refreshKey={budgetRefreshKey}
        />

        <QuickActions />

        <RecentActivity />
      </div>

      {showBudgetModal && (
        <BudgetSettingsModal
          currentLimit={currentBudgetLimit}
          onSaved={() => {
            setShowBudgetModal(false);
            setBudgetRefreshKey((k) => k + 1);
          }}
          onClose={() => setShowBudgetModal(false)}
        />
      )}
    </PageLayout>
  );
}
