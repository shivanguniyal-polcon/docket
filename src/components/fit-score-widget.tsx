"use client";

import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Copy,
  Check,
} from "lucide-react";

export interface FitData {
  score: number;
  summary: string | null;
  strengths: string[];
  gaps: string[];
  provider: string;
}

export function FitScoreWidget({
  jobId,
  initial,
  compact = false,
}: {
  jobId: string;
  initial?: FitData | null;
  compact?: boolean;
}) {
  const [fit, setFit] = useState<FitData | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [coverNote, setCoverNote] = useState<{
    subject: string;
    body: string;
    provider: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function runScore(force = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, force }),
      });
      if (res.ok) {
        const data = (await res.json()) as FitData;
        setFit(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function runDraftCoverNote() {
    setDrafting(true);
    try {
      const res = await fetch("/api/cover-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoverNote(data);
      }
    } finally {
      setDrafting(false);
    }
  }

  async function copyDraft() {
    if (!coverNote) return;
    await navigator.clipboard.writeText(
      `Subject: ${coverNote.subject}\n\n${coverNote.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const badgeColor =
    fit && fit.score >= 78
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : fit && fit.score >= 58
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-stone-100 text-stone-700 border-stone-200";

  if (compact) {
    if (!fit) {
      return (
        <button
          type="button"
          onClick={() => runScore(false)}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3 text-amber-600" />
          {loading ? "Scoring…" : "Check fit"}
        </button>
      );
    }
    return (
      <span
        title={fit.summary ?? undefined}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
      >
        <Sparkles className="h-3 w-3" />
        {fit.score}% fit
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-stone-900">
            Personal Fit Assessment &amp; Cover Note Drafter
          </h3>
          {fit && (
            <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[11px] text-stone-600">
              engine: {fit.provider}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runDraftCoverNote}
            disabled={drafting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-50"
          >
            <FileSignature className="h-3.5 w-3.5 text-amber-700" />
            {drafting ? "Drafting…" : "Draft 180-word Cover Note / Cold Email"}
          </button>

          <button
            type="button"
            onClick={() => runScore(Boolean(fit))}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            {loading
              ? "Analyzing profile…"
              : fit
                ? "Re-score fit"
                : "Calculate my fit score"}
          </button>
        </div>
      </div>

      {fit ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-xl border text-base font-bold ${badgeColor}`}
            >
              {fit.score}%
            </div>
            <p className="text-sm text-stone-700">{fit.summary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200/70 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Strengths &amp; alignment
              </div>
              <ul className="mt-1.5 space-y-1 text-xs text-stone-700">
                {(fit.strengths ?? []).map((s, idx) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-amber-200/70 bg-white p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <AlertCircle className="h-3.5 w-3.5" />
                Gaps &amp; things to address
              </div>
              <ul className="mt-1.5 space-y-1 text-xs text-stone-700">
                {(fit.gaps ?? []).map((g, idx) => (
                  <li key={idx}>• {g}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-stone-600">
          Compares this role against your private CV and skills in Settings.
          Your resume never leaves your control.
        </p>
      )}

      {coverNote && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-bold text-stone-900">
              Tailored Cover Note / Outreach Email ({coverNote.provider})
            </div>
            <button
              type="button"
              onClick={copyDraft}
              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-50"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy email
                </>
              )}
            </button>
          </div>
          <div className="mt-2 rounded-lg bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-800">
            Subject: {coverNote.subject}
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-stone-700">
            {coverNote.body}
          </pre>
        </div>
      )}
    </div>
  );
}
