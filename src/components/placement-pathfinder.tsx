"use client";

import { useState, useTransition } from "react";
import {
  Compass,
  Wand2,
  FileCheck2,
  Check,
  Copy,
  Plus,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  FileText,
  Loader2,
} from "lucide-react";
import {
  BACKGROUND_PROFILES,
  ORG_HIRING_PLAYBOOK,
  ASSIGNMENT_BLUEPRINTS,
  reframeBulletForPolicy,
  type BackgroundId,
} from "@/lib/placement-intelligence";
import { bulkAddTargetsToTrackerAction } from "@/app/actions";

const SAMPLE_MEMOS: Record<string, string> = {
  "ceew-energy-transition": `EXECUTIVE SUMMARY (BLUF):
This policy memo recommends a 3-part regulatory roadmap to operationalize Green Energy Open Access (GEOA) Rules 2022 in state electricity markets without destabilizing state DISCOM balance sheets:
1. Cross-Subsidy Surcharge (CSS) Trajectory: Cap CSS at 20% of the cost of supply, pegged to SERC Multi-Year Tariff (MYT) orders over a 5-year predictable gliding path.
2. Time-of-Day (ToD) Energy Banking: Transition from annual energy banking to monthly peak/off-peak settlement to prevent DISCOM revenue leakage during evening peak hours.
3. Distribution Infrastructure Alignment: Leverage RDSS (Revamped Distribution Sector Scheme) funds to install feeder-level smart meters separating PM-KUSUM agricultural solar feeders from C&I loads.

1. DIAGNOSIS & REGULATORY FRICTION:
Under the Electricity (Promoting Renewable Energy Through Green Energy Open Access) Rules 2022, the sanctioned load threshold was lowered from 1 MW to 100 kW. However, state SERC tariff orders continue to impose prohibitive wheeling, transmission, and additional surcharges...`,

  "samagra-fln-case": `EXECUTIVE SUMMARY (BLUF):
To accelerate NIPUN Bharat Grade-3 reading fluency from 34% to 70% across 45,000 primary schools, the State Education Department must shift from passive resource distribution to supportive academic supervision:
1. Academic Cadence: Institutionalize a mandatory 90-minute daily Teaching-at-the-Right-Level (TaRL) foundational literacy block supported by DIET-validated daily teacher guides.
2. Governance & Mentoring: Repurpose Block Resource Persons (BRPs) and Cluster Resource Coordinators (CRCs) from administrative compliance to classroom coaching, targeting 15 spot-observations per mentor monthly.
3. Real-Time Accountability: Deploy a mobile spot-assessment tool linked to a monthly District Magistrate review dashboard tracking UDISE+ and ASER-aligned progress indicators funded via the Samagra Shiksha AWP&B.

1. ROOT-CAUSE DIAGNOSIS:
Analysis of NAS/PARAKH and state assessment data reveals that instructional time-on-task is severely compromised...`,

  "koan-esya-dpdp": `EXECUTIVE SUMMARY (BLUF):
This regulatory briefing evaluates compliance bottlenecks between the Digital Personal Data Protection (DPDP) Act, 2023, and indigenous multilingual AI model development under the IndiaAI Mission:
1. Statutory Safe-Harbor under Section 17(2)(b): Pre-training AI models on publicly available Indian-language web corpora requires explicit research exemptions to prevent retroactive liability under Section 6 notice-and-consent mandates.
2. Children's Data & Section 9 Friction: Clarify that general web-scale linguistic datasets do not trigger Section 9 verifiable parental consent unless targeted profiling or behavioral monitoring of minors is undertaken.
3. Enforcement Architecture: Urge the Data Protection Board of India (DPBI) to establish an AI Regulatory Sandbox permitting tokenized data processing with legitimate use exceptions under Section 7.

1. STATUTORY MAPPING & ANALYSIS:
Section 3(c)(ii) of the DPDP Act provides exemptions for personal data made publicly available by the data principal...`,

  "jpal-idinsight-rct": `TECHNICAL ECONOMETRIC MEMO:
1. IDENTIFICATION & RANDOMIZATION DESIGN:
The cluster-randomized evaluation assigned 120 Gram Panchayats (GPs) into treatment (digital credit via SHG federations) and control groups across 4,200 rural households under DAY-NRLM. Because randomization occurred at the Gram Panchayat cluster level, all regression models must estimate standard errors clustered at the GP level: reg outcome treatment, vce(cluster gp_id).

2. DATA CLEANING & BALANCE VERIFICATION:
- Missingness: Survey missing values coded as -99/999 were verified for differential missingness across treatment arms before imputation.
- Top-coding: Household monthly consumption expenditure was winsorized at the 99th percentile to prevent high-leverage outliers from distorting mean comparisons.
- Baseline Balance: Normalized differences and a joint F-test confirmed balance across key demographic covariates.

3. THREATS TO INTERNAL VALIDITY:
Spillover across adjacent Village Organizations (VOs) could attenuate estimated treatment effects...`,

  "prs-bill-digest": `BRIEFING DIGEST FOR STANDING COMMITTEE:
REGULATION OF GIG AND PLATFORM WORKERS' SOCIAL SECURITY BILL

EXECUTIVE SUMMARY (BLUF):
This legislative briefing provides a non-partisan analysis of the proposed Bill establishing a social security fund for platform workers. Key policy decisions before the Committee involve fund financing mechanisms, definition of aggregators, and constitutional competence under the Concurrent List (Entries 23 and 24).

1. CORE PROVISIONS & FINANCING ARCHITECTURE:
The Bill introduces a 1-2% cess on aggregator transaction turnover to finance health, accident, and pension benefits. Similar to state-level legislation (Rajasthan Platform Based Gig Workers Act, 2023), aggregators must register all active delivery partners on a centralized portal.

2. FOUR CRITICAL QUESTIONS FOR THE COMMITTEE TO RAISE:
Q1 (Cess Administration): How will transaction cess be separated between platform convenience fees and worker remuneration without reducing net take-home earnings?
Q2 (Inter-State Portability): How will social security credits transfer when gig workers operate across state boundaries?
Q3 (Dispute Resolution): Is a three-tier grievance redressal mechanism accessible to workers given informal onboarding?
Q4 (Data Sharing): Does the aggregator reporting requirement comply with data minimization principles under the DPDP Act, 2023?`,
};

