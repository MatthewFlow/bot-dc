"use client";

import { MousePointerClick, SmilePlus } from "lucide-react";
import { useState } from "react";

import { ButtonRolesEditor } from "@/components/roles/ButtonRolesEditor";
import { ReactionRolesEditor } from "@/components/roles/ReactionRolesEditor";

type Mode = "button" | "reaction";

/** Wspólna strona ról samoprzydzielanych — zakładki przełączają edytor przycisków/reakcji. */
export default function RolesPage() {
  const [mode, setMode] = useState<Mode>("button");

  const tab = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
      active ? "bg-primary text-black" : "bg-card text-gray-300 hover:text-white"
    }`;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap gap-2 px-4 pt-6 sm:px-6 lg:px-8">
        <button onClick={() => setMode("button")} className={tab(mode === "button")}>
          <MousePointerClick size={16} />
          Przyciski
        </button>
        <button onClick={() => setMode("reaction")} className={tab(mode === "reaction")}>
          <SmilePlus size={16} />
          Reakcje
        </button>
      </div>
      {mode === "button" ? <ButtonRolesEditor /> : <ReactionRolesEditor />}
    </div>
  );
}
