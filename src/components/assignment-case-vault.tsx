"use client";

import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Clock, CheckCircle, FileText, BarChart3, AlertCircle } from "lucide-react";

export interface VaultPrompt {
  id: string;
  orgName: string;
  orgSlug?: string;
  roleTitle?: string | null;
  timeLimit?: string | null;
  tools?: string | null;
  prompt: string;
  batch?: string | null;
  isVerified: boolean;
}

const CHECKPOINTS = [
  { hour: "0–12h", title: "Statutory & Data Discovery", desc: "Isolate primary datasets (NSSO, discom filings, NFHS) and freeze outline." },
  { hour: "12–24h", title: "Core Synthesis & Analysis", desc: "Build R/Stata regression tables or draft slide deck problem tree." },
  { hour: "24–36h", title: "Actionable Recommendations", desc: "Formulate 3 concrete, feasible policy interventions with implementation risks." },
  { hour: "36–48h", title: "Executive Summary & Polish", desc: "Write 150-word executive summary box on page 1; double-check numbers." },
];

export function AssignmentCaseVault({ prompts }: { prompts: VaultPrompt[] }) {
  const [selectedPrompt, setSelectedPrompt] = useState<VaultPrompt | null>(prompts[0] || null);
  const [filterTool, setFilterTool] = useState<string>("ALL");
  const [timerSeconds, setTimerSeconds] = useState<number>(48 * 3600);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds]);

  function formatTime(totalSec: number) {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  const filteredPrompts = prompts.filter((p) => {
    if (filterTool === "ALL") return true;
    const combined = `${p.tools ?? ""} ${p.prompt}`.toLowerCase();
    return combined.includes(filterTool.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* 48-Hour Live Simulation Countdown Sandbox */}
      <div className="border-2 border-stone-900 bg-[#FBF9F4] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-stone-900 pb-3">
          <div>
            <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
              Interactive Practice Sandbox
            </div>
            <h3 className="font-serif-editorial text-xl font-normal text-stone-950">
              Simulate 48-Hour Take-Home Assignment
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="border-2 border-stone-900 bg-stone-900 px-4 py-1.5 font-mono text-xl font-extrabold tracking-wider text-[#F6F3EC]">
              {formatTime(timerSeconds)}
            </div>
            <button
              type="button"
              onClick={() => setTimerRunning(!timerRunning)}
              className="inline-flex items-center gap-1 border border-stone-900 bg-white px-3 py-1.5 font-mono-tabular text-xs font-bold text-stone-950 uppercase hover:bg-stone-900 hover:text-white"
            >
              {timerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {timerRunning ? "Pause" : "Start Clock"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(48 * 3600);
              }}
              className="border border-stone-400 bg-stone-100 p-1.5 text-stone-600 hover:text-stone-950"
              title="Reset timer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 4-Phase Strategy Road */}
        <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 md:grid-cols-4">
          {CHECKPOINTS.map((cp, idx) => (
            <div key={idx} className="border border-stone-300 bg-white p-3">
              <div className="font-mono-tabular text-[10px] font-bold text-stone-600 uppercase">
                {cp.hour}
              </div>
              <div className="font-bold text-stone-950">{cp.title}</div>
              <p className="mt-1 text-[11px] text-stone-600 leading-snug">{cp.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono-tabular text-xs font-bold text-stone-700 uppercase">Tool Filter:</span>
          {["ALL", "R", "Stata", "Brief", "Deck", "Case"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterTool(t)}
              className={`border px-2.5 py-1 font-mono-tabular text-xs font-semibold uppercase transition ${
                filterTool === t
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:border-stone-900"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="font-mono-tabular text-xs text-stone-500">
          Showing {filteredPrompts.length} Verified Prompts
        </div>
      </div>

      {/* Prompts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredPrompts.map((p) => {
          const isSelected = selectedPrompt?.id === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedPrompt(p)}
              className={`cursor-pointer border p-4 transition ${
                isSelected
                  ? "border-2 border-stone-900 bg-[#FBF9F4] shadow-sm"
                  : "border-stone-300 bg-white hover:border-stone-500"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="border border-stone-900 bg-stone-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-white uppercase">
                    {p.orgName}
                  </span>
                  {p.roleTitle && (
                    <span className="font-mono-tabular text-xs font-semibold text-stone-600">
                      {p.roleTitle}
                    </span>
                  )}
                </div>
                <div className="font-mono-tabular text-[11px] font-bold text-amber-900">
                  {p.timeLimit || "48 Hours"}
                </div>
              </div>

              {p.tools && (
                <div className="mt-2 font-mono-tabular text-[11px] font-semibold text-emerald-900">
                  Tools Tested: {p.tools}
                </div>
              )}

              <p className="mt-2 text-xs text-stone-800 leading-relaxed">
                {p.prompt}
              </p>

              <div className="mt-3 flex items-center justify-between font-mono-tabular text-[10px] text-stone-500 border-t border-stone-100 pt-2">
                <span>Contributed: {p.batch || "MPP Cohort"}</span>
                {isSelected && <span className="font-bold text-stone-950 uppercase">Active in Simulator ✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
