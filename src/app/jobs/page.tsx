import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  Bookmark,
  Check,
  EyeOff,
  Users,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { db, schema } from "@/db";
import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import {
  EXPERIENCE,
  JOB_TYPES,
  LOCATION_TYPES,
  SECTORS,
  APPLICATION_STATUS_LABELS,
  label,
  type Sector,
  type ApplicationStatus,
} from "@/lib/taxonomy";
import { trackJobAction, flagNonPolicyJobAction } from "@/app/actions";
import { FitScoreWidget } from "@/components/fit-score-widget";
import { MONTHLY_ACTION_WINDOWS } from "@/lib/placement-intelligence";

interface SearchParams {
  q?: string;
  sector?: string;
  experience?: string;
  type?: string;
  locationType?: string;
  org?: string;
  submitted?: string;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const q = (params.q ?? "").trim();
  const sector = (params.sector ?? "").trim();
  const experience = (params.experience ?? "").trim();
  const type = (params.type ?? "").trim();
  const locationType = (params.locationType ?? "").trim();
  const orgId = (params.org ?? "").trim();

  const conditions = [eq(schema.job.status, "published")];
  if (q) {
    conditions.push(
      or(
        ilike(schema.job.title, `%${q}%`),
        ilike(schema.job.orgName, `%${q}%`),
        ilike(schema.job.description, `%${q}%`),
      )!,
    );
  }
  if (experience) conditions.push(eq(schema.job.experience, experience));
  if (type) conditions.push(eq(schema.job.type, type));
  if (locationType) conditions.push(eq(schema.job.locationType, locationType));
  if (orgId) conditions.push(eq(schema.job.orgId, orgId));
  if (sector) {
    conditions.push(sql`${sector} = ANY(${schema.job.sectors})`);
  }

  const [jobs, userApps, userFits, alumniRows, compNotes] = await Promise.all([
    db
      .select()
      .from(schema.job)
      .where(and(...conditions))
      .orderBy(desc(schema.job.postedAt), desc(schema.job.createdAt))
      .limit(120),
    db
      .select()
      .from(schema.application)
      .where(eq(schema.application.userId, user.id)),
    db
      .select()
      .from(schema.fitScore)
      .where(eq(schema.fitScore.userId, user.id)),
    db
      .select({
        userName: schema.user.name,
        currentOrg: schema.profile.currentOrg,
        openToReferrals: schema.profile.openToReferrals,
      })
      .from(schema.profile)
      .innerJoin(schema.user, eq(schema.user.id, schema.profile.userId))
      .where(eq(schema.profile.alumniOptIn, true)),
    db
      .select({
        orgId: schema.orgNote.orgId,
        compensation: schema.orgNote.compensation,
      })
      .from(schema.orgNote)
      .where(isNotNull(schema.orgNote.compensation)),
  ]);

  const appByJobId = new Map(
    userApps.filter((a) => a.jobId).map((a) => [a.jobId!, a]),
  );
  const fitByJobId = new Map(userFits.map((f) => [f.jobId, f]));

  const compByOrgId = new Map<string, string>();
  for (const c of compNotes) {
    if (c.compensation && !compByOrgId.has(c.orgId)) {
      compByOrgId.set(c.orgId, c.compensation);
    }
  }

  function countAlumniForOrg(orgName: string): number {
    const norm = orgName.toLowerCase();
    return alumniRows.filter((a) => {
      if (!a.currentOrg) return false;
      const co = a.currentOrg.toLowerCase().replace(/\(.*?\)/g, "").trim();
      return co.length >= 3 && (norm.includes(co) || co.includes(norm));
    }).length;
  }

  const hasFilters = Boolean(
    q || sector || experience || type || locationType || orgId,
  );

