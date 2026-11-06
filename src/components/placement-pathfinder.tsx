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
} from "lucide-react";
import {
  BACKGROUND_PROFILES,
  ORG_HIRING_PLAYBOOK,
  ASSIGNMENT_BLUEPRINTS,
  reframeBulletForPolicy,
  type BackgroundId,
} from "@/lib/placement-intelligence";
import { bulkAddTargetsToTrackerAction } from "@/app/actions";

export function PlacementPathfinder({ isSignedIn }: { isSignedIn: boolean }) {
  const [activeTab, setActiveTab] = useState<
    "matcher" | "translator" | "workbench"
  >("matcher");

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

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isPending || matchedOrgs.length === 0}
                  onClick={handleBulkAddToTracker}
                  className="inline-flex w-full items-center justify-center gap-1.5 bg-stone-900 px-4 py-2.5 text-xs font-bold tracking-wider text-[#FBF9F4] uppercase hover:bg-stone-800 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isPending
                    ? "Adding Target List to Your Tracker…"
                    : `Add All ${matchedOrgs.length} Matched Orgs to My Tracker →`}
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
                      className="inline-flex items-center gap-1 border border-stone-900 bg-[#FBF9F4] px-2.5 py-1 font-mono-tabular text-[10px] font-bold text-stone-900 hover:bg-stone-900 hover:text-[#FBF9F4]"
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
        </div>
      )}
    </section>
  );
}
