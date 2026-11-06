"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Copy,
  Check,
  ChevronDown,
  User,
  SlidersHorizontal,
} from "lucide-react";
import type { OutreachFormat } from "@/lib/ai";

export interface FitData {
  score: number;
  summary: string | null;
  strengths: string[];
  gaps: string[];
  provider: string;
}

export interface LocalCandidateProfile {
  name: string;
  archetypeId: "upsc_humanities" | "stem_btech" | "econ_quant" | "work_ex";
  headline: string;
  skills: string[];
  experienceLevel: string;
  resumeText?: string;
}

const ARCHETYPE_DEFAULTS: Record<
  LocalCandidateProfile["archetypeId"],
  { label: string; headline: string; skills: string[]; exp: string }
> = {
  upsc_humanities: {
    label: "UPSC / Humanities / Law",
    headline:
      "Master of Public Policy Candidate, IIT Delhi · Focus on Indian Governance, Statutory Frameworks & Scheme Delivery",
    skills: [
      "qualitative research",
      "policy brief",
      "legislative",
      "stakeholder engagement",
      "budget analysis",
      "literature review",
    ],
    exp: "0-2",
  },
  stem_btech: {
    label: "B.Tech / STEM Pivot",
    headline:
      "Master of Public Policy Candidate, IIT Delhi · Focus on Tech Policy, DPI & Quantitative Systems Modelling",
    skills: [
      "python",
      "sql",
      "data visualization",
      "gis",
      "regulatory analysis",
      "quantitative research",
    ],
    exp: "0-2",
  },
  econ_quant: {
    label: "Economics / Quant / Stata",
    headline:
      "Master of Public Policy Candidate, IIT Delhi · Focus on Applied Microeconometrics, Public Finance & Impact Evaluation",
    skills: [
      "stata",
      "r",
      "econometrics",
      "rct",
      "impact evaluation",
      "cost-benefit",
      "survey design",
    ],
    exp: "0-2",
  },
  work_ex: {
    label: "2–6+ Yrs Work-Ex (Lateral)",
    headline:
      "Master of Public Policy Candidate, IIT Delhi · Experienced Lateral in Public Sector Advisory & Strategy",
    skills: [
      "project management",
      "stakeholder engagement",
      "monitoring and evaluation",
      "m&e",
      "regulatory analysis",
      "public finance",
    ],
    exp: "3-5",
  },
};

const STORAGE_KEY = "docket_local_profile";

