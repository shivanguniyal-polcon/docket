import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Calendar,
  Building2,
  Bookmark,
  Check,
  RefreshCw,
  Users,
  Send,
  Share2,
  AlertCircle,
} from "lucide-react";
import { getUser } from "@/lib/session";
import { db, schema } from "@/db";
import { ensureDbReady } from "@/db/auto-bootstrap";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import {
  EXPERIENCE,
  JOB_TYPES,
  LOCATION_TYPES,
  SECTORS,
  APPLICATION_STATUS_LABELS,
  NOTE_KINDS,
  label,
  type Sector,
  type ApplicationStatus,
} from "@/lib/taxonomy";
import {
  trackJobAction,
  refreshJobJDAction,
  requestReferralAction,
  reportClosedJobAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/loading-button";
import { FitScoreWidget } from "@/components/fit-score-widget";
import { StructuredJobDescription } from "@/components/structured-job-description";
import { ORG_HIRING_PLAYBOOK } from "@/lib/placement-intelligence";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureDbReady();
  const user = await getUser();
  const { id } = await params;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) notFound();

  const [jobRow] = await db
    .select()
    .from(schema.job)
    .where(eq(schema.job.id, id))
    .limit(1);

  if (!jobRow) notFound();

  const [[org], [tracked], [fit], orgNotes, allAlumni, similarJobs] = await Promise.all([
    jobRow.orgId
      ? db
          .select()
          .from(schema.organization)
          .where(eq(schema.organization.id, jobRow.orgId))
          .limit(1)
      : Promise.resolve([ undefined ]),
    user
      ? db
          .select()
          .from(schema.application)
          .where(
            and(
              eq(schema.application.userId, user.id),
              eq(schema.application.jobId, jobRow.id),
            ),
          )
          .limit(1)
      : Promise.resolve([ undefined ]),
    user
      ? db
          .select()
          .from(schema.fitScore)
          .where(
            and(
              eq(schema.fitScore.userId, user.id),
              eq(schema.fitScore.jobId, jobRow.id),
            ),
          )
          .limit(1)
      : Promise.resolve([ undefined ]),
    jobRow.orgId
      ? db
          .select()
          .from(schema.orgNote)
          .where(eq(schema.orgNote.orgId, jobRow.orgId))
          .orderBy(desc(schema.orgNote.createdAt))
          .limit(5)
      : Promise.resolve([]),
    db
      .select({
        user: schema.user,
        profile: schema.profile,
      })
      .from(schema.profile)
      .innerJoin(schema.user, eq(schema.user.id, schema.profile.userId))
      .where(eq(schema.profile.alumniOptIn, true)),
    db
      .select({
        id: schema.job.id,
        title: schema.job.title,
        orgName: schema.job.orgName,
        type: schema.job.type,
        experience: schema.job.experience,
        location: schema.job.location,
        locationType: schema.job.locationType,
        deadline: schema.job.deadline,
        sectors: schema.job.sectors,
      })
      .from(schema.job)
      .where(
        and(
          eq(schema.job.status, "published"),
          ne(schema.job.id, jobRow.id),
          or(
            jobRow.type ? eq(schema.job.type, jobRow.type) : undefined,
            ...(jobRow.sectors || []).map(
              (s) => sql`${s} = ANY(${schema.job.sectors})`,
            ),
          ),
        ),
      )
      .orderBy(desc(schema.job.postedAt))
      .limit(3),
  ]);

  const matchingAlumni = allAlumni.filter(({ profile }) => {
    if (!profile.currentOrg) return false;
    const co = profile.currentOrg.toLowerCase().replace(/\(.*?\)/g, "").trim();
    const jo = jobRow.orgName.toLowerCase();
    return co.length >= 3 && (jo.includes(co) || co.includes(jo));
  });

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to job feed
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
              {org ? (
                <Link
                  href={`/orgs/${org.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-stone-900 hover:underline"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {jobRow.orgName}
                </Link>
              ) : (
                <span className="font-semibold text-stone-900">
                  {jobRow.orgName}
                </span>
              )}
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {jobRow.location ?? label(LOCATION_TYPES, jobRow.locationType)}
              </span>
              {jobRow.deadline && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                    <Calendar className="h-3.5 w-3.5" />
                    Deadline: {jobRow.deadline}
                  </span>
                </>
              )}
            </div>

            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {jobRow.title}
            </h1>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="rounded-md bg-stone-900 px-2.5 py-0.5 text-xs font-medium text-white">
                {label(JOB_TYPES, jobRow.type)}
              </span>
              <span className="rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                {label(EXPERIENCE, jobRow.experience)}
              </span>
              <span className="rounded-md bg-stone-100 px-2.5 py-0.5 text-xs text-stone-700">
                {label(LOCATION_TYPES, jobRow.locationType)}
              </span>
              {jobRow.sectors.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-stone-200 px-2.5 py-0.5 text-xs text-stone-600"
                >
                  {SECTORS[s as Sector] ?? s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tracked ? (
              <Link
                href="/tracker"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800"
              >
                <Check className="h-4 w-4" />
                In Tracker:{" "}
                {
                  APPLICATION_STATUS_LABELS[
                    tracked.status as ApplicationStatus
                  ]
                }
              </Link>
            ) : (
              <>
                <form action={trackJobAction}>
                  <input type="hidden" name="jobId" value={jobRow.id} />
                  <input type="hidden" name="status" value="saved" />
                  <SubmitButton
                    pendingText="Saving…"
                    icon={<Bookmark className="h-3.5 w-3.5" />}
                    className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                  >
                    Save to Tracker
                  </SubmitButton>
                </form>
                <form action={trackJobAction}>
                  <input type="hidden" name="jobId" value={jobRow.id} />
                  <input type="hidden" name="status" value="applied" />
                  <SubmitButton
                    pendingText="Marking Applied…"
                    className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
                  >
                    Mark as Applied
                  </SubmitButton>
                </form>
              </>
            )}

            <a
              href={jobRow.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-900 hover:bg-stone-50"
            >
              Apply on official site
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Check this policy opening on Docket: ${jobRow.title} at ${jobRow.orgName} — https://docket-mpp.vercel.app/jobs/${jobRow.id}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-100"
              title="Share to cohort WhatsApp group"
            >
              <Share2 className="h-3.5 w-3.5" />
              WhatsApp
            </a>

            <a
              href={`https://www.google.com/search?q=site:linkedin.com/in+${encodeURIComponent(`"${jobRow.orgName}" ("Director" OR "Lead" OR "Partner" OR "Fellow" OR "Programme Lead" OR "HR") "IIT Delhi"`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              title="Find IIT Delhi seniors and hiring leads on LinkedIn"
            >
              Leads on LinkedIn
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <form action={reportClosedJobAction}>
              <input type="hidden" name="jobId" value={jobRow.id} />
              <SubmitButton
                pendingText="Reporting…"
                icon={<AlertCircle className="h-3.5 w-3.5" />}
                className="rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-500 hover:border-rose-400 hover:text-rose-700"
                title="Report this job as closed or dead link to save cohort time"
              >
                Report Closed
              </SubmitButton>
            </form>
          </div>
        </div>

        {/* AI Fit Widget & Cover Note Drafter */}
        <div className="mt-6">
          <FitScoreWidget
            jobId={jobRow.id}
            isSignedIn={Boolean(user)}
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
        </div>

        {/* Employer Hiring Playbook Callout */}
        {(() => {
          const playbook =
            (org?.slug ? ORG_HIRING_PLAYBOOK[org.slug] : undefined) ??
            Object.values(ORG_HIRING_PLAYBOOK).find(
              (p) =>
                p.name.toLowerCase().includes(jobRow.orgName.toLowerCase()) ||
                jobRow.orgName.toLowerCase().includes(p.name.toLowerCase()),
            );
          if (!playbook) return null;
          return (
            <div className="mt-4 border border-stone-300 bg-[#EFECE3] p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 pb-2">
                <span className="font-mono-tabular font-bold text-stone-900 uppercase">
                  Institutional Playbook · {playbook.hiringChannel}
                </span>
                <span className="border border-stone-900 bg-stone-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
                  {playbook.tier.toUpperCase()} TARGET
                </span>
              </div>
              <div className="mt-2 text-stone-800 leading-relaxed">
                <strong>Hiring Advice:</strong>{" "}
                {playbook.howToApplyWhenZeroListed}
              </div>
              <div className="mt-2 font-mono-tabular text-[11px] text-stone-600">
                Typical Entry Roles: {playbook.entryRoles}
              </div>
            </div>
          );
        })()}

        {/* Inline IITD MPP Alumni & Seniors at this Organization */}
        {matchingAlumni.length > 0 && (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/70 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-950">
              <Users className="h-4 w-4 text-sky-700" />
              {matchingAlumni.length} IITD MPP Senior
              {matchingAlumni.length > 1 ? "s / Alumni" : " / Alum"} connected
              to {jobRow.orgName}
            </div>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              {matchingAlumni.map(({ user: alum, profile }) => (
                <div
                  key={alum.id}
                  className="rounded-lg border border-sky-200 bg-white p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">
                      {alum.name}
                    </span>
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                      {alum.batch ?? "IITD MPP"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-stone-600">
                    {profile.currentRole} · {profile.currentOrg}
                  </div>
                  {profile.openToReferrals && alum.id !== user?.id && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] font-semibold text-sky-900 hover:underline">
                        Request a referral or 15-min prep chat →
                      </summary>
                      <form
                        action={requestReferralAction}
                        className="mt-2 space-y-1.5"
                      >
                        <input
                          type="hidden"
                          name="toUserId"
                          value={alum.id}
                        />
                        <input
                          type="hidden"
                          name="jobId"
                          value={jobRow.id}
                        />
                        <textarea
                          name="message"
                          required
                          rows={2}
                          defaultValue={`Hi ${alum.name.split(" ")[0]}, I'm in the IITD MPP cohort applying for "${jobRow.title}" at ${jobRow.orgName}. Would love any quick tips on the assignment/interview or a referral if appropriate!`}
                          className="w-full rounded border border-stone-300 p-1.5 text-xs"
                        />
                        <SubmitButton
                          pendingText="Sending…"
                          icon={<Send className="h-3 w-3" />}
                          className="rounded bg-stone-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          Send request
                        </SubmitButton>
                      </form>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Structured Official Job Description */}
        <StructuredJobDescription
          jobId={jobRow.id}
          description={jobRow.description}
          officialUrl={jobRow.url}
          refreshAction={refreshJobJDAction}
        />
      </div>

      {/* Cohort notes on this organization */}
      {org && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Cohort Memory on {org.name}
              </h2>
              <p className="text-xs text-stone-500">
                Interview timelines, assignments &amp; tips left by IITD MPP
                batches
              </p>
            </div>
            <Link
              href={`/orgs/${org.slug}`}
              className="text-xs font-semibold text-stone-900 hover:underline"
            >
              Open organization profile &amp; add note →
            </Link>
          </div>

          {orgNotes.length === 0 ? (
            <p className="mt-3 text-xs text-stone-500">
              No cohort notes yet for {org.name}. Be the first to add one on the
              organization page!
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {orgNotes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span className="font-semibold text-stone-800">
                      {label(NOTE_KINDS, n.kind)}
                    </span>
                    <span>{n.batch ?? "MPP Cohort"}</span>
                  </div>
                  <p className="mt-1 text-stone-700">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Similar Early-Career Openings */}
      {similarJobs.length > 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                More Relevant Early-Career Roles &amp; Fellowships
              </h2>
              <p className="text-xs text-stone-500">
                Overlapping mandates in {jobRow.sectors.join(", ")}
              </p>
            </div>
            <Link
              href="/jobs"
              className="text-xs font-semibold text-stone-900 hover:underline"
            >
              Back to all mandates →
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {similarJobs.map((sj) => (
              <Link
                key={sj.id}
                href={`/jobs/${sj.id}`}
                prefetch={false}
                className="flex flex-col justify-between rounded-xl border border-stone-200 p-3.5 transition hover:border-stone-900"
              >
                <div>
                  <div className="font-mono-tabular text-[10px] font-bold text-stone-600 uppercase line-clamp-1">
                    {sj.orgName}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs font-bold text-stone-950">
                    {sj.title}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2 font-mono-tabular text-[10px]">
                  <span className="text-stone-500 uppercase">
                    {label(JOB_TYPES, sj.type)}
                  </span>
                  <span className="font-semibold text-stone-900">
                    {sj.deadline ? `Due ${sj.deadline}` : "Open"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
