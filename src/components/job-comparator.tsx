"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, Scale, X } from "lucide-react";
import { JobGates } from "@/lib/job-analysis";

export interface ComparableJob {
  id: string;
  title: string;
  orgName: string;
  url: string;
  location?: string | null;
  experience?: string | null;
  type?: string | null;
  sectors: string[];
  deadline?: string | null;
  gates: JobGates;
  compensation?: string | null;
  assignmentInfo?: string | null;
  cohortCount?: number;
}

interface ComparatorContextType {
  selectedJobs: ComparableJob[];
  toggleJob: (job: ComparableJob) => void;
  isJobSelected: (id: string) => boolean;
  clearAll: () => void;
}

const ComparatorContext = createContext<ComparatorContextType | null>(null);

export function ComparatorProvider({ children }: { children: ReactNode }) {
  const [selectedJobs, setSelectedJobs] = useState<ComparableJob[]>([]);

  function toggleJob(job: ComparableJob) {
    setSelectedJobs((prev) => {
      const exists = prev.some((j) => j.id === job.id);
      if (exists) return prev.filter((j) => j.id !== job.id);
      if (prev.length >= 3) {
        alert("You can compare up to 3 mandates side-by-side. Remove one to add another.");
        return prev;
      }
      return [...prev, job];
    });
  }

  function isJobSelected(id: string) {
    return selectedJobs.some((j) => j.id === id);
  }

  function clearAll() {
    setSelectedJobs([]);
  }

  return (
    <ComparatorContext.Provider value={{ selectedJobs, toggleJob, isJobSelected, clearAll }}>
      {children}
      <ComparatorBottomTray />
    </ComparatorContext.Provider>
  );
}

export function useComparator() {
  const ctx = useContext(ComparatorContext);
  if (!ctx) throw new Error("useComparator must be used within ComparatorProvider");
  return ctx;
}

export function CompareCheckbox({ job }: { job: ComparableJob }) {
  const { isJobSelected, toggleJob } = useComparator();
  const selected = isJobSelected(job.id);

  return (
    <button
      type="button"
      onClick={() => toggleJob(job)}
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold transition ${
        selected
          ? "border-amber-900 bg-amber-900 text-white"
          : "border-stone-400 bg-white text-stone-700 hover:border-stone-900 hover:text-stone-950"
      }`}
      title="Add to side-by-side comparison"
    >
      <Scale className="h-3 w-3" />
      {selected ? "Selected" : "Compare"}
    </button>
  );
}

function ComparatorBottomTray() {
  const { selectedJobs, clearAll } = useComparator();
  const [modalOpen, setModalOpen] = useState(false);

  if (selectedJobs.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform rounded-full border-2 border-stone-900 bg-[#F6F3EC] px-4 py-2.5 shadow-xl sm:px-6">
        <div className="flex items-center gap-3 font-mono-tabular text-xs">
          <span className="font-bold text-stone-950">
            ⚖️ Comparing {selectedJobs.length} of 3 Mandates
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-full border border-stone-900 bg-stone-900 px-3 py-1 font-bold text-white uppercase hover:bg-stone-800"
          >
            Open Comparison View →
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-stone-500 hover:text-stone-900"
            title="Clear comparison"
          >
            ✕
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto border-2 border-stone-900 bg-[#FBF9F4] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-stone-900 pb-3">
              <div>
                <div className="font-mono-tabular text-[11px] font-bold text-amber-900 uppercase">
                  Side-by-Side Evaluation Matrix
                </div>
                <h2 className="font-serif-editorial text-2xl font-normal text-stone-950">
                  Role Comparison ({selectedJobs.length} Mandates)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="border border-stone-900 bg-white px-2.5 py-1 font-mono-tabular text-xs font-bold text-stone-900 hover:bg-stone-900 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 divide-y divide-stone-300 md:grid-cols-3 md:divide-x md:divide-y-0">
              {selectedJobs.map((j) => (
                <div key={j.id} className="space-y-4 pt-4 md:px-4 md:pt-0">
                  <div>
                    <span className="border border-stone-900 bg-stone-900 px-1.5 py-0.5 font-mono-tabular text-[10px] font-bold text-white uppercase">
                      {j.orgName}
                    </span>
                    <h3 className="mt-1 text-sm font-bold text-stone-950">
                      {j.title}
                    </h3>
                    <div className="mt-1 font-mono-tabular text-xs text-stone-600">
                      {j.location || "India"} · {j.type?.replace("_", " ") || "Full-time"}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-stone-200 pt-3 text-xs">
                    <div>
                      <span className="font-bold text-stone-900">Experience Gate: </span>
                      <span className="font-mono-tabular text-stone-700">
                        {j.gates.experienceGate.label}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold text-stone-900">Rolling Urgency: </span>
                      <span className="font-mono-tabular text-amber-900">
                        {j.gates.rollingUrgency.label}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold text-stone-900">Quant / R Requirement: </span>
                      <span className="font-mono-tabular">
                        {j.gates.quantRequired ? "⚠️ Quant/Stata/R Needed" : "Standard Policy Writing"}
                      </span>
                    </div>

                    <div>
                      <span className="font-bold text-stone-900">Writing Sample / Memo: </span>
                      <span className="font-mono-tabular">
                        {j.gates.writingSampleRequired ? "📝 Writing Sample Required" : "Standard CV Screen"}
                      </span>
                    </div>

                    {j.gates.languageRequired && (
                      <div>
                        <span className="font-bold text-stone-900">Language: </span>
                        <span className="font-mono-tabular text-stone-700">{j.gates.languageRequired}</span>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-stone-900">Verified Cohort Pay: </span>
                      <div className="font-mono-tabular text-emerald-950">
                        {j.compensation ? j.compensation : <span className="text-stone-400 italic">Under construction</span>}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-stone-900">48-Hr Assignment &amp; Cases: </span>
                      <div className="mt-0.5 text-stone-700">
                        {j.assignmentInfo ? (
                          j.assignmentInfo
                        ) : (
                          <span className="text-stone-400 italic">Under construction</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-stone-900">Cohort Pulse: </span>
                      <span className="font-mono-tabular text-stone-600">
                        {typeof j.cohortCount === "number" && j.cohortCount > 0
                          ? `🔥 ${j.cohortCount} in cohort tracking`
                          : "Be the first in cohort to track"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      href={`/jobs/${j.id}`}
                      className="border border-stone-900 bg-white px-3 py-1.5 font-mono-tabular text-xs font-bold text-stone-900 hover:bg-stone-900 hover:text-white"
                    >
                      View Details →
                    </Link>
                    <a
                      href={j.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border border-stone-900 bg-stone-900 px-3 py-1.5 font-mono-tabular text-xs font-bold text-white hover:bg-stone-800"
                    >
                      Apply <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