  return (
    <div className="space-y-6">
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-stone-900 pb-4">
        <div>
          <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-900 uppercase">
            § 01 · VERIFIED POLICY MANDATE LEDGER
          </div>
          <h1 className="font-serif-editorial mt-1 text-3xl font-normal tracking-tight text-stone-950 sm:text-4xl">
            Active Openings &amp; Fellowships ({jobs.length})
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 border border-stone-900 bg-[#FBF9F4] px-3.5 py-2 text-xs font-bold tracking-wider text-stone-900 uppercase hover:bg-stone-900 hover:text-[#FBF9F4]"
          >
            Where Should I Apply? Matcher →
          </Link>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-semibold tracking-wider text-[#F6F3EC] uppercase hover:bg-stone-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Log URL or WhatsApp Forward
          </Link>
        </div>
      </div>

      {/* Actionable Monthly Statutory & Rolling Windows Strip */}
      <details className="border-2 border-stone-900 bg-[#EFECE3]" open>
        <summary className="flex cursor-pointer items-center justify-between px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-amber-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
              NEVER MISS A WINDOW
            </span>
            <span className="font-mono-tabular text-xs font-bold text-stone-950 uppercase">
              Monthly Statutory &amp; Rolling Portals Open Right Now (NITI Aayog 1st–10th, CCI, DPIIT, MEA, LAMP, Vidhi)
            </span>
          </div>
          <span className="font-mono-tabular text-[10px] font-semibold text-stone-600 uppercase">
            Toggle [–/+]
          </span>
        </summary>
        <div className="grid gap-2.5 border-t border-stone-900 bg-[#FBF9F4] p-4 sm:grid-cols-2 lg:grid-cols-3">
          {MONTHLY_ACTION_WINDOWS.map((mw) => (
            <div
              key={mw.title}
              className="flex flex-col justify-between border border-stone-300 bg-white p-3"
            >
              <div>
                <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                  {mw.windowLabel}
                </div>
                <div className="mt-0.5 text-xs font-bold text-stone-950">
                  {mw.title}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                  {mw.actionNote}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-stone-200 pt-2">
                <span className="font-mono-tabular text-[10px] font-semibold text-stone-700">
                  {mw.organization}
                </span>
                <a
                  href={mw.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-mono-tabular text-[10px] font-bold text-stone-950 underline"
                >
                  Official Portal <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </details>

      {params.submitted && (
        <div className="border border-stone-900 bg-emerald-950 px-4 py-3 font-mono-tabular text-xs text-[#F6F3EC]">
          {params.submitted === "published"
            ? "✓ MANDATE PUBLISHED TO THE LIVE LEDGER."
            : "✓ MANDATE LOGGED — SENT TO MODERATOR DESK FOR VERIFICATION."}
        </div>
      )}

      {/* Editorial Filter Console */}
      <form
        method="GET"
        action="/jobs"
        className="border border-stone-900 bg-[#FBF9F4] p-4"
      >
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-stone-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search title, institution, method (Stata, DPI, climate, RA)…"
              className="w-full border border-stone-400 bg-white py-2 pr-3 pl-9 text-xs text-stone-950 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none"
            />
          </div>

          <select
            name="sector"
            defaultValue={sector}
            className="border border-stone-400 bg-white px-3 py-2 font-mono-tabular text-xs text-stone-900"
          >
            <option value="">SECTOR: ALL</option>
            {Object.entries(SECTORS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            name="experience"
            defaultValue={experience}
            className="border border-stone-400 bg-white px-3 py-2 font-mono-tabular text-xs text-stone-900"
          >
            <option value="">EXPERIENCE: ALL</option>
            {Object.entries(EXPERIENCE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            name="type"
            defaultValue={type}
            className="border border-stone-400 bg-white px-3 py-2 font-mono-tabular text-xs text-stone-900"
          >
            <option value="">TYPE: ALL</option>
            {Object.entries(JOB_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            name="locationType"
            defaultValue={locationType}
            className="border border-stone-400 bg-white px-3 py-2 font-mono-tabular text-xs text-stone-900"
          >
            <option value="">REGION: ALL</option>
            {Object.entries(LOCATION_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-300 pt-3">
          <div className="flex flex-wrap items-center gap-1.5 font-mono-tabular text-[11px]">
            <span className="font-bold text-stone-700 uppercase">INDEX:</span>
            {[
              { href: "/jobs?type=internship", label: "DEC 2026+ INTERNSHIPS" },
              { href: "/jobs?experience=0-2", label: "0–2 YRS (MAY 2027 GRADS)" },
              { href: "/jobs?experience=3-5", label: "3–5 YRS" },
              { href: "/jobs?experience=5-10", label: "5–10 YRS" },
              { href: "/jobs?experience=10%2B", label: "10+ YRS" },
              { href: "/jobs?sector=tech_ai", label: "TECH & AI" },
              { href: "/jobs?sector=health", label: "HEALTH" },
            ].map((pill) => (
              <Link
                key={pill.href}
                href={pill.href}
                className="border border-stone-400 bg-white px-2 py-0.5 text-[10px] font-semibold text-stone-800 hover:border-stone-900 hover:bg-stone-900 hover:text-[#F6F3EC]"
              >
                {pill.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {hasFilters && (
              <Link
                href="/jobs"
                className="font-mono-tabular text-xs font-semibold text-stone-600 underline hover:text-stone-950"
              >
                CLEAR
              </Link>
            )}
            <button
              type="submit"
              className="border border-stone-900 bg-stone-900 px-4 py-1.5 font-mono-tabular text-xs font-semibold text-[#F6F3EC] uppercase hover:bg-stone-800"
            >
              Filter Ledger
            </button>
          </div>
        </div>
      </form>

      {/* High-Density Editorial Ledger Rows */}
      {jobs.length === 0 ? (
        <div className="border border-stone-900 bg-[#FBF9F4] p-12 text-center">
          <p className="font-serif-editorial text-xl text-stone-900">
            No mandates match the active filter criteria.
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Reset filters above or log an opening from a WhatsApp forward or
            career link.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-300 border border-stone-900 bg-[#FBF9F4]">
          {/* Table Header (desktop) */}
          <div className="hidden grid-cols-12 gap-3 border-b border-stone-900 bg-[#EFECE4] px-4 py-2 font-mono-tabular text-[10px] font-bold tracking-wider text-stone-700 uppercase lg:grid">
            <div className="col-span-3">Institution &amp; Location</div>
            <div className="col-span-5">Mandate &amp; JD Excerpt</div>
            <div className="col-span-2">Band &amp; Sector</div>
            <div className="col-span-2 text-right">Fit &amp; Action</div>
          </div>

          {jobs.map((j) => {
            const tracked = appByJobId.get(j.id);
            const fit = fitByJobId.get(j.id);
            const alumniCount = countAlumniForOrg(j.orgName);
            const compInfo = j.orgId ? compByOrgId.get(j.orgId) : undefined;

            return (
              <div
                key={j.id}
                className="grid gap-3 px-4 py-4 transition hover:bg-[#EFECE4]/70 lg:grid-cols-12 lg:items-start"
              >
                {/* Col 1: Institution, Location, Pay, Alumni */}
                <div className="space-y-1 lg:col-span-3">
                  <div className="text-xs font-bold text-stone-950">
                    {j.orgName}
                  </div>
                  <div className="font-mono-tabular text-[11px] text-stone-600">
                    {j.location ?? label(LOCATION_TYPES, j.locationType)}
                    {j.deadline ? ` · DUE ${j.deadline}` : ""}
                  </div>
                  {compInfo && (
                    <div className="inline-block border border-emerald-800 bg-emerald-950/10 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-emerald-950">
                      PAY: {compInfo}
                    </div>
                  )}
                  {alumniCount > 0 && (
                    <div>
                      <Link
                        href={`/jobs/${j.id}`}
                        className="inline-flex items-center gap-1 border border-stone-900 bg-[#EFECE4] px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-stone-900 hover:bg-stone-900 hover:text-[#F6F3EC]"
                      >
                        <Users className="h-3 w-3" />
                        {alumniCount} IITD ALUMNI → REFER
                      </Link>
                    </div>
                  )}
                </div>

                {/* Col 2: Title & JD Snippet */}
                <div className="space-y-1 lg:col-span-5">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="font-serif-editorial block text-lg leading-snug font-normal text-stone-950 hover:underline"
                  >
                    {j.title}
                  </Link>
                  {j.description && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-stone-600">
                      {j.description}
                    </p>
                  )}
                </div>

                {/* Col 3: Experience Band, Type & Sectors */}
                <div className="flex flex-wrap items-start gap-1 lg:col-span-2">
                  <span className="border border-stone-900 bg-stone-900 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-[#F6F3EC] uppercase">
                    {label(EXPERIENCE, j.experience)}
                  </span>
                  <span className="border border-stone-400 bg-white px-1.5 py-0.5 font-mono-tabular text-[10px] text-stone-800 uppercase">
                    {label(JOB_TYPES, j.type)}
                  </span>
                  {j.sectors.slice(0, 2).map((s) => (
                    <Link
                      key={s}
                      href={`/jobs?sector=${s}`}
                      className="border border-stone-300 px-1.5 py-0.5 font-mono-tabular text-[10px] text-stone-600 hover:border-stone-900"
                    >
                      {SECTORS[s as Sector] ?? s}
                    </Link>
                  ))}
                </div>

                {/* Col 4: Fit Score & Ledger Actions */}
                <div className="flex flex-wrap items-center justify-end gap-1.5 lg:col-span-2">
                  <FitScoreWidget
                    jobId={j.id}
                    compact
                    initial={
                      fit
                        ? {
                            score: fit.score,
                            summary: fit.summary,
                            strengths: fit.strengths,
                            gaps: fit.gaps,
                            provider: fit.provider,
                          }
                        : null
                    }
                  />

                  {tracked ? (
                    <Link
                      href="/tracker"
                      className="inline-flex items-center gap-1 border border-emerald-900 bg-emerald-950 px-2.5 py-1 font-mono-tabular text-[10px] font-semibold text-[#F6F3EC] uppercase"
                    >
                      <Check className="h-3 w-3" />
                      {
                        APPLICATION_STATUS_LABELS[
                          tracked.status as ApplicationStatus
                        ]
                      }
                    </Link>
                  ) : (
                    <>
                      <form action={trackJobAction}>
                        <input type="hidden" name="jobId" value={j.id} />
                        <input type="hidden" name="status" value="saved" />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 border border-stone-900 bg-white px-2 py-1 font-mono-tabular text-[10px] font-semibold text-stone-900 uppercase hover:bg-stone-900 hover:text-[#F6F3EC]"
                          title="Save to Ledger"
                        >
                          <Bookmark className="h-3 w-3" />
                          Save
                        </button>
                      </form>
                      <form action={trackJobAction}>
                        <input type="hidden" name="jobId" value={j.id} />
                        <input type="hidden" name="status" value="applied" />
                        <button
                          type="submit"
                          className="border border-stone-900 bg-stone-900 px-2 py-1 font-mono-tabular text-[10px] font-semibold text-[#F6F3EC] uppercase hover:bg-stone-800"
                        >
                          Applied
                        </button>
                      </form>
                    </>
                  )}

                  <a
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-stone-400 bg-white p-1 text-stone-700 hover:border-stone-900 hover:text-stone-950"
                    title="Open official posting"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>

                  <form action={flagNonPolicyJobAction}>
                    <input type="hidden" name="jobId" value={j.id} />
                    <button
                      type="submit"
                      className="border border-stone-300 bg-white p-1 text-stone-400 hover:border-rose-800 hover:text-rose-800"
                      title="Hide non-policy role"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
