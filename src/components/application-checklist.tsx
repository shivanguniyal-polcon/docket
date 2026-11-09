"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Square, ChevronDown, ChevronUp, Copy, Check, Clock, Users } from "lucide-react";

interface ChecklistProps {
  applicationId: string;
  orgName: string;
  title: string;
  appliedAt: string | null;
  status: string;
  cohortInterviewingCount?: number;
}

const CHECKLIST_ITEMS = [
  { id: "cv", label: "Tailored 1-page CV (Policy & methods highlighted)" },
  { id: "writing_sample", label: "2-page Policy Brief / Writing Sample attached" },
  { id: "references", label: "2 Academic / Faculty references lined up" },
  { id: "cover_pitch", label: "Cover pitch tailored to Practice / Programme Lead" },
];

export function ApplicationChecklist({
  applicationId,
  orgName,
  title,
  appliedAt,
  status,
  cohortInterviewingCount = 0,
}: ChecklistProps) {
  const [expanded, setExpanded] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [buddyOptIn, setBuddyOptIn] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`docket_app_checklist_${applicationId}`);
      if (stored) setCompleted(JSON.parse(stored));
      const buddyStored = localStorage.getItem(`docket_app_buddy_${applicationId}`);
      if (buddyStored) setBuddyOptIn(JSON.parse(buddyStored));
    } catch {
      // ignore
    }
  }, [applicationId]);

  function toggleItem(id: string) {
    const updated = { ...completed, [id]: !completed[id] };
    setCompleted(updated);
    try {
      localStorage.setItem(`docket_app_checklist_${applicationId}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function toggleBuddy() {
    const next = !buddyOptIn;
    setBuddyOptIn(next);
    try {
      localStorage.setItem(`docket_app_buddy_${applicationId}`, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  // Calculate days since applied
  let daysSinceApplied: number | null = null;
  if (appliedAt) {
    const appliedDate = new Date(appliedAt);
    const now = new Date();
    daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const isGhosting = status === "applied" && daysSinceApplied !== null && daysSinceApplied >= 14;
  const completedCount = CHECKLIST_ITEMS.filter((i) => completed[i.id]).length;

  function copyFollowUpDraft() {
    const draft = `Subject: Following up on application for ${title} — [Your Name], IIT Delhi MPP

Dear ${orgName} Hiring Team,

I hope this email finds you well.

I am writing to politely follow up on my application for the ${title} position submitted on ${appliedAt || "recently"}. As a Master of Public Policy candidate at IIT Delhi, I remain very keen on contributing to ${orgName}'s research and implementation initiatives.

Please let me know if any additional writing samples, policy briefs, or academic references would be helpful at this stage. Thank you very much for your time and consideration.

Warm regards,
[Your Name]
Master of Public Policy (MPP) Candidate
Indian Institute of Technology (IIT) Delhi`;

    navigator.clipboard.writeText(draft);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 2000);
  }

  return (
    <div className="mt-2 space-y-2 border-t border-stone-200 pt-2 text-xs">
      {/* Ghosting & Follow-up Alert */}
      {isGhosting && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-amber-300 bg-amber-50 p-2 font-mono-tabular text-[11px] text-amber-950">
          <div className="flex items-center gap-1 font-semibold">
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            {daysSinceApplied} days since applied — Time for a polite check-in!
          </div>
          <button
            type="button"
            onClick={copyFollowUpDraft}
            className="inline-flex items-center gap-1 border border-amber-900 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-950 uppercase hover:bg-amber-900 hover:text-white"
          >
            {copiedDraft ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copiedDraft ? "Copied Draft!" : "Copy Follow-up Draft"}
          </button>
        </div>
      )}

      {/* Case Prep Buddy Banner (for interviewing status) */}
      {(status === "interviewing" || status === "applied") && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-sky-300 bg-sky-50/70 p-2 font-mono-tabular text-[11px] text-sky-950">
          <div className="flex items-center gap-1 font-semibold">
            <Users className="h-3.5 w-3.5 text-sky-700" />
            {cohortInterviewingCount > 0 ? (
              <span>🔥 {cohortInterviewingCount} batchmate(s) also tracking {orgName}</span>
            ) : (
              <span>Case Prep: Mock governance cases &amp; 48-hr tests</span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleBuddy}
            className={`border px-2 py-0.5 text-[10px] font-bold uppercase transition ${
              buddyOptIn
                ? "border-emerald-800 bg-emerald-800 text-white"
                : "border-sky-800 bg-white text-sky-950 hover:bg-sky-800 hover:text-white"
            }`}
          >
            {buddyOptIn ? "✓ Opted in for Case Prep" : "+ Find Prep Buddy"}
          </button>
        </div>
      )}

      {/* Application Deliverables Checklist Toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 font-mono-tabular text-[11px] font-semibold text-stone-700 hover:text-stone-950"
        >
          <span>
            Deliverables: {completedCount} of {CHECKLIST_ITEMS.length} ready
          </span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <span className="font-mono-tabular text-[10px] text-stone-400">
          {Math.round((completedCount / CHECKLIST_ITEMS.length) * 100)}%
        </span>
      </div>

      {expanded && (
        <div className="space-y-1.5 rounded-md border border-stone-200 bg-white p-2">
          {CHECKLIST_ITEMS.map((item) => {
            const isDone = Boolean(completed[item.id]);
            return (
              <label
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="flex cursor-pointer items-center gap-2 text-[11px] text-stone-800 hover:text-stone-950"
              >
                {isDone ? (
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                )}
                <span className={isDone ? "line-through text-stone-400" : ""}>{item.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
