import Link from "next/link";
import { Calendar as CalendarIcon, Download, ExternalLink, Clock } from "lucide-react";
import { getUser } from "@/lib/session";
import { db, schema } from "@/db";
import { ensureDbReady } from "@/db/auto-bootstrap";
import { asc, eq, isNotNull } from "drizzle-orm";
import {
  EXPERIENCE,
  JOB_TYPES,
  SECTORS,
  label,
  type Sector,
} from "@/lib/taxonomy";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isMonthInWindow(
  month: number,
  openMonth: number | null,
  closeMonth: number | null,
): boolean {
  if (!openMonth) return false;
  const close = closeMonth ?? openMonth;
  if (openMonth <= close) {
    return month >= openMonth && month <= close;
  }
  // Wraps across New Year (e.g. Nov = 11 to Jan = 1)
  return month >= openMonth || month <= close;
}

export default async function CalendarPage() {
  await ensureDbReady();
  const user = await getUser();

  const [myApps, jobsWithDeadlines, recurring] = await Promise.all([
    user
      ? db
          .select()
          .from(schema.application)
          .where(eq(schema.application.userId, user.id))
          .orderBy(asc(schema.application.deadline))
      : Promise.resolve([]),
    db
      .select()
      .from(schema.job)
      .where(isNotNull(schema.job.deadline))
      .orderBy(asc(schema.job.deadline)),
    db.select().from(schema.recurringDeadline),
  ]);

  const myDeadlines = myApps.filter((a) => Boolean(a.deadline));
  const openDeadlines = jobsWithDeadlines.filter(
    (j) => j.status === "published" && Boolean(j.deadline),
  );

  const currentMonth = new Date().getMonth() + 1; // 1-12
  const activeRecurring = recurring.filter((r) =>
    isMonthInWindow(currentMonth, r.openMonth, r.closeMonth),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Deadlines &amp; Annual Policy Cycles
          </h1>
          <p className="text-xs text-stone-600">
            Personal tracked deadlines, live job closing dates, and the cohort
            calendar of recurring fellowships &amp; internships.
          </p>
        </div>

        <a
          href="/api/calendar.ics"
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
        >
          <Download className="h-3.5 w-3.5" />
          Subscribe / Export (.ics)
        </a>
      </div>

      {/* Currently Open / Active Window Banner */}
      {activeRecurring.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Clock className="h-4 w-4" />
            Cycles typically open in {MONTHS[currentMonth - 1]} (
            {activeRecurring.length})
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeRecurring.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-amber-200 bg-white p-3.5"
              >
                <div className="text-[11px] font-semibold text-stone-500">
                  {r.orgName}
                </div>
                <div className="mt-0.5 text-sm font-bold text-stone-900">
                  {r.title}
                </div>
                <p className="mt-1 text-xs text-stone-600">{r.notes}</p>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-amber-800">
                    Window: {r.openMonth ? MONTHS[r.openMonth - 1].slice(0, 3) : "—"}
                    {" – "}
                    {r.closeMonth ? MONTHS[r.closeMonth - 1].slice(0, 3) : "—"}
                  </span>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-stone-900 hover:underline"
                    >
                      Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Personal + Live Job Deadlines */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <CalendarIcon className="h-4 w-4 text-stone-700" />
            My Tracked Deadlines ({myDeadlines.length})
          </h2>
          {myDeadlines.length === 0 ? (
            <p className="mt-3 text-xs text-stone-500">
              No personal deadlines yet. Save a role with a deadline from the{" "}
              <Link href="/jobs" className="underline">
                job feed
              </Link>{" "}
              or set one in your{" "}
              <Link href="/tracker" className="underline">
                tracker
              </Link>
              .
            </p>
          ) : (
            <div className="mt-3 divide-y divide-stone-100">
              {myDeadlines.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div>
                    <div className="font-semibold text-stone-900">
                      {a.title}
                    </div>
                    <div className="text-stone-500">
                      {a.orgName} · status:{" "}
                      <span className="font-medium">{a.status}</span>
                    </div>
                  </div>
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-900">
                    {a.deadline}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <CalendarIcon className="h-4 w-4 text-stone-700" />
            Upcoming Closing Dates on the Feed ({openDeadlines.length})
          </h2>
          {openDeadlines.length === 0 ? (
            <p className="mt-3 text-xs text-stone-500">
              No fixed deadlines on current feed postings.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-stone-100">
              {openDeadlines.slice(0, 10).map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div>
                    <Link
                      href={`/jobs/${j.id}`}
                      prefetch={false}
                      className="font-semibold text-stone-900 hover:underline"
                    >
                      {j.title}
                    </Link>
                    <div className="text-stone-500">{j.orgName}</div>
                  </div>
                  <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-semibold text-stone-800">
                    {j.deadline}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Full Annual Recurring Cycles Directory */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">
            Shared Cohort Calendar of Recurring Annual Opportunities (
            {recurring.length})
          </h2>
          <p className="text-xs text-stone-500">
            Inherited year-on-year — fellowships, ministry internships,
            multilateral YPPs &amp; graduate scholarships.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recurring.map((r) => (
            <div
              key={r.id}
              className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-stone-600">
                    {r.orgName}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">
                    {r.openMonth ? MONTHS[r.openMonth - 1].slice(0, 3) : "TBA"}
                    {" – "}
                    {r.closeMonth ? MONTHS[r.closeMonth - 1].slice(0, 3) : "TBA"}
                  </span>
                </div>

                <h3 className="mt-1.5 text-sm font-bold text-stone-900">
                  {r.title}
                </h3>

                {r.eligibility && (
                  <p className="mt-1 text-[11px] font-medium text-stone-700">
                    Eligibility: {r.eligibility}
                  </p>
                )}
                {r.notes && (
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">
                    {r.notes}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t border-stone-100 pt-2.5">
                <div className="flex flex-wrap gap-1">
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
                    {label(JOB_TYPES, r.type)}
                  </span>
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
                    {label(EXPERIENCE, r.experience)}
                  </span>
                  {r.sectors.slice(0, 2).map((s) => (
                    <span
                      key={s}
                      className="rounded border border-stone-200 px-1.5 py-0.5 text-[10px] text-stone-600"
                    >
                      {SECTORS[s as Sector] ?? s}
                    </span>
                  ))}
                </div>

                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-900 hover:underline"
                  >
                    Official page
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
