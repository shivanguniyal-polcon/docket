import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  BarChart3,
  MessageSquarePlus,
  Trash2,
  Lock,
} from "lucide-react";
import { getUser, isModerator } from "@/lib/session";
import { db, schema } from "@/db";
import { and, desc, eq } from "drizzle-orm";
import {
  EXPERIENCE,
  JOB_TYPES,
  NOTE_KINDS,
  ORG_CATEGORIES,
  SECTORS,
  label,
  type Sector,
} from "@/lib/taxonomy";
import { addOrgNoteAction, deleteOrgNoteAction } from "@/app/actions";

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getUser();
  const { slug } = await params;

  const [org] = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.slug, slug))
    .limit(1);

  if (!org) notFound();

  const [openJobs, notes, sharedApps, recurring] = await Promise.all([
    db
      .select()
      .from(schema.job)
      .where(
        and(eq(schema.job.orgId, org.id), eq(schema.job.status, "published")),
      )
      .orderBy(desc(schema.job.postedAt)),
    db
      .select({
        note: schema.orgNote,
        authorName: schema.user.name,
      })
      .from(schema.orgNote)
      .leftJoin(schema.user, eq(schema.user.id, schema.orgNote.userId))
      .where(eq(schema.orgNote.orgId, org.id))
      .orderBy(desc(schema.orgNote.createdAt)),
    db
      .select()
      .from(schema.application)
      .where(
        and(
          eq(schema.application.orgId, org.id),
          eq(schema.application.shareOutcome, true),
        ),
      ),
    db
      .select()
      .from(schema.recurringDeadline)
      .where(eq(schema.recurringDeadline.orgId, org.id)),
  ]);

  // Anonymous outcome stats — strict k-anonymity threshold n >= 5
  const totalReports = sharedApps.filter((a) => a.status !== "saved").length;
  const kAnonymousMet = totalReports >= 5;
  const outcomeCounts = {
    applied: sharedApps.filter((a) =>
      ["applied", "interviewing", "offer", "rejected"].includes(a.status),
    ).length,
    interviewing: sharedApps.filter((a) =>
      ["interviewing", "offer"].includes(a.status),
    ).length,
    offer: sharedApps.filter((a) => a.status === "offer").length,
    rejected: sharedApps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/orgs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to organization directory
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="rounded-md bg-stone-100 px-2 py-0.5 font-semibold text-stone-700">
                {label(ORG_CATEGORIES, org.category)}
              </span>
              {org.hq && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {org.hq}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {org.name}
            </h1>

            {org.description && (
              <p className="max-w-3xl text-sm text-stone-600">
                {org.description}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {org.sectors.map((s) => (
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
            {org.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
              >
                Website
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {org.careersUrl && (
              <a
                href={org.careersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Official Careers Page
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Anonymous Cohort Outcome Stats (k >= 5) */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-700" />
            <h2 className="text-base font-bold text-stone-900">
              Anonymous Cohort Outcome Funnel
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] text-stone-600">
            <Lock className="h-3 w-3" />
            Privacy threshold: n ≥ 5
          </span>
        </div>

        {kAnonymousMet ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
              <div className="text-2xl font-bold text-stone-900">
                {outcomeCounts.applied}
              </div>
              <div className="text-xs text-stone-600">Total applications</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
              <div className="text-2xl font-bold text-amber-900">
                {outcomeCounts.interviewing} (
                {Math.round(
                  (outcomeCounts.interviewing /
                    Math.max(1, outcomeCounts.applied)) *
                    100,
                )}
                %)
              </div>
              <div className="text-xs text-amber-800">Reached interview</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="text-2xl font-bold text-emerald-900">
                {outcomeCounts.offer} (
                {Math.round(
                  (outcomeCounts.offer / Math.max(1, outcomeCounts.applied)) *
                    100,
                )}
                %)
              </div>
              <div className="text-xs text-emerald-800">Offers received</div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
              <div className="text-2xl font-bold text-stone-700">
                {outcomeCounts.rejected}
              </div>
              <div className="text-xs text-stone-500">Closed / Rejected</div>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-stone-500">
            Currently <strong>{totalReports}</strong> of <strong>5</strong>{" "}
            required anonymous outcome reports logged by the cohort. Numbers
            unlock automatically once 5 members track an application to{" "}
            {org.name}, preventing individual identification.
          </p>
        )}
      </div>

      {/* Shared Cohort Notes (Inheritable across batches) */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-base font-bold text-stone-900">
          Inheritable Cohort Notes ({notes.length})
        </h2>
        <p className="text-xs text-stone-500">
          Leave interview questions, written assignment prompts, stipend/CTC
          ranges, or timeline notes for future MPP batches.
        </p>

        <form
          action={addOrgNoteAction}
          className="mt-4 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
        >
          <input type="hidden" name="orgId" value={org.id} />
          <input type="hidden" name="orgSlug" value={org.slug} />

          <div className="flex flex-wrap items-center gap-3">
            <select
              name="kind"
              defaultValue="assignment"
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs"
            >
              {Object.entries(NOTE_KINDS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 text-xs text-stone-700">
              <input type="checkbox" name="anonymous" defaultChecked />
              Post anonymously (shows only your batch year, e.g.{" "}
              {user?.batch ?? "MPP Cohort"})
            </label>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-4">
            <input
              type="text"
              name="roleTitle"
              placeholder="Role (e.g. Research Intern, Associate)"
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              name="compensation"
              placeholder="Stipend / CTC (e.g. ₹20k/mo or ₹12 LPA)"
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              name="assignmentTimeLimit"
              placeholder="Assignment window (e.g. 48 hours)"
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
            />
            <input
              type="text"
              name="assignmentTools"
              placeholder="Tools tested (e.g. R / Stata / 2p Memo)"
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs"
            />
          </div>

          <textarea
            name="body"
            required
            rows={3}
            placeholder="Example: Round 1 is a 48-hour policy memo (1,200 words) on state electricity discoms; Round 2 is a 30-min panel interview with the programme lead…"
            className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs"
          />

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Save Note for Future Batches
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {notes.map(({ note, authorName }) => {
            const canDelete = Boolean(
              user && (note.userId === user.id || isModerator(user.role)),
            );
            return (
              <div
                key={note.id}
                className="rounded-xl border border-stone-200 p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-amber-50 px-2 py-0.5 font-semibold text-amber-900">
                      {label(NOTE_KINDS, note.kind)}
                    </span>
                    {note.roleTitle && (
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-semibold text-stone-800">
                        Role: {note.roleTitle}
                      </span>
                    )}
                    {note.compensation && (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                        Pay: {note.compensation}
                      </span>
                    )}
                    {note.assignmentTimeLimit && (
                      <span className="rounded bg-sky-50 px-2 py-0.5 font-semibold text-sky-900">
                        Window: {note.assignmentTimeLimit}
                      </span>
                    )}
                    {note.assignmentTools && (
                      <span className="rounded border border-stone-200 px-2 py-0.5 text-stone-700">
                        Tools: {note.assignmentTools}
                      </span>
                    )}
                    <span className="font-medium text-stone-700">
                      ·{" "}
                      {note.anonymous
                        ? `Anonymous (${note.batch ?? "MPP Cohort"})`
                        : `${authorName ?? "Cohort Member"} (${note.batch ?? "MPP"})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      {new Date(note.createdAt).toLocaleDateString("en-IN")}
                    </span>
                    {canDelete && (
                      <form action={deleteOrgNoteAction}>
                        <input type="hidden" name="noteId" value={note.id} />
                        <input type="hidden" name="orgSlug" value={org.slug} />
                        <button
                          type="submit"
                          className="text-stone-400 hover:text-rose-600"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-800">
                  {note.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Openings & Recurring Cycles at this Org */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-bold text-stone-900">
            Active Openings at {org.name} ({openJobs.length})
          </h2>
          {openJobs.length === 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              No live openings on the feed right now.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {openJobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="block rounded-xl border border-stone-200 p-3 hover:border-stone-400"
                >
                  <div className="text-sm font-semibold text-stone-900">
                    {j.title}
                  </div>
                  <div className="mt-1 flex gap-2 text-[11px] text-stone-500">
                    <span>{label(JOB_TYPES, j.type)}</span>
                    <span>·</span>
                    <span>{label(EXPERIENCE, j.experience)}</span>
                    {j.deadline && (
                      <>
                        <span>·</span>
                        <span className="text-amber-800">Due {j.deadline}</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-bold text-stone-900">
            Recurring Annual Programmes ({recurring.length})
          </h2>
          {recurring.length === 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              No recurring fellowships mapped directly to this organization.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {recurring.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-stone-200 p-3 text-xs"
                >
                  <div className="font-semibold text-stone-900">{r.title}</div>
                  <p className="mt-1 text-stone-600">{r.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