interface AuditResult {
  wordCount: number;
  wordCountPass: boolean;
  blufPass: boolean;
  citations: Array<{ name: string; cited: boolean }>;
  citationsScore: number;
  risksDetected: string[];
  score: number;
  grade: "A" | "B+" | "C";
  recommendations: string[];
}

function auditMemo(
  text: string,
  blueprint: (typeof ASSIGNMENT_BLUEPRINTS)[0],
): AuditResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wordCountPass = wordCount >= 300 && wordCount <= 1600;

  const openingText = words.slice(0, 200).join(" ").toLowerCase();
  const blufPass =
    openingText.includes("bluf") ||
    openingText.includes("executive summary") ||
    openingText.includes("key takeaways") ||
    openingText.includes("recommendation") ||
    openingText.includes("summary:");

  const textLower = text.toLowerCase();
  const citations = blueprint.indianContextMustCites.map((cite) => {
    const keywords = cite.match(/\b[A-Za-z0-9&+-]{3,}\b/g) || [cite.slice(0, 10)];
    const cited = keywords.some(
      (kw) => kw.length > 2 && textLower.includes(kw.toLowerCase()),
    );
    return { name: cite, cited };
  });

  const citedCount = citations.filter((c) => c.cited).length;
  const citationsScore = Math.round(
    (citedCount / Math.max(1, citations.length)) * 100,
  );

  const risksDetected: string[] = [];
  const numberCount = (
    text.match(/(\d+[%₹]?|\bcrore\b|\blakh\b|\bpercent\b)/gi) || []
  ).length;
  if (numberCount < 2) {
    risksDetected.push(
      "Low quantification: memo has fewer than 2 numbers or percentages. Policy panels eliminate narrative-only submissions.",
    );
  }

  const hasTimeline =
    /\b(month|quarter|phase|timeline|day|pilot|cadence|roadmap)\b/i.test(text);
  if (!hasTimeline) {
    risksDetected.push(
      "Missing operational timeline: no phased rollout, pilot window, or milestone cadence detected.",
    );
  }

  let score = 40;
  if (blufPass) score += 20;
  if (wordCountPass) score += 15;
  score += Math.round((citationsScore / 100) * 20);
  if (numberCount >= 5) score += 5;
  score -= risksDetected.length * 8;
  score = Math.max(25, Math.min(98, score));

  const grade: "A" | "B+" | "C" =
    score >= 80 ? "A" : score >= 60 ? "B+" : "C";

  const recommendations: string[] = [];
  if (!blufPass) {
    recommendations.push(
      "Lead with a 3-bullet Executive Summary / BLUF in the first 150 words before deep-diving into analysis.",
    );
  }
  citations
    .filter((c) => !c.cited)
    .forEach((c) => {
      recommendations.push(
        `Cite context: "${c.name}" to substantiate institutional fluency.`,
      );
    });
  if (risksDetected.length > 0) {
    recommendations.push(...risksDetected);
  }

  return {
    wordCount,
    wordCountPass,
    blufPass,
    citations,
    citationsScore,
    risksDetected,
    score,
    grade,
    recommendations,
  };
}

