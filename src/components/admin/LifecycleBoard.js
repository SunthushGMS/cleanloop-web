"use client";

import { useState } from "react";
import AssetValuePanel from "./AssetValuePanel";
import ReplacementPanel from "./ReplacementPanel";
import RetirementPanel from "./RetirementPanel";

const TABS = [
  { id: "value", label: "Asset value" },
  { id: "replacement", label: "Replacement" },
  { id: "retirement", label: "Retirement & disposal" },
];

export default function LifecycleBoard() {
  const [tab, setTab] = useState("value");

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2 border-b border-loop-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.id
                ? "border-brand-500 text-loop-900"
                : "border-transparent text-loop-500 hover:text-loop-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "value" && <AssetValuePanel />}
        {tab === "replacement" && <ReplacementPanel />}
        {tab === "retirement" && <RetirementPanel />}
      </div>
    </div>
  );
}