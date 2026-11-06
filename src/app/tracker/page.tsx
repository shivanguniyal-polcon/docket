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
import { SubmitButton } from "@/components/loading-button";

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

  // Compute Portfolio Balance & Placement Readiness metrics
  const totalTracked = apps.length;
  const activeSubmittedCount =
    (grouped.get("applied")?.length ?? 0) +
    (grouped.get("interviewing")?.length ?? 0) +
    (grouped.get("offer")?.length ?? 0);
  const withFollowUp = apps.filter((a) => Boolean(a.nextFollowUp)).length;
  const withWritingSample = apps.filter((a) => Boolean(a.writingSample)).length;

  const consultingCount = apps.filter((a) =>
    /samagra|dalberg|pwc|ey|deloitte|sattva|microsave|bga|bower|athena|mckinsey|bcg/i.test(
      a.orgName,
    ),
  ).length;
  const thinkTankOrSafetyCount = apps.filter((a) =>
    /ceew|prs|csep|icrier|nipfp|vidhi|esya|koan|graam|pravi|nfprc|crisp|niti|swaniti|orf|cpr/i.test(
      a.orgName,
    ),
  ).length;

  const portfolioWarnings: string[] = [];
  if (totalTracked < 12) {
    portfolioWarnings.push(
      `Your pipeline has ${totalTracked}/15 recommended target organizations. Successful MPP candidates track at least 15–20 organizations across 3 tiers.`,
    );
  }
  if (consultingCount > 0 && thinkTankOrSafetyCount < 2) {
    portfolioWarnings.push(
      "High Concentration Risk: Your pipeline is heavy on selective consulting firms with fewer than 2 Think-Tank / Rolling Portal safety nets.",
    );
  }
  if (activeSubmittedCount > 0 && withFollowUp === 0) {
    portfolioWarnings.push(
      "Zero follow-up dates scheduled: Set a 7-day follow-up date on your applied cards so cold emails and applications don't go cold.",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-stone-900 pb-4">
        <div>
          <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-900 uppercase">
            § 02 · PERSONAL PLACEMENT LEDGER &amp; PORTFOLIO RADAR
          </div>
          <h1 className="font-serif-editorial mt-1 text-3xl font-normal tracking-tight text-stone-950">
            My Application Tracker &amp; Safety-Net Diagnostic
          </h1>
          <p className="mt-1 text-xs text-stone-700">
            Track every target organization, CV version, writing sample &amp;
            7-day follow-up date. Automated email reminders fire 7 days and 1
            day before deadlines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/resources"
            className="border border-stone-900 bg-stone-900 px-3.5 py-2 text-xs font-bold tracking-wider text-[#FBF9F4] uppercase hover:bg-stone-800"
          >
            Auto-Generate 20-Org Target List →
          </Link>
          <a
            href="/api/calendar.ics"
            className="inline-flex items-center gap-1.5 border border-stone-900 bg-[#FBF9F4] px-3.5 py-2 text-xs font-bold text-stone-900 uppercase hover:bg-stone-900 hover:text-[#FBF9F4]"
          >
            <Calendar className="h-3.5 w-3.5" />
            Export Deadlines (.ics)
          </a>
        </div>
      </div>

      {/* Placement Coverage & Portfolio Risk Radar */}
      <div className="border-2 border-stone-900 bg-[#FBF9F4] p-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
            <div className="border border-stone-300 bg-white p-3">
              <div className="font-mono-tabular text-[10px] font-bold text-stone-500 uppercase">
                Total Pipeline Targets
              </div>
              <div className="font-mono-tabular mt-1 text-2xl font-bold text-stone-950">
                {totalTracked}{" "}
                <span className="text-xs font-normal text-stone-500">/ 15 goal</span>
              </div>
            </div>
            <div className="border border-stone-300 bg-white p-3">
              <div className="font-mono-tabular text-[10px] font-bold text-stone-500 uppercase">
                Applied / Interviewing
              </div>
              <div className="font-mono-tabular mt-1 text-2xl font-bold text-stone-950">
                {activeSubmittedCount}
              </div>
            </div>
            <div className="border border-stone-300 bg-white p-3">
              <div className="font-mono-tabular text-[10px] font-bold text-stone-500 uppercase">
                Think Tank &amp; Rolling Nets
              </div>
              <div className="font-mono-tabular mt-1 text-2xl font-bold text-emerald-900">
                {thinkTankOrSafetyCount}
              </div>
            </div>
            <div className="border border-stone-300 bg-white p-3">
              <div className="font-mono-tabular text-[10px] font-bold text-stone-500 uppercase">
                Writing Sample Logged
              </div>
              <div className="font-mono-tabular mt-1 text-2xl font-bold text-amber-900">
                {withWritingSample}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center border-t border-stone-300 pt-3 lg:col-span-5 lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
            <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
              PORTFOLIO BALANCE DIAGNOSTIC
            </div>
            {portfolioWarnings.length === 0 ? (
              <p className="mt-1 text-xs font-semibold text-emerald-900">
                ✓ Your placement pipeline is well-balanced across reach consulting,
                core think tanks, and rolling safety-net institutions.
              </p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs leading-relaxed text-stone-800">
                {portfolioWarnings.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
          <SubmitButton
            pendingText="Adding to Tracker…"
            className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Add to Tracker
          </SubmitButton>
        </form>
      </details>

      {/* Kanban Board */}
      {apps.length === 0 ? (
        <div className="border-2 border-stone-900 bg-[#FBF9F4] p-8">
          <div className="max-w-2xl">
            <span className="bg-amber-900 px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#FBF9F4] uppercase">
              STARTER SAFETY NET
            </span>
            <h2 className="font-serif-editorial mt-2 text-2xl text-stone-950">
              Your Placement Board is Empty — Start With 5 Guaranteed Rolling Portals
            </h2>
            <p className="mt-1 text-xs text-stone-700 leading-relaxed">
              Don&apos;t wait for off-campus cold calls. Every successful MPP student keeps at least 5 always-open government and think-tank rolling portals in their pipeline:
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "NITI Aayog", role: "Policy & Research Intern", note: "Opens 1st–10th every month. Zero fee." },
              { name: "PRS Legislative Research", role: "LAMP / Legislative Research Intern", note: "Essential parliamentary research portfolio item." },
              { name: "Competition Commission of India (CCI)", role: "Economics & Law Intern", note: "Opens 1st of every month with stipends." },
              { name: "CEEW", role: "Clean Energy Transition Intern", note: "India's premier climate policy think tank." },
              { name: "Invest India", role: "Strategic Investment Research Intern", note: "National investment promotion PMU." },
            ].map((safety) => (
              <div key={safety.name} className="border border-stone-300 bg-white p-3">
                <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                  {safety.name}
                </div>
                <div className="mt-0.5 text-xs font-bold text-stone-950">
                  {safety.role}
                </div>
                <p className="mt-1 text-[11px] text-stone-600">{safety.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/resources"
              className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-4 py-2.5 text-xs font-bold tracking-wider text-[#FBF9F4] uppercase hover:bg-stone-800"
            >
              Generate Tailored 20-Org List for My Background →
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 border border-stone-900 bg-white px-4 py-2.5 text-xs font-bold text-stone-900 uppercase hover:bg-stone-900 hover:text-[#FBF9F4]"
            >
              Browse 244 Verified Mandates →
            </Link>
          </div>
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

                        {/* Heard Back Pulse for Applied roles */}
                        {a.status === "applied" && (
                          <div className="mt-2.5 rounded-lg border border-amber-300 bg-amber-50/80 p-2 text-[10px]">
                            <div className="font-bold text-amber-950">
                              Heard back from {a.orgName}?
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <form action={moveApplicationStatusAction}>
                                <input type="hidden" name="id" value={a.id} />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="interviewing"
                                />
                                <SubmitButton
                                  pendingText="Updating…"
                                  className="rounded bg-emerald-800 px-2 py-0.5 font-bold text-white hover:bg-emerald-700"
                                >
                                  ✓ Interview / Assignment
                                </SubmitButton>
                              </form>
                              <form action={moveApplicationStatusAction}>
                                <input type="hidden" name="id" value={a.id} />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="withdrawn"
                                />
                                <SubmitButton
                                  pendingText="Updating…"
                                  className="rounded border border-stone-300 bg-white px-2 py-0.5 text-stone-700 hover:bg-stone-100"
                                >
                                  Ghosted (14+ d)
                                </SubmitButton>
                              </form>
                              <form action={moveApplicationStatusAction}>
                                <input type="hidden" name="id" value={a.id} />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="rejected"
                                />
                                <SubmitButton
                                  pendingText="Updating…"
                                  className="rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-rose-800 hover:bg-rose-100"
                                >
                                  Rejected
                                </SubmitButton>
                              </form>
                            </div>
                          </div>
                        )}

                        {/* Momentum Booster for Rejected roles */}
                        {a.status === "rejected" && (
                          <div className="mt-2.5 rounded-lg border border-rose-200 bg-rose-50/70 p-2 text-[10px]">
                            <div className="font-bold text-rose-950">
                              Keep Momentum:
                            </div>
                            <p className="mt-0.5 text-stone-600">
                              Rejections are standard in policy placement. Keep 15+ active targets.
                            </p>
                            <Link
                              href="/jobs"
                              className="mt-1 inline-block font-semibold text-stone-900 underline"
                            >
                              Browse similar open roles on Docket feed →
                            </Link>
                          </div>
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
                                <SubmitButton
                                  pendingText="Moving…"
                                  className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-700 hover:bg-stone-900 hover:text-white"
                                >
                                  → {APPLICATION_STATUS_LABELS[nextStatus]}
                                </SubmitButton>
                              </form>
                            ))}
                          </div>

                          <form action={deleteApplicationAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <SubmitButton
                              pendingText=""
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                              className="p-1 text-stone-400 hover:text-rose-600"
                              title="Remove from tracker"
                            />
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
                            <SubmitButton
                              pendingText="Saving changes…"
                              className="w-full rounded-lg bg-stone-900 py-1.5 text-xs font-semibold text-white"
                            >
                              Save changes
                            </SubmitButton>
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