export function PlacementPathfinder({
  isSignedIn,
  initialTab = "matcher",
}: {
  isSignedIn: boolean;
  initialTab?: string;
}) {
  const [activeTab, setActiveTab] = useState<
    "matcher" | "translator" | "workbench"
  >(
    initialTab === "workbench" || initialTab === "translator"
      ? initialTab
      : "matcher",
  );

  // Tab 1: Matcher state
  const [selectedBg, setSelectedBg] = useState<BackgroundId>("upsc_humanities");
  const [selectedGoal, setSelectedGoal] = useState<
    "internship" | "entry_ft" | "lateral"
  >("entry_ft");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [addedCount, setAddedCount] = useState<number | null>(null);

  // Tab 2: CV Bullet Translator state
  const [rawBullet, setRawBullet] = useState<string>(
    "Analyzed state welfare schemes and parliamentary committee reports on rural employment and social security for 2 years",
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tab 3: Workbench state
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>(
    ASSIGNMENT_BLUEPRINTS[0].id,
  );
  const [memoDraft, setMemoDraft] = useState<string>("");
  const [auditReport, setAuditReport] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  function handleLoadSampleMemo(bpId = selectedBlueprintId) {
    const s = SAMPLE_MEMOS[bpId] || "";
    setMemoDraft(s);
    setAuditReport(null);
  }

  function handleRunAudit() {
    if (!memoDraft.trim() || isAuditing) return;
    setIsAuditing(true);
    setTimeout(() => {
      const res = auditMemo(memoDraft, activeBlueprint);
      setAuditReport(res);
      setIsAuditing(false);
    }, 350);
  }

  const profile =
    BACKGROUND_PROFILES.find((p) => p.id === selectedBg) ??
    BACKGROUND_PROFILES[0];

  const allOrgs = Object.values(ORG_HIRING_PLAYBOOK);
  const matchedOrgs = allOrgs.filter((o) => {
    const bgMatch = o.bestFor.includes(selectedBg);
    const sectorMatch =
      selectedSector === "all" || o.sectors.includes(selectedSector);
    return bgMatch && sectorMatch;
  });

  const coreOrgs = matchedOrgs.filter((o) => o.tier === "core");
  const reachOrgs = matchedOrgs.filter((o) => o.tier === "reach");
  const safetyOrgs = matchedOrgs.filter((o) => o.tier === "safety_rolling");

  const reframed = reframeBulletForPolicy(rawBullet, selectedBg);
  const activeBlueprint =
    ASSIGNMENT_BLUEPRINTS.find((b) => b.id === selectedBlueprintId) ??
    ASSIGNMENT_BLUEPRINTS[0];

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function handleBulkAddToTracker() {
    if (!isSignedIn) {
      window.location.href = "/sign-in?next=/resources";
      return;
    }
    startTransition(async () => {
      const payload = matchedOrgs.map((o) => ({
        orgName: o.name,
        title:
          selectedGoal === "lateral"
            ? o.lateralRoles.split("·")[0].trim()
            : selectedGoal === "internship"
              ? "Policy / Research Intern (Target)"
              : o.entryRoles.split("·")[0].trim(),
        url: o.applyUrl,
        notes: `[${o.hiringChannel}] ${o.howToApplyWhenZeroListed}`,
      }));
      const res = await bulkAddTargetsToTrackerAction(payload);
      setAddedCount(res.added);
    });
  }

  return (
    <section className="border-2 border-stone-900 bg-[#FBF9F4]">
      {/* Top Workbench Header & Tabs */}
      <div className="border-b-2 border-stone-900 bg-[#EFECE3] px-6 py-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-900 uppercase">
              INTERACTIVE PLACEMENT ENGINE · BUILT FOR 100% COHORT PLACEMENT
            </div>
            <h2 className="font-serif-editorial mt-0.5 text-2xl text-stone-950">
              Where Should I Apply, How to Frame My Background &amp; Crack Round 1
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("matcher")}
              className={`inline-flex items-center gap-1.5 border px-3.5 py-2 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "matcher"
                  ? "border-stone-900 bg-stone-900 text-[#FBF9F4]"
                  : "border-stone-400 bg-[#FBF9F4] text-stone-800 hover:border-stone-900"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              01 · Where Should I Apply?
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("translator")}
              className={`inline-flex items-center gap-1.5 border px-3.5 py-2 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "translator"
                  ? "border-stone-900 bg-stone-900 text-[#FBF9F4]"
                  : "border-stone-400 bg-[#FBF9F4] text-stone-800 hover:border-stone-900"
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              02 · CV Bullet Translator
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("workbench")}
              className={`inline-flex items-center gap-1.5 border px-3.5 py-2 text-xs font-bold tracking-wide uppercase transition ${
                activeTab === "workbench"
                  ? "border-stone-900 bg-stone-900 text-[#FBF9F4]"
                  : "border-stone-400 bg-[#FBF9F4] text-stone-800 hover:border-stone-900"
              }`}
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              03 · 48-Hr Assignment Blueprints
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: WHERE SHOULD I APPLY? ARCHETYPE MATCHER */}
      {activeTab === "matcher" && (
        <div className="p-6 space-y-6">
          {/* Controls */}
          <div className="grid gap-4 border border-stone-900 bg-[#F6F3EC] p-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <label className="font-mono-tabular block text-[10px] font-bold tracking-wider text-stone-700 uppercase">
                Step 1 · Select Your Prior Background / Profile
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {BACKGROUND_PROFILES.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => {
                      setSelectedBg(bg.id);
                      setAddedCount(null);
                    }}
                    className={`border p-2.5 text-left transition ${
                      selectedBg === bg.id
                        ? "border-stone-900 bg-stone-900 text-[#FBF9F4]"
                        : "border-stone-300 bg-[#FBF9F4] text-stone-900 hover:border-stone-900"
                    }`}
                  >
                    <div className="text-xs font-bold">{bg.shortLabel}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="font-mono-tabular block text-[10px] font-bold tracking-wider text-stone-700 uppercase">
                Step 2 · Target Window
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => {
                  setSelectedGoal(
                    e.target.value as "internship" | "entry_ft" | "lateral",
                  );
                  setAddedCount(null);
                }}
                className="mt-2 w-full border border-stone-900 bg-[#FBF9F4] px-3 py-2 text-xs font-semibold text-stone-900"
              >
                <option value="internship">
                  1st-Year Internship (Dec 2026 / Summer 2027)
                </option>
                <option value="entry_ft">
                  Graduating Full-Time / Fellowship (0–2 Yrs · May 2027)
                </option>
                <option value="lateral">
                  Lateral Mid/Senior Role (3–5 &amp; 5–10+ Yrs)
                </option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="font-mono-tabular block text-[10px] font-bold tracking-wider text-stone-700 uppercase">
                Step 3 · Sector Focus
              </label>
              <select
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  setAddedCount(null);
                }}
                className="mt-2 w-full border border-stone-900 bg-[#FBF9F4] px-3 py-2 text-xs font-semibold text-stone-900"
              >
                <option value="all">All Policy Sectors ({allOrgs.length} Orgs)</option>
                <option value="government">Government &amp; State Capacity</option>
                <option value="tech_ai">Tech, AI &amp; Digital Public Infra</option>
                <option value="regulation">Regulation, Law &amp; Parliament</option>
                <option value="climate">Climate, Energy &amp; Sustainability</option>
                <option value="finance">Public Finance, Macro &amp; Inclusion</option>
                <option value="development">Development &amp; Impact Eval</option>
                <option value="education">Education &amp; Skilling</option>
                <option value="health">Public Health Systems</option>
              </select>
            </div>
          </div>

          {/* Diagnostic Strategy Box for Selected Background */}
          <div className="grid gap-4 border border-stone-900 bg-white p-5 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-8 lg:border-r lg:border-stone-300 lg:pr-6">
              <div className="font-mono-tabular text-[11px] font-bold text-amber-900 uppercase">
                POSITIONING STRATEGY FOR: {profile.label}
              </div>
              <p className="text-xs leading-relaxed text-stone-700">
                <strong>Your Unfair Advantage:</strong> {profile.unfairAdvantage}
              </p>
              <p className="border-l-2 border-amber-700 bg-amber-50/70 pl-3 py-1 text-xs leading-relaxed text-stone-800">
                <strong>Critical Blind Spot to Fix on Your CV:</strong>{" "}
                {profile.blindSpotToFix}
              </p>
            </div>

            <div className="flex flex-col justify-between space-y-3 lg:col-span-4">
              <div>
                <div className="font-mono-tabular text-[10px] font-bold text-stone-600 uppercase">
                  Exact Role Titles to Search &amp; Pitch
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {profile.recommendedEntryTitles.map((t) => (
                    <span
                      key={t}
                      className="border border-stone-300 bg-[#F6F3EC] px-2 py-0.5 font-mono-tabular text-[10px] font-semibold text-stone-900"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={`/jobs?archetype=${selectedBg}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 border border-stone-900 bg-[#FBF9F4] px-4 py-2 text-xs font-bold tracking-wider text-stone-900 uppercase hover:bg-stone-900 hover:text-[#FBF9F4]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Live Openings for {profile.shortLabel} on Feed →
                </a>
                <button
                  type="button"
                  disabled={isPending || matchedOrgs.length === 0}
                  onClick={handleBulkAddToTracker}
                  className="inline-flex w-full items-center justify-center gap-1.5 bg-stone-900 px-4 py-2.5 text-xs font-bold tracking-wider text-[#FBF9F4] uppercase hover:bg-stone-800 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      <span>Adding Target List to Your Tracker…</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add All {matchedOrgs.length} Matched Orgs to My Tracker →</span>
                    </>
                  )}
                </button>
                {addedCount !== null && (
                  <div className="mt-1.5 text-center font-mono-tabular text-[11px] font-bold text-emerald-800">
                    ✓ Added {addedCount} target organizations to your /tracker pipeline!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3-Tier Portfolio Breakdown */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Tier 1: Core High-Probability Targets */}
            <div className="border border-stone-900 bg-[#F6F3EC] p-4">
              <div className="border-b border-stone-900 pb-2">
                <span className="bg-stone-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
                  TIER 1 · CORE HIGH-FIT TARGETS ({coreOrgs.length})
                </span>
                <p className="mt-1 text-[11px] text-stone-600">
                  Highest historical conversion rate for your profile. Apply to at
                  least 6–8 of these.
                </p>
              </div>
              <div className="mt-3 divide-y divide-stone-300">
                {coreOrgs.map((o) => (
                  <div key={o.slug} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/orgs/${o.slug}`}
                        className="text-xs font-bold text-stone-950 hover:underline"
                      >
                        {o.name}
                      </a>
                      <span className="shrink-0 border border-stone-400 bg-white px-1.5 py-0.5 font-mono-tabular text-[9px] font-semibold text-stone-800 uppercase">
                        {o.hiringChannel}
                      </span>
                    </div>
                    <div className="mt-1 font-mono-tabular text-[10px] font-semibold text-amber-900">
                      {selectedGoal === "lateral" ? o.lateralRoles : o.entryRoles}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                      {o.howToApplyWhenZeroListed}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <a
                        href={o.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono-tabular text-[10px] font-bold text-stone-900 underline"
                      >
                        Direct Portal / Apply <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <a
                        href={`/orgs/${o.slug}`}
                        className="font-mono-tabular text-[10px] text-stone-600 hover:text-stone-950"
                      >
                        Cohort Notes →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier 2: Ambitious Reach */}
            <div className="border border-stone-900 bg-[#F6F3EC] p-4">
              <div className="border-b border-stone-900 pb-2">
                <span className="bg-amber-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
                  TIER 2 · AMBITIOUS REACH ({reachOrgs.length})
                </span>
                <p className="mt-1 text-[11px] text-stone-600">
                  Selective intake. Always pair your application with an IITD MPP
                  alumni referral or tailored brief.
                </p>
              </div>
              <div className="mt-3 divide-y divide-stone-300">
                {reachOrgs.map((o) => (
                  <div key={o.slug} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/orgs/${o.slug}`}
                        className="text-xs font-bold text-stone-950 hover:underline"
                      >
                        {o.name}
                      </a>
                      <span className="shrink-0 border border-stone-400 bg-white px-1.5 py-0.5 font-mono-tabular text-[9px] font-semibold text-stone-800 uppercase">
                        {o.hiringChannel}
                      </span>
                    </div>
                    <div className="mt-1 font-mono-tabular text-[10px] font-semibold text-amber-900">
                      {selectedGoal === "lateral" ? o.lateralRoles : o.entryRoles}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                      {o.howToApplyWhenZeroListed}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <a
                        href={o.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono-tabular text-[10px] font-bold text-stone-900 underline"
                      >
                        Direct Portal / Apply <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <a
                        href={`/orgs/${o.slug}`}
                        className="font-mono-tabular text-[10px] text-stone-600 hover:text-stone-950"
                      >
                        Cohort Notes →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier 3: Rolling & Monthly Safety Nets */}
            <div className="border border-stone-900 bg-[#F6F3EC] p-4">
              <div className="border-b border-stone-900 pb-2">
                <span className="bg-emerald-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
                  TIER 3 · ROLLING &amp; SAFETY NETS ({safetyOrgs.length})
                </span>
                <p className="mt-1 text-[11px] text-stone-600">
                  Rolling portals, monthly government windows, and research institutes
                  that guarantee no student goes unplaced.
                </p>
              </div>
              <div className="mt-3 divide-y divide-stone-300">
                {safetyOrgs.map((o) => (
                  <div key={o.slug} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/orgs/${o.slug}`}
                        className="text-xs font-bold text-stone-950 hover:underline"
                      >
                        {o.name}
                      </a>
                      <span className="shrink-0 border border-stone-400 bg-white px-1.5 py-0.5 font-mono-tabular text-[9px] font-semibold text-stone-800 uppercase">
                        {o.hiringChannel}
                      </span>
                    </div>
                    <div className="mt-1 font-mono-tabular text-[10px] font-semibold text-amber-900">
                      {selectedGoal === "lateral" ? o.lateralRoles : o.entryRoles}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                      {o.howToApplyWhenZeroListed}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <a
                        href={o.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono-tabular text-[10px] font-bold text-stone-900 underline"
                      >
                        Direct Portal / Apply <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      <a
                        href={`/orgs/${o.slug}`}
                        className="font-mono-tabular text-[10px] text-stone-600 hover:text-stone-950"
                      >
                        Cohort Notes →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BACKGROUND-TO-POLICY CV BULLET TRANSLATOR */}
      {activeTab === "translator" && (
        <div className="p-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="font-mono-tabular text-[11px] font-bold text-amber-900 uppercase">
                TRANSLATE ANY PRIOR EXPERIENCE INTO POLICY CV LANGUAGE
              </div>
              <p className="text-xs leading-relaxed text-stone-700">
                Paste a raw description of your prior work (a UPSC optional/study
                topic, a B.Tech coding internship, a master&apos;s term paper, or a
                college club project) and select your background. Docket rewrites it
                into 3 employer-ready CV bullets.
              </p>

              <div>
                <label className="font-mono-tabular block text-[10px] font-bold text-stone-800 uppercase">
                  Your Background Lens
                </label>
                <select
                  value={selectedBg}
                  onChange={(e) => setSelectedBg(e.target.value as BackgroundId)}
                  className="mt-1 w-full border border-stone-900 bg-white px-3 py-2 text-xs font-semibold text-stone-900"
                >
                  {BACKGROUND_PROFILES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono-tabular block text-[10px] font-bold text-stone-800 uppercase">
                  Raw Experience / Project / Topic
                </label>
                <textarea
                  rows={4}
                  value={rawBullet}
                  onChange={(e) => setRawBullet(e.target.value)}
                  placeholder="e.g. Studied PM-KUSUM solar irrigation scheme and state electricity subsidies in Rajasthan..."
                  className="mt-1 w-full border border-stone-900 bg-white p-3 text-xs text-stone-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="font-mono-tabular text-[10px] font-semibold text-stone-500 uppercase">
                  Try preset:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBg("upsc_humanities");
                    setRawBullet(
                      "73rd Constitutional Amendment, panchayat devolution finances, and MGNREGA social audits",
                    );
                  }}
                  className="border border-stone-400 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-800 hover:border-stone-900"
                >
                  UPSC / Polity Topic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBg("stem_btech");
                    setRawBullet(
                      "Built an automated data scraping and visualization dashboard for urban bus transit delays",
                    );
                  }}
                  className="border border-stone-400 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-800 hover:border-stone-900"
                >
                  B.Tech / Data Project
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBg("econ_quant");
                    setRawBullet(
                      "PLFS and NFHS-5 household microdata analysis of female labour force participation and childcare access",
                    );
                  }}
                  className="border border-stone-400 bg-white px-2 py-0.5 text-[10px] font-medium text-stone-800 hover:border-stone-900"
                >
                  Econ / NSSO / NFHS Paper
                </button>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-7">
              {[
                {
                  key: "tt",
                  badge: "VERSION A · THINK TANKS & POLICY RESEARCH (CEEW, CPR, PRS, CSEP, VIDHI)",
                  text: reframed.thinkTank,
                },
                {
                  key: "gc",
                  badge: "VERSION B · GOVERNANCE & IMPACT CONSULTING (SAMAGRA, DALBERG, PWC, SATTVA)",
                  text: reframed.governanceConsulting,
                },
                {
                  key: "tr",
                  badge: "VERSION C · TECH POLICY, DPI & REGULATORY AFFAIRS (KOAN, ESYA, SARVAM, EGOV)",
                  text: reframed.techRegulatory,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="border border-stone-900 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                      <Sparkles className="mr-1 inline h-3 w-3" />
                      {item.badge}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.text, item.key)}
                      className="relative z-10 inline-flex items-center gap-1 border border-stone-900 bg-[#FBF9F4] px-2.5 py-1 font-mono-tabular text-[10px] font-bold text-stone-900 hover:bg-stone-900 hover:text-[#FBF9F4]"
                    >
                      {copiedKey === item.key ? (
                        <>
                          <Check className="h-3 w-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy Bullet
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed font-medium text-stone-900">
                    • {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 48-HOUR ASSIGNMENT & CASE WORKBENCH */}
      {activeTab === "workbench" && (
        <div className="p-6 space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-stone-300 pb-4">
            {ASSIGNMENT_BLUEPRINTS.map((bp) => (
              <button
                key={bp.id}
                type="button"
                onClick={() => setSelectedBlueprintId(bp.id)}
                className={`border px-3 py-2 text-left text-xs font-bold transition ${
                  selectedBlueprintId === bp.id
                    ? "border-stone-900 bg-stone-900 text-[#FBF9F4]"
                    : "border-stone-400 bg-white text-stone-900 hover:border-stone-900"
                }`}
              >
                <div className="font-mono-tabular text-[9px] opacity-80 uppercase">
                  {bp.sector} · {bp.timeLimit}
                </div>
                <div className="mt-0.5">{bp.title}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-5">
              <div className="border border-stone-900 bg-white p-5">
                <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                  TARGET EMPLOYERS: {activeBlueprint.targetOrgs}
                </div>
                <h3 className="font-serif-editorial mt-1 text-xl text-stone-950">
                  {activeBlueprint.title}
                </h3>
                <div className="mt-2 inline-block border border-stone-900 bg-[#EFECE3] px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-stone-900">
                  DELIVERABLE: {activeBlueprint.deliverable}
                </div>

                <div className="mt-4 border-t border-stone-200 pt-3">
                  <div className="font-mono-tabular text-[10px] font-bold text-stone-700 uppercase">
                    Actual Round-1 Prompt Statement
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-800 italic">
                    &ldquo;{activeBlueprint.promptText}&rdquo;
                  </p>
                </div>
              </div>

              <div className="border border-red-900/40 bg-red-50/50 p-4">
                <div className="font-mono-tabular flex items-center gap-1.5 text-[10px] font-bold text-red-900 uppercase">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Why Candidates Get Eliminated on This Prompt
                </div>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-stone-800">
                  {activeBlueprint.eliminationMistakes.map((m, i) => (
                    <li key={i}>• {m}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-7">
              <div className="border border-stone-900 bg-white p-5">
                <div className="font-mono-tabular text-[10px] font-bold text-emerald-900 uppercase">
                  WINNING SECTION-BY-SECTION BLUEPRINT (HOW TO STRUCTURE YOUR SUBMISSION)
                </div>
                <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-stone-800">
                  {activeBlueprint.winningStructure.map((step, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-stone-900 bg-[#FBF9F4] pl-3 py-1.5"
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border border-stone-900 bg-[#EFECE3] p-4">
                <div className="font-mono-tabular text-[10px] font-bold text-stone-900 uppercase">
                  Mandatory Indian Statutory, Regulatory &amp; Dataset Citations to Include
                </div>
                <ul className="mt-2 space-y-1 text-xs text-stone-800">
                  {activeBlueprint.indianContextMustCites.map((c, i) => (
                    <li key={i} className="font-medium">
                      ✓ {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Memo Rubric Grader & Compliance Linter */}
          <div className="border-2 border-stone-900 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-stone-900 pb-3">
              <div>
                <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                  PRACTICE WORKBENCH · ZERO LOGIN REQUIRED
                </div>
                <h3 className="font-serif-editorial text-lg text-stone-950">
                  Interactive Memo Rubric Grader &amp; Compliance Linter
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSampleMemo(selectedBlueprintId)}
                  className="inline-flex items-center gap-1 border border-stone-900 bg-[#FBF9F4] px-2.5 py-1 font-mono-tabular text-[10px] font-bold text-stone-900 hover:bg-stone-900 hover:text-[#FBF9F4]"
                >
                  <FileText className="h-3 w-3" />
                  Load Sample Winning Memo
                </button>
                {memoDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemoDraft("");
                      setAuditReport(null);
                    }}
                    className="border border-stone-300 px-2 py-1 font-mono-tabular text-[10px] text-stone-600 hover:border-stone-900"
                  >
                    Clear [×]
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="font-mono-tabular flex items-center justify-between text-[10px] font-bold text-stone-700 uppercase">
                <span>Paste Your Draft Assignment Memo (or edit loaded sample)</span>
                <span>
                  Words: {memoDraft.trim().split(/\s+/).filter(Boolean).length}
                </span>
              </label>
              <textarea
                rows={6}
                value={memoDraft}
                onChange={(e) => setMemoDraft(e.target.value)}
                placeholder="Paste your executive summary, statutory citations, methodology, and recommendations here to audit before submitting to the employer..."
                className="mt-1 w-full border border-stone-900 p-3 text-xs leading-relaxed text-stone-900 focus:outline-none"
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Audits BLUF placement, must-cite policies/datasets, and elimination traps.
              </span>
              <button
                type="button"
                onClick={handleRunAudit}
                disabled={!memoDraft.trim() || isAuditing}
                className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-4 py-2 font-mono-tabular text-xs font-bold text-[#FBF9F4] uppercase hover:bg-stone-800 disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
                    <span>Auditing BLUF &amp; Indian Citations…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Audit Memo Against Rubric</span>
                  </>
                )}
              </button>
            </div>

            {/* Audit Report */}
            {auditReport && (
              <div className="mt-4 border-t-2 border-stone-900 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border border-stone-900 bg-[#EFECE3] p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`border px-2.5 py-1 font-mono-tabular text-sm font-bold uppercase ${
                        auditReport.grade === "A"
                          ? "border-emerald-800 bg-emerald-100 text-emerald-950"
                          : auditReport.grade === "B+"
                            ? "border-amber-700 bg-amber-100 text-amber-950"
                            : "border-red-700 bg-red-100 text-red-950"
                      }`}
                    >
                      GRADE {auditReport.grade} · {auditReport.score}/100
                    </span>
                    <span className="font-serif-editorial text-sm font-normal text-stone-950">
                      {auditReport.grade === "A"
                        ? "Interview-Ready Submission — Strong structure and evidence grounding."
                        : auditReport.grade === "B+"
                          ? "Solid Draft — Address the minor omissions below before submission."
                          : "Needs Re-work — Review the elimination flags below to protect your round 1."}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-[10px] text-stone-600">
                    Word Count: {auditReport.wordCount}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="border border-stone-300 bg-[#FBF9F4] p-3 text-xs">
                    <div className="font-mono-tabular flex items-center justify-between border-b border-stone-200 pb-1.5 text-[10px] font-bold text-stone-900 uppercase">
                      <span>Mandatory Indian Context Citations</span>
                      <span className="text-stone-600">
                        {auditReport.citationsScore}% Match
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {auditReport.citations.map((c, i) => (
                        <li
                          key={i}
                          className={`flex items-center gap-1.5 ${
                            c.cited
                              ? "font-semibold text-emerald-900"
                              : "text-amber-800"
                          }`}
                        >
                          {c.cited ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                          )}
                          <span className="line-clamp-1">{c.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-stone-300 bg-[#FBF9F4] p-3 text-xs">
                    <div className="font-mono-tabular border-b border-stone-200 pb-1.5 text-[10px] font-bold text-stone-900 uppercase">
                      Structural &amp; Quality Checklist
                    </div>
                    <ul className="mt-2 space-y-1.5 text-stone-800">
                      <li className="flex items-center gap-1.5">
                        {auditReport.blufPass ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-700 shrink-0" />
                        )}
                        <span>
                          {auditReport.blufPass
                            ? "BLUF / Executive Summary in first 200 words (Pass)"
                            : "No Executive Summary / BLUF in opening (Elimination Risk)"}
                        </span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        {auditReport.wordCountPass ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        )}
                        <span>
                          {auditReport.wordCountPass
                            ? "Word count in acceptable range (300–1,600 words)"
                            : "Word count outside optimal assignment range"}
                        </span>
                      </li>
                      {auditReport.risksDetected.map((risk, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-red-900 font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-700 shrink-0 mt-0.5" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {auditReport.recommendations.length > 0 && (
                  <div className="mt-3 border border-amber-900/30 bg-amber-50/50 p-3 text-xs">
                    <div className="font-mono-tabular text-[10px] font-bold text-amber-950 uppercase">
                      Actionable Polish List Before You Submit:
                    </div>
                    <ul className="mt-1.5 space-y-1 text-stone-800">
                      {auditReport.recommendations.map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
