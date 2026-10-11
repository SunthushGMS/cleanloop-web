"use client";

import { useState } from "react";
import FuelPanel from "./FuelPanel";
import UtilizationPanel from "./UtilizationPanel";

const TABS = [
  { id: "fuel", label: "Fuel" },
  { id: "utilization", label: "Utilization" },
];

export default function FuelUtilizationBoard() {
  const [tab, setTab] = useState("fuel");

  return (
    <div className="mt-6">
      <div className="flex gap-2 border-b border-loop-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === t.id
                ? "border-amber-500 text-loop-950"
                : "border-transparent text-loop-500 hover:text-loop-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{tab === "fuel" ? <FuelPanel /> : <UtilizationPanel />}</div>
    </div>
  );
}