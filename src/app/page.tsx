import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getUser } from "@/lib/session";
import { db, schema } from "@/db";
import { count, desc, eq } from "drizzle-orm";
import {
  EXPERIENCE,
  JOB_TYPES,
  SECTORS,
  label,
  type Sector,
} from "@/lib/taxonomy";

export const revalidate = 60;

export default async function LandingPage() {
  const user = await getUser();

  const [[jobCount], [orgCount], [recurringCount], previewJobs] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(schema.job)
        .where(eq(schema.job.status, "published")),
      db.select({ value: count() }).from(schema.organization),
      db.select({ value: count() }).from(schema.recurringDeadline),
      db
        .select({
          id: schema.job.id,
          orgName: schema.job.orgName,
          location: schema.job.location,
          title: schema.job.title,
          type: schema.job.type,
          experience: schema.job.experience,
          sectors: schema.job.sectors,
        })
        .from(schema.job)
        .where(eq(schema.job.status, "published"))
        .orderBy(desc(schema.job.postedAt))
        .limit(8),
    ]);

  return (
    <div className="space-y-12">
      {/* Editorial Broadsheet Masthead */}
      <section className="border-y-2 border-stone-900 bg-[#FBF9F4] p-6 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8 lg:border-r lg:border-stone-300 lg:pr-8">
            <div className="flex flex-wrap items-center gap-3 font-mono-tabular text-[11px] font-semibold tracking-widest text-amber-900 uppercase">
              <span>EDITION 2026–27</span>
              <span>·</span>
              <span>SCHOOL OF PUBLIC POLICY · IIT DELHI</span>
              <span>·</span>
              <span>OPEN ACCESS FOR COHORT &amp; ALUMNI</span>
            </div>

            <h1 className="font-serif-editorial text-4xl leading-[1.08] font-normal tracking-tight text-stone-950 sm:text-6xl">
              The single ledger for public policy mandates, fellowships &amp;
              institutional memory.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-stone-700">
              Built for the graduating class of May 2027, first-year students
              entering the December 2026 internship cycle, and alumni across
              every experience band (<strong>0–2, 3–5, 5–10, and 10+ years</strong>
              ). Deep-crawled job descriptions, 48-hour assignment prompt
              archives, stipend transparency, and lifelong dual-email access.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-2 border border-stone-900 bg-stone-900 px-5 py-2.5 text-xs font-semibold tracking-wider text-[#F6F3EC] uppercase hover:bg-stone-800"
              >
                Browse Live Mandates
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/orgs"
                className="inline-flex items-center gap-2 border border-stone-900 bg-[#FBF9F4] px-4 py-2.5 text-xs font-semibold tracking-wider text-stone-900 uppercase hover:bg-stone-900 hover:text-[#F6F3EC]"
              >
                Where-to-Apply Atlas (58 Orgs)
              </Link>
              <Link
                href="/resources"
                className="inline-flex items-center gap-2 border border-stone-900 bg-transparent px-4 py-2.5 text-xs font-semibold tracking-wider text-stone-900 uppercase hover:bg-stone-900 hover:text-[#F6F3EC]"
              >
                Archetype Matcher &amp; Field Manual
              </Link>
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 border border-amber-900 bg-amber-50 px-4 py-2.5 text-xs font-semibold tracking-wider text-amber-950 uppercase hover:bg-amber-100"
              >
                Hire / Post Mandate
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              {!user && (
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-1.5 px-2 py-2 font-mono-tabular text-xs font-semibold text-amber-900 underline hover:text-stone-950"
                >
                  Sign in with @iitd.ac.in to track →
                </Link>
              )}
            </div>
          </div>

          {/* Right column: Index Figures */}
          <div className="flex flex-col justify-between space-y-6 lg:col-span-4">
            <div className="font-mono-tabular text-[11px] font-semibold tracking-widest text-stone-500 uppercase">
              INDEX TELEMETRY
            </div>

            <div className="divide-y divide-stone-300 border-y border-stone-300">
              <div className="flex items-baseline justify-between py-3.5">
                <span className="text-xs font-medium text-stone-600">
                  Verified Active Mandates
                </span>
                <span className="font-mono-tabular text-3xl font-bold text-stone-950">
                  {jobCount?.value ?? 0}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-3.5">
                <span className="text-xs font-medium text-stone-600">
                  Indexed Policy Institutions
                </span>
                <span className="font-mono-tabular text-3xl font-bold text-stone-950">
                  {orgCount?.value ?? 0}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-3.5">
                <span className="text-xs font-medium text-stone-600">
                  Annual Fellowship Cycles
                </span>
                <span className="font-mono-tabular text-3xl font-bold text-stone-950">
                  {recurringCount?.value ?? 0}
                </span>
              </div>
            </div>

            <div className="space-y-1 bg-[#EFECE4] p-3.5 text-xs text-stone-700">
              <div className="font-mono-tabular text-[10px] font-bold tracking-wider text-stone-900 uppercase">
                HYBRID DEEP-CRAWL ARCHITECTURE
              </div>
              <p className="text-[11px] leading-relaxed">
                Combines live ATS feeds (Ashby, Greenhouse, Lever, Workday,
                SmartRecruiters) with local deep-crawl snapshots pushed via Git.
              </p>
            </div>

            <div className="border border-stone-900 bg-white p-3.5 text-xs text-stone-800">
              <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                EMPLOYERS, PRACTICE HEADS &amp; PARTNERS
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                Staffing an unadvertised consulting mandate, fellowship, or policy project?
              </p>
              <Link
                href="/submit"
                className="mt-2 inline-flex items-center gap-1 font-mono-tabular text-[11px] font-bold text-stone-900 underline uppercase hover:text-amber-900"
              >
                Drop Mandate in 30 Seconds (No Login) →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Band Ledger Matrix */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-stone-900 pb-2">
          <h2 className="font-mono-tabular text-xs font-bold tracking-widest text-stone-900 uppercase">
            § 01 · COVERAGE BY CAREER STAGE &amp; COHORT TIMELINE
          </h2>
          <span className="font-mono-tabular text-[11px] text-stone-500">
            ALL FOUR BANDS INDEXED EQUALLY
          </span>
        </div>

        <div className="grid divide-y divide-stone-300 border border-stone-900 bg-[#FBF9F4] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {[
            {
              code: "BAND I · DEC 2026+",
              band: "First-Year Internships",
              orgs: "CEEW, PRS, NITI Aayog, MEA, J-PAL, CSEP, Esya",
              desc: "Winter & summer research internships, legislative briefings, and professor RAships.",
            },
            {
              code: "BAND II · 0–2 YEARS",
              band: "Class of May 2027 & Fellows",
              orgs: "LAMP, Samagra, IDinsight, MSC, GRAAM, Pravi, NFPRC, CRISP",
              desc: "Analysts, Research Associates, Chief Minister's Fellowships & LAMP.",
            },
            {
              code: "BAND III · 3–5 & 5–10 YRS",
              band: "Mid-Career & Lateral",
              orgs: "PwC G&PS, EY DPI, Deloitte, Dalberg, Koan, BGA, Wadhwani AI",
              desc: "Consultants, Engagement Managers, Programme Leads & Regulatory Counsel.",
            },
            {
              code: "BAND IV · 10+ YEARS",
              band: "Practice Heads & Multilaterals",
              orgs: "World Bank, Gates Foundation, OECD, WHO, ADB, UNDP, Wadhwani",
              desc: "Senior Program Officers, Directors, Practice Leads & Multilateral Specialists.",
            },
          ].map((b) => (
            <div key={b.code} className="flex flex-col justify-between p-5">
              <div>
                <div className="font-mono-tabular text-[10px] font-bold tracking-widest text-amber-900">
                  {b.code}
                </div>
                <h3 className="font-serif-editorial mt-1 text-xl font-normal text-stone-950">
                  {b.band}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  {b.desc}
                </p>
              </div>
              <div className="mt-4 border-t border-stone-200 pt-2.5 font-mono-tabular text-[10px] text-stone-500">
                {b.orgs}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabular Live Mandate Preview (80,000 Hours / Linear style) */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-stone-900 pb-2">
          <h2 className="font-mono-tabular text-xs font-bold tracking-widest text-stone-900 uppercase">
            § 02 · RECENTLY VERIFIED MANDATES ON THE WIRE
          </h2>
          <Link
            href="/jobs"
            className="font-mono-tabular text-xs font-semibold text-stone-900 hover:underline"
          >
            OPEN FULL LEDGER →
          </Link>
        </div>

        <div className="divide-y divide-stone-300 border border-stone-900 bg-[#FBF9F4]">
          {previewJobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="group grid gap-2 px-4 py-3.5 transition hover:bg-[#EFECE4] sm:grid-cols-12 sm:items-center"
            >
              <div className="sm:col-span-3">
                <div className="text-xs font-bold text-stone-900">
                  {j.orgName}
                </div>
                <div className="font-mono-tabular text-[11px] text-stone-500">
                  {j.location}
                </div>
              </div>

              <div className="sm:col-span-5">
                <div className="font-serif-editorial text-base font-normal text-stone-950 group-hover:underline">
                  {j.title}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:col-span-3">
                <span className="border border-stone-900 bg-stone-900 px-1.5 py-0.5 font-mono-tabular text-[10px] text-[#F6F3EC] uppercase">
                  {label(JOB_TYPES, j.type)}
                </span>
                <span className="border border-stone-400 px-1.5 py-0.5 font-mono-tabular text-[10px] font-semibold text-stone-800">
                  {label(EXPERIENCE, j.experience)}
                </span>
                {j.sectors.slice(0, 1).map((s) => (
                  <span
                    key={s}
                    className="border border-stone-300 bg-white px-1.5 py-0.5 font-mono-tabular text-[10px] text-stone-600"
                  >
                    {SECTORS[s as Sector] ?? s}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-end font-mono-tabular text-[11px] text-stone-600 sm:col-span-1">
                <ArrowUpRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-stone-950" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
