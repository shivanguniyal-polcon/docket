import Link from "next/link";
import {
  Plus,
  ExternalLink,
  Calendar,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  JOB_TYPES,
  label,
  type ApplicationStatus,
} from "@/lib/taxonomy";
import {
  addCustomApplicationAction,
  deleteApplicationAction,
  moveApplicationStatusAction,
  updateApplicationAction,
} from "@/app/actions";

const COLUMNS: {
  key: ApplicationStatus;
  title: string;
  headerBg: string;
}[] = [
  { key: "saved", title: "Saved / Shortlisted", headerBg: "bg-stone-100 text-stone-800" },
  { key: "applied", title: "Applied", headerBg: "bg-sky-50 text-sky-900" },
  { key: "interviewing", title: "Interviewing / Assignment", headerBg: "bg-amber-50 text-amber-900" },
  { key: "offer", title: "Offer Received", headerBg: "bg-emerald-50 text-emerald-900" },
  { key: "rejected", title: "Rejected", headerBg: "bg-rose-50 text-rose-900" },
  { key: "withdrawn", title: "Withdrawn", headerBg: "bg-stone-100 text-stone-600" },
];

export default async function TrackerPage() {
  const user = await requireUser();
  const apps = await db
    .select()
    .from(schema.application)
    .where(eq(schema.application.userId, user.id))
    .orderBy(desc(schema.application.updatedAt));

  const grouped = new Map<ApplicationStatus, typeof apps>();
  for (const s of APPLICATION_STATUSES) grouped.set(s, []);
  for (const a of apps) {
    const key = (
      (APPLICATION_STATUSES as readonly string[]).includes(a.status)
        ? a.status
        : "saved"
    ) as ApplicationStatus;
    grouped.get(key)!.push(a);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            My Application Tracker
          </h1>
          <p className="text-xs text-stone-600">
            Track every application, deadline, contact &amp; interview note.
            Email reminders fire 7 days and 1 day before deadlines.
          </p>
        </div>

        <a
          href="/api/calendar.ics"
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
        >
          <Calendar className="h-3.5 w-3.5" />
          Export Deadlines (.ics)
        </a>
      </div>

      {/* Add off-platform / custom application */}
      <details className="rounded-2xl border border-stone-200 bg-white p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-stone-900">
          <Plus className="h-4 w-4" />
          Add an off-platform application (LinkedIn, referral, cold email, etc.)
        </summary>

        <form
          action={addCustomApplicationAction}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
        >
          <input
            type="text"
            name="title"
            required
            placeholder="Role title (e.g. Policy Analyst Intern)"
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs sm:col-span-2"
          />
          <input
            type="text"
            name="orgName"
            required
            placeholder="Organization (e.g. CEEW)"
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
          <select
            name="type"
            defaultValue="full_time"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
          >
            {Object.entries(JOB_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue="saved"
            className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
          >
            {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="deadline"
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
          <input
            type="url"
            name="url"
            placeholder="Application link (optional)"
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs sm:col-span-3"
          />
          <input
            type="text"
            name="notes"
            placeholder="Notes / contact person (optional)"
            className="rounded-xl border border-stone-300 px-3 py-2 text-xs sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Add to Tracker
          </button>
        </form>
      </details>

      {/* Kanban Board */}
      {apps.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-stone-800">
            Your application board is empty.
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Save roles from the live feed or add a custom application above.
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Browse Live Job Feed
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const items = grouped.get(col.key) ?? [];
            return (
              <div
                key={col.key}
                className="flex flex-col rounded-2xl border border-stone-200 bg-stone-100/60 p-3"
              >
                <div
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${col.headerBg}`}
                >
                  <span>{col.title}</span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px]">
                    {items.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-[11px] text-stone-400">
                      No roles in {col.title.toLowerCase()}
                    </div>
                  ) : (
                    items.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-semibold text-stone-500">
                              {a.orgName}
                            </div>
                            {a.jobId ? (
                              <Link
                                href={`/jobs/${a.jobId}`}
                                className="text-sm font-bold text-stone-900 hover:underline"
                              >
                                {a.title}
                              </Link>
                            ) : (
                              <div className="text-sm font-bold text-stone-900">
                                {a.title}
                              </div>
                            )}
                          </div>
                          {a.url && (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-400 hover:text-stone-900"
                              title="Open posting"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600">
                          {a.type && (
                            <span className="rounded bg-stone-100 px-1.5 py-0.5">
                              {label(JOB_TYPES, a.type)}
                            </span>
                          )}
                          {a.deadline && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-900">
                              Due {a.deadline}
                            </span>
                          )}
                          {a.appliedAt && (
                            <span className="text-stone-400">
                              Applied {a.appliedAt}
                            </span>
                          )}
                          {a.cvVersion && (
                            <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
                              CV: {a.cvVersion}
                            </span>
                          )}
                          {a.writingSample && (
                            <span className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
                              Sample: {a.writingSample}
                            </span>
                          )}
                          {a.nextFollowUp && (
                            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-900">
                              Follow-up: {a.nextFollowUp}
                            </span>
                          )}
                        </div>

                        {a.notes && (
                          <p className="mt-2 rounded-lg bg-stone-50 p-2 text-xs text-stone-700">
                            {a.notes}
                          </p>
                        )}

                        {/* Quick status move */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-stone-100 pt-2.5">
                          <div className="flex flex-wrap gap-1">
                            {APPLICATION_STATUSES.filter(
                              (s) => s !== a.status,
                            ).map((nextStatus) => (
                              <form
                                key={nextStatus}
                                action={moveApplicationStatusAction}
                              >
                                <input type="hidden" name="id" value={a.id} />
                                <input
                                  type="hidden"
                                  name="status"
                                  value={nextStatus}
                                />
                                <button
                                  type="submit"
                                  className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-700 hover:bg-stone-900 hover:text-white"
                                >
                                  → {APPLICATION_STATUS_LABELS[nextStatus]}
                                </button>
                              </form>
                            ))}
                          </div>

                          <form action={deleteApplicationAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <button
                              type="submit"
                              className="p-1 text-stone-400 hover:text-rose-600"
                              title="Remove from tracker"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </div>

                        {/* Expandable edit notes / dates */}
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-[11px] font-medium text-stone-500 hover:text-stone-900">
                            Edit notes, deadline &amp; contacts
                          </summary>
                          <form
                            action={updateApplicationAction}
                            className="mt-2 space-y-2 border-t border-stone-100 pt-2"
                          >
                            <input type="hidden" name="id" value={a.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={a.status}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-stone-500">
                                  Deadline
                                </label>
                                <input
                                  type="date"
                                  name="deadline"
                                  defaultValue={a.deadline ?? ""}
                                  className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-stone-500">
                                  Applied date
                                </label>
                                <input
                                  type="date"
                                  name="appliedAt"
                                  defaultValue={a.appliedAt ?? ""}
                                  className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
                                />
                              </div>
                            </div>
                            <textarea
                              name="notes"
                              rows={2}
                              defaultValue={a.notes ?? ""}
                              placeholder="Interview notes, test prompts, follow-ups…"
                              className="w-full rounded-lg border border-stone-300 p-2 text-xs"
                            />
                            <input
                              type="text"
                              name="contacts"
                              defaultValue={a.contacts ?? ""}
                              placeholder="Contact / HR / alum name & email"
                              className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                name="cvVersion"
                                defaultValue={a.cvVersion ?? ""}
                                placeholder="CV version sent (e.g. Quant CV)"
                                className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                name="writingSample"
                                defaultValue={a.writingSample ?? ""}
                                placeholder="Writing sample attached"
                                className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-stone-500">
                                Next follow-up date (7-day cold-email / HR nudge)
                              </label>
                              <input
                                type="date"
                                name="nextFollowUp"
                                defaultValue={a.nextFollowUp ?? ""}
                                className="w-full rounded-lg border border-stone-300 px-2 py-1 text-xs"
                              />
                            </div>
                            <label className="flex items-center gap-1.5 text-[11px] text-stone-600">
                              <input
                                type="checkbox"
                                name="shareOutcome"
                                defaultChecked={a.shareOutcome}
                              />
                              Count anonymously toward cohort outcome stats (n ≥
                              5)
                            </label>
                            <button
                              type="submit"
                              className="w-full rounded-lg bg-stone-900 py-1.5 text-xs font-semibold text-white"
                            >
                              Save changes
                            </button>
                          </form>
                        </details>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