function getStoredProfile(): LocalCandidateProfile {
  if (typeof window === "undefined") {
    return {
      name: "IIT Delhi MPP Candidate",
      archetypeId: "upsc_humanities",
      headline: ARCHETYPE_DEFAULTS.upsc_humanities.headline,
      skills: ARCHETYPE_DEFAULTS.upsc_humanities.skills,
      experienceLevel: ARCHETYPE_DEFAULTS.upsc_humanities.exp,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    name: "IIT Delhi MPP Candidate",
    archetypeId: "upsc_humanities",
    headline: ARCHETYPE_DEFAULTS.upsc_humanities.headline,
    skills: ARCHETYPE_DEFAULTS.upsc_humanities.skills,
    experienceLevel: ARCHETYPE_DEFAULTS.upsc_humanities.exp,
  };
}

export function FitScoreWidget({
  jobId,
  initial,
  compact = false,
  isSignedIn = false,
}: {
  jobId: string;
  initial?: FitData | null;
  compact?: boolean;
  isSignedIn?: boolean;
}) {
  const [fit, setFit] = useState<FitData | null>(initial ?? null);
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [outreachType, setOutreachType] = useState<OutreachFormat>("email");
  const [coverNote, setCoverNote] = useState<{
    subject: string;
    body: string;
    provider: string;
    outreachType?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Local anonymous profile drawer
  const [profile, setProfile] = useState<LocalCandidateProfile>(getStoredProfile);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  useEffect(() => {
    setProfile(getStoredProfile());
  }, []);

  function updateArchetype(archId: LocalCandidateProfile["archetypeId"]) {
    const def = ARCHETYPE_DEFAULTS[archId];
    const updated: LocalCandidateProfile = {
      ...profile,
      archetypeId: archId,
      headline: def.headline,
      skills: def.skills,
      experienceLevel: def.exp,
    };
    setProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  async function runScore(force = false) {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { jobId, force };
      if (!isSignedIn) {
        payload.anonymousProfile = {
          name: profile.name,
          headline: profile.headline,
          skills: profile.skills,
          experienceLevel: profile.experienceLevel,
          resumeText: profile.resumeText,
        };
      }
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as FitData;
        setFit(data);
      }
    } catch (e) {
      console.error("Fit evaluation error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function runDraftCoverNote(targetType: OutreachFormat = outreachType) {
    setDrafting(true);
    setOutreachType(targetType);
    try {
      const payload: Record<string, unknown> = {
        jobId,
        outreachType: targetType,
      };
      if (!isSignedIn) {
        payload.anonymousProfile = {
          name: profile.name,
          headline: profile.headline,
          skills: profile.skills,
          experienceLevel: profile.experienceLevel,
          resumeText: profile.resumeText,
        };
      }
      const res = await fetch("/api/cover-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setCoverNote(data);
      }
    } catch (e) {
      console.error("Cover note error:", e);
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
      ? "bg-emerald-50 text-emerald-950 border-emerald-400 font-bold"
      : fit && fit.score >= 58
        ? "bg-amber-50 text-amber-950 border-amber-400 font-bold"
        : "bg-stone-100 text-stone-800 border-stone-300 font-semibold";

  if (compact) {
    if (!fit) {
      return (
        <button
          type="button"
          onClick={() => runScore(false)}
          disabled={loading}
          className="inline-flex items-center gap-1 border border-stone-900 bg-white px-2 py-1 font-mono-tabular text-[10px] font-bold text-stone-900 uppercase hover:bg-stone-900 hover:text-[#F6F3EC] disabled:opacity-50"
          title="Calculate instant candidate fit score (No login required)"
        >
          <Sparkles className="h-3 w-3 text-amber-700" />
          {loading ? "Scoring…" : "Check fit"}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => runScore(true)}
        disabled={loading}
        title={fit.summary ?? undefined}
        className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono-tabular text-[10px] uppercase transition hover:opacity-80 ${badgeColor}`}
      >
        <Sparkles className="h-3 w-3" />
        {fit.score}% fit
      </button>
    );
  }

  return (
    <div className="border-2 border-stone-900 bg-[#FBF9F4] p-5">
      {/* Header & Local Profile Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-stone-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
            INSTANT CANDIDATE AUDIT
          </span>
          <h3 className="font-mono-tabular text-xs font-bold text-stone-950 uppercase">
            Fit Engine &amp; Multi-Format Outreach Drafter
          </h3>
          {fit && (
            <span className="font-mono-tabular text-[10px] text-stone-500">
              [engine: {fit.provider}]
            </span>
          )}
        </div>

        {/* Profile Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowProfileDrawer(!showProfileDrawer)}
            className="inline-flex items-center gap-1 border border-stone-400 bg-white px-2.5 py-1 font-mono-tabular text-[11px] font-semibold text-stone-900 hover:border-stone-900"
          >
            <SlidersHorizontal className="h-3 w-3 text-stone-600" />
            <span>Profile: {ARCHETYPE_DEFAULTS[profile.archetypeId]?.label}</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => runScore(Boolean(fit))}
            disabled={loading}
            className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-3 py-1 font-mono-tabular text-xs font-semibold text-[#F6F3EC] uppercase hover:bg-stone-800 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
            {loading
              ? "Auditing…"
              : fit
                ? "Re-calculate Fit"
                : "Calculate Fit Score"}
          </button>
        </div>
      </div>

      {/* Drawer: Customize Candidate Lens (Zero Login Required) */}
      {showProfileDrawer && (
        <div className="my-3 border border-stone-900 bg-[#EFECE3] p-4 text-xs">
          <div className="flex items-center justify-between border-b border-stone-300 pb-2">
            <span className="font-mono-tabular font-bold text-stone-900 uppercase">
              Select Your Background Lens (Stored in Browser · Zero Login Required)
            </span>
            <button
              type="button"
              onClick={() => setShowProfileDrawer(false)}
              className="font-mono-tabular font-bold text-stone-600 hover:text-stone-950"
            >
              [Close ×]
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(
              Object.keys(ARCHETYPE_DEFAULTS) as Array<
                LocalCandidateProfile["archetypeId"]
              >
            ).map((arch) => (
              <button
                key={arch}
                type="button"
                onClick={() => {
                  updateArchetype(arch);
                  setShowProfileDrawer(false);
                  runScore(true);
                }}
                className={`border p-2.5 text-left transition ${
                  profile.archetypeId === arch
                    ? "border-stone-900 bg-stone-900 text-[#FBF9F4]"
                    : "border-stone-400 bg-white text-stone-900 hover:border-stone-900"
                }`}
              >
                <div className="font-mono-tabular text-[10px] font-bold uppercase">
                  {ARCHETYPE_DEFAULTS[arch].label}
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] opacity-80">
                  {ARCHETYPE_DEFAULTS[arch].skills.slice(0, 3).join(", ")}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fit Score Display */}
      {fit ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-16 shrink-0 items-center justify-center border font-mono-tabular text-lg font-bold ${badgeColor}`}
            >
              {fit.score}%
            </div>
            <div>
              <p className="font-serif-editorial text-sm text-stone-950">
                {fit.summary}
              </p>
              <p className="font-mono-tabular mt-0.5 text-[10px] text-stone-600">
                Targeted against {ARCHETYPE_DEFAULTS[profile.archetypeId]?.label} lens (0–2 Yrs, IITD MPP).
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-emerald-900/30 bg-emerald-50/60 p-3">
              <div className="font-mono-tabular flex items-center gap-1.5 text-[10px] font-bold text-emerald-950 uppercase">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800" />
                Strengths &amp; Direct Alignment
              </div>
              <ul className="mt-1.5 space-y-1 text-xs text-stone-800">
                {(fit.strengths ?? []).map((s, idx) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="border border-amber-900/30 bg-amber-50/60 p-3">
              <div className="font-mono-tabular flex items-center gap-1.5 text-[10px] font-bold text-amber-950 uppercase">
                <AlertCircle className="h-3.5 w-3.5 text-amber-800" />
                Gaps &amp; Questions to Address
              </div>
              <ul className="mt-1.5 space-y-1 text-xs text-stone-800">
                {(fit.gaps ?? []).map((g, idx) => (
                  <li key={idx}>• {g}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
          <p>
            Audits your background against this mandate&apos;s methods, experience band,
            and sector. No account needed.
          </p>
        </div>
      )}

      {/* Multi-Format Outreach Drafter Strip */}
      <div className="mt-5 border-t border-stone-300 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono-tabular text-[11px] font-bold text-amber-900 uppercase">
            ⚡ 1-CLICK OUTREACH GENERATOR (CHOOSE FORMAT)
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { id: "linkedin" as OutreachFormat, label: "60-Word LinkedIn DM" },
              { id: "email" as OutreachFormat, label: "180-Word Cold Email" },
              {
                id: "gap_cover_note" as OutreachFormat,
                label: "Gap-Bridging Cover Note",
              },
              { id: "follow_up" as OutreachFormat, label: "10-Day Follow-Up" },
            ].map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => runDraftCoverNote(fmt.id)}
                disabled={drafting}
                className={`border px-2.5 py-1 font-mono-tabular text-[10px] font-bold uppercase transition ${
                  outreachType === fmt.id && coverNote
                    ? "border-stone-900 bg-stone-900 text-[#FBF9F4]"
                    : "border-stone-400 bg-white text-stone-800 hover:border-stone-900"
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>

        {drafting && (
          <div className="mt-3 font-mono-tabular text-xs text-stone-600">
            Synthesizing tailored {outreachType} draft…
          </div>
        )}

        {coverNote && !drafting && (
          <div className="mt-3 border border-stone-900 bg-white p-4">
            <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <span className="font-mono-tabular text-[10px] font-bold text-stone-900 uppercase">
                {coverNote.outreachType?.toUpperCase() ?? "OUTREACH"} DRAFT (Engine: {coverNote.provider})
              </span>
              <button
                type="button"
                onClick={copyDraft}
                className="inline-flex items-center gap-1 border border-stone-900 bg-[#FBF9F4] px-2.5 py-1 font-mono-tabular text-[10px] font-bold text-stone-900 hover:bg-stone-900 hover:text-[#FBF9F4]"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-700" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy Text
                  </>
                )}
              </button>
            </div>
            <div className="mt-2 font-mono-tabular text-xs font-bold text-stone-950">
              Subject: {coverNote.subject}
            </div>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-stone-800">
              {coverNote.body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
