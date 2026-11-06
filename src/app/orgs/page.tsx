import Link from "next/link";
import {
  Building2,
  ExternalLink,
  MapPin,
  MessageSquare,
  Plus,
  Compass,
} from "lucide-react";
import { getUser } from "@/lib/session";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import {
  ORG_CATEGORIES,
  SECTORS,
  label,
  type Sector,
} from "@/lib/taxonomy";
import {
  ORG_HIRING_PLAYBOOK,
  BACKGROUND_PROFILES,
  type BackgroundId,
} from "@/lib/placement-intelligence";
import { addOrgTargetToTrackerAction } from "@/app/actions";

const BG_SHORT: Record<BackgroundId, string> = {
  upsc_humanities: "UPSC / Law / Humanities",
  stem_btech: "B.Tech / STEM Pivot",
  econ_quant: "Econ / Quant / Stats",
  work_ex: "2–6+ Yrs Work-Ex",
};

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    sector?: string;
    bg?: string;
    q?: string;
  }>;
}) {
  await getUser();
  const params = await searchParams;
  const category = (params.category ?? "").trim();
  const sector = (params.sector ?? "").trim();
  const bg = (params.bg ?? "").trim() as BackgroundId | "";
  const q = (params.q ?? "").trim().toLowerCase();

  const [orgs, jobs, notes] = await Promise.all([
    db.select().from(schema.organization).orderBy(asc(schema.organization.name)),
    db
      .select({ id: schema.job.id, orgId: schema.job.orgId })
      .from(schema.job)
      .where(eq(schema.job.status, "published")),
    db
      .select({ id: schema.orgNote.id, orgId: schema.orgNote.orgId })
      .from(schema.orgNote),
  ]);

  const jobCounts = new Map<string, number>();
  for (const j of jobs) {
    if (j.orgId) jobCounts.set(j.orgId, (jobCounts.get(j.orgId) ?? 0) + 1);
  }
  const noteCounts = new Map<string, number>();
  for (const n of notes) {
    noteCounts.set(n.orgId, (noteCounts.get(n.orgId) ?? 0) + 1);
  }

  const filtered = orgs.filter((o) => {
    const playbook = ORG_HIRING_PLAYBOOK[o.slug];
    if (category && o.category !== category) return false;
    if (sector && !o.sectors.includes(sector)) return false;
    if (bg && playbook && !playbook.bestFor.includes(bg)) return false;
    if (
      q &&
      !`${o.name} ${o.description ?? ""} ${o.hq ?? ""} ${playbook?.entryRoles ?? ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-stone-900 pb-4">
        <div>
          <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-900 uppercase">
            § 04 · THE ALWAYS-ON WHERE-TO-APPLY ATLAS ({filtered.length} INSTITUTIONS)
          </div>
          <h1 className="font-serif-editorial mt-1 text-3xl font-normal tracking-tight text-stone-950 sm:text-4xl">
            Master Policy Employer Directory &amp; Hiring Channels
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-stone-700">
            Even when an organization has <strong>0 scraped postings today</strong>,
            60% of policy hiring happens via rolling portals, monthly statutory
            windows, or direct 2-page brief outreach. Use this atlas to see exact
            entry titles, background fit, and how to apply year-round.
          </p>
        </div>

        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-3.5 py-2 text-xs font-bold tracking-wider text-[#FBF9F4] uppercase hover:bg-stone-800"
        >
          <Compass className="h-3.5 w-3.5" />
          Where Should I Apply? Diagnostic →
        </Link>
      </div>

      {/* Filters */}
      <form
        method="GET"
        action="/orgs"
        className="grid gap-3 border border-stone-900 bg-[#FBF9F4] p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search organization, role title, or city…"
          className="border border-stone-400 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-none"
        />
        <select
          name="bg"
          defaultValue={bg}
          className="border border-stone-400 bg-white px-3 py-2 text-xs font-semibold text-stone-900"
        >
          <option value="">All Student Backgrounds</option>
          {BACKGROUND_PROFILES.map((b) => (
            <option key={b.id} value={b.id}>
              Best Fit: {b.shortLabel}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category}
          className="border border-stone-400 bg-white px-3 py-2 text-xs text-stone-900"
        >
          <option value="">All Employer Types</option>
          {Object.entries(ORG_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="sector"
          defaultValue={sector}
          className="border border-stone-400 bg-white px-3 py-2 text-xs text-stone-900"
        >
          <option value="">All Policy Sectors</option>
          {Object.entries(SECTORS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-stone-900 px-4 py-2 text-xs font-bold tracking-wider text-[#FBF9F4] uppercase hover:bg-stone-800"
          >
            Filter Atlas
          </button>
          {(category || sector || bg || q) && (
            <Link
              href="/orgs"
              className="border border-stone-400 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:border-stone-900"
            >
              Reset
            </Link>
          )}
        </div>
      </form>

      {/* Master Employer Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((o) => {
          const jCount = jobCounts.get(o.id) ?? 0;
          const nCount = noteCounts.get(o.id) ?? 0;
          const play = ORG_HIRING_PLAYBOOK[o.slug];

          const channelBadge =
            play?.hiringChannel ??
            (jCount > 0 ? "Live ATS Board" : "Rolling / Direct Outreach");

          const entryRoles =
            play?.entryRoles ??
            "Research Intern · Research Analyst / Associate (0–2 yrs)";
          const lateralRoles =
            play?.lateralRoles ??
            "Senior Research Associate · Consultant / Programme Manager (3–10+ yrs)";
          const howToApply =
            play?.howToApplyWhenZeroListed ??
            "Check official careers portal or send a 1-page CV + 2-page policy brief to the relevant research vertical lead.";
          const applyUrl = play?.applyUrl || o.careersUrl || o.website || "#";

          return (
            <div
              key={o.id}
              className="flex flex-col justify-between border border-stone-900 bg-[#FBF9F4] p-5"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="border border-stone-400 bg-[#EFECE3] px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-stone-800 uppercase">
                    {label(ORG_CATEGORIES, o.category)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="border border-stone-900 bg-stone-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
                      {channelBadge}
                    </span>
                    {o.hq && (
                      <span className="font-mono-tabular inline-flex items-center gap-0.5 text-[10px] text-stone-600">
                        <MapPin className="h-3 w-3" />
                        {o.hq}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex items-start justify-between gap-2">
                  <Link
                    href={`/orgs/${o.slug}`}
                    prefetch={false}
                    className="font-serif-editorial flex items-center gap-1.5 text-xl font-normal text-stone-950 hover:underline"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-stone-600" />
                    {o.name}
                  </Link>
                </div>

                {o.description && (
                  <p className="mt-1 text-xs leading-relaxed text-stone-700">
                    {o.description}
                  </p>
                )}

                {/* Entry & Lateral Roles Box */}
                <div className="mt-3 space-y-1.5 border border-stone-300 bg-white p-3 text-xs">
                  <div>
                    <span className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                      0–2 Yrs &amp; Intern Titles:{" "}
                    </span>
                    <span className="font-medium text-stone-900">{entryRoles}</span>
                  </div>
                  <div>
                    <span className="font-mono-tabular text-[10px] font-bold text-stone-600 uppercase">
                      3–10+ Yrs Lateral Titles:{" "}
                    </span>
                    <span className="text-stone-700">{lateralRoles}</span>
                  </div>
                  <div className="border-t border-stone-200 pt-1.5 text-[11px] leading-relaxed text-stone-600">
                    <strong className="text-stone-900">How to Apply Today:</strong>{" "}
                    {howToApply}
                  </div>
                </div>

                {/* Best Fit Backgrounds & Sectors */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {(play?.bestFor ?? ["upsc_humanities", "econ_quant"]).map(
                    (bId) => (
                      <span
                        key={bId}
                        className="border border-amber-800/40 bg-amber-50/70 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-amber-950"
                      >
                        Fit: {BG_SHORT[bId]}
                      </span>
                    ),
                  )}
                  {o.sectors.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="border border-stone-300 bg-white px-1.5 py-0.5 font-mono-tabular text-[10px] text-stone-600"
                    >
                      {SECTORS[s as Sector] ?? s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-300 pt-3 text-[11px]">
                <div className="font-mono-tabular flex items-center gap-3 text-stone-700">
                  <Link
                    href={`/orgs/${o.slug}`}
                    prefetch={false}
                    className="hover:underline"
                  >
                    <strong className="text-stone-950">{jCount}</strong> live
                    listing{jCount === 1 ? "" : "s"}
                  </Link>
                  <Link
                    href={`/orgs/${o.slug}`}
                    prefetch={false}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" />
                    <strong className="text-stone-950">{nCount}</strong> cohort
                    note{nCount === 1 ? "" : "s"}
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <form action={addOrgTargetToTrackerAction}>
                    <input type="hidden" name="orgId" value={o.id} />
                    <input type="hidden" name="orgName" value={o.name} />
                    <input
                      type="hidden"
                      name="title"
                      value={entryRoles.split("·")[0].trim()}
                    />
                    <input type="hidden" name="url" value={applyUrl} />
                    <input
                      type="hidden"
                      name="notes"
                      value={`[${channelBadge}] ${howToApply}`}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 border border-stone-900 bg-white px-2.5 py-1 font-mono-tabular text-[10px] font-bold text-stone-900 uppercase hover:bg-stone-900 hover:text-[#FBF9F4]"
                    >
                      <Plus className="h-3 w-3" />+ Target Pipeline
                    </button>
                  </form>

                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 bg-stone-900 px-2.5 py-1 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase hover:bg-stone-800"
                  >
                    Careers Portal <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
