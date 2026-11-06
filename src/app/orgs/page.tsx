import Link from "next/link";
import { Building2, ExternalLink, MapPin, MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import {
  ORG_CATEGORIES,
  SECTORS,
  label,
  type Sector,
} from "@/lib/taxonomy";

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sector?: string; q?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const category = (params.category ?? "").trim();
  const sector = (params.sector ?? "").trim();
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
    if (category && o.category !== category) return false;
    if (sector && !o.sectors.includes(sector)) return false;
    if (
      q &&
      !`${o.name} ${o.description ?? ""} ${o.hq ?? ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Policy Organization Directory &amp; Cohort Knowledge ({filtered.length}
          )
        </h1>
        <p className="text-xs text-stone-600">
          Curated think tanks, consulting firms, foundations, government bodies
          &amp; multilaterals — with shared batch notes and anonymous outcome
          statistics.
        </p>
      </div>

      {/* Filters */}
      <form
        method="GET"
        action="/orgs"
        className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-4"
      >
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search organization or city…"
          className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
        />
        <select
          name="category"
          defaultValue={category}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
        >
          <option value="">All Categories</option>
          {Object.entries(ORG_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          name="sector"
          defaultValue={sector}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
        >
          <option value="">All Sectors</option>
          {Object.entries(SECTORS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
        >
          Filter Directory
        </button>
      </form>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((o) => {
          const jCount = jobCounts.get(o.id) ?? 0;
          const nCount = noteCounts.get(o.id) ?? 0;

          return (
            <Link
              key={o.id}
              href={`/orgs/${o.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-400"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 font-semibold text-stone-700">
                    {label(ORG_CATEGORIES, o.category)}
                  </span>
                  {o.hq && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {o.hq}
                    </span>
                  )}
                </div>

                <h2 className="mt-2 flex items-center gap-1.5 text-base font-bold text-stone-900 group-hover:underline">
                  <Building2 className="h-4 w-4 shrink-0 text-stone-500" />
                  {o.name}
                </h2>

                {o.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-600">
                    {o.description}
                  </p>
                )}

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {o.sectors.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded border border-stone-200 px-1.5 py-0.5 text-[10px] text-stone-600"
                    >
                      {SECTORS[s as Sector] ?? s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-2.5 text-[11px] text-stone-600">
                <div className="flex items-center gap-3">
                  <span>
                    <strong className="text-stone-900">{jCount}</strong> open
                    role{jCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <strong className="text-stone-900">{nCount}</strong> batch
                    note{nCount === 1 ? "" : "s"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-0.5 font-semibold text-stone-900">
                  Profile <ExternalLink className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
