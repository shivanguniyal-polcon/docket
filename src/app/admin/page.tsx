import Link from "next/link";
import {
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Users,
} from "lucide-react";
import { requireModerator } from "@/lib/session";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { ROLES } from "@/lib/taxonomy";
import {
  changeUserRoleAction,
  resolvePageChangeAction,
  reviewJobAction,
  syncSnapshotAction,
  triggerSourceRunAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/loading-button";
import { AdminWebSearch } from "@/components/admin-web-search";

export default async function AdminPage() {
  const mod = await requireModerator();
  const isOwner = mod.role === "owner";

  const [pendingJobs, openChanges, sources, users, auditLogs] =
    await Promise.all([
      db
        .select()
        .from(schema.job)
        .where(eq(schema.job.status, "pending"))
        .orderBy(desc(schema.job.createdAt)),
      db
        .select({
          change: schema.pageChange,
          source: schema.source,
          org: schema.organization,
        })
        .from(schema.pageChange)
        .innerJoin(
          schema.source,
          eq(schema.source.id, schema.pageChange.sourceId),
        )
        .innerJoin(
          schema.organization,
          eq(schema.organization.id, schema.source.orgId),
        )
        .where(eq(schema.pageChange.status, "open"))
        .orderBy(desc(schema.pageChange.detectedAt)),
      db
        .select({
          source: schema.source,
          org: schema.organization,
        })
        .from(schema.source)
        .innerJoin(
          schema.organization,
          eq(schema.organization.id, schema.source.orgId),
        ),
      db.select().from(schema.user).orderBy(desc(schema.user.createdAt)),
      db
        .select()
        .from(schema.roleAudit)
        .orderBy(desc(schema.roleAudit.createdAt))
        .limit(15),
    ]);

  const apiSources = sources.filter((s) => s.source.type !== "page_watch");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
            <ShieldCheck className="h-4 w-4" />
            Moderator &amp; Batch Hand-off Console ({mod.role})
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
            Curation Queue, Ingestion &amp; Governance
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <form action={syncSnapshotAction}>
            <SubmitButton
              pendingText="Syncing Snapshot…"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              className="border border-stone-900 bg-[#FBF9F4] px-4 py-2 font-mono-tabular text-xs font-semibold text-stone-900 uppercase hover:bg-stone-900 hover:text-[#F6F3EC]"
            >
              Sync Git / R2 Snapshot (seed/crawled-jobs.json)
            </SubmitButton>
          </form>

          <form action={triggerSourceRunAction}>
            <input type="hidden" name="sourceId" value="ALL" />
            <SubmitButton
              pendingText="Scanning ATS & Web…"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              className="border border-stone-900 bg-stone-900 px-4 py-2 font-mono-tabular text-xs font-semibold text-[#F6F3EC] uppercase hover:bg-stone-800"
            >
              Run Live ATS &amp; Web Scraper
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* 0. Live Web & Noticeboard Discovery Engine */}
      <AdminWebSearch />

      {/* 1. Pending Job Submissions / Scraped Queue */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-base font-bold text-stone-900">
          Pending Job Submissions ({pendingJobs.length})
        </h2>
        <p className="text-xs text-stone-500">
          Approve roles submitted by cohort members or ingested from unverified
          sources.
        </p>

        {pendingJobs.length === 0 ? (
          <p className="mt-4 rounded-xl bg-stone-50 p-4 text-xs text-stone-600">
            All caught up — no pending jobs awaiting moderation.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingJobs.map((j) => (
              <div
                key={j.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-xs font-semibold text-stone-500">
                    {j.orgName} · {j.location} · {j.type} ({j.experience})
                  </div>
                  <div className="text-sm font-bold text-stone-900">
                    {j.title}
                  </div>
                  {j.description && (
                    <p className="mt-1 line-clamp-2 max-w-2xl text-xs text-stone-600">
                      {j.description}
                    </p>
                  )}
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline"
                  >
                    Verify link: {j.url.slice(0, 60)}…
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <form action={reviewJobAction}>
                    <input type="hidden" name="jobId" value={j.id} />
                    <input type="hidden" name="decision" value="published" />
                    <SubmitButton
                      pendingText="Publishing…"
                      icon={<Check className="h-3.5 w-3.5" />}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Publish
                    </SubmitButton>
                  </form>
                  <form action={reviewJobAction}>
                    <input type="hidden" name="jobId" value={j.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <SubmitButton
                      pendingText="Rejecting…"
                      icon={<X className="h-3.5 w-3.5" />}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Reject
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Page-Change Monitor Alerts */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <h2 className="text-base font-bold text-stone-900">
            Careers Page Change Alerts ({openChanges.length})
          </h2>
        </div>
        <p className="text-xs text-stone-500">
          When an Indian think tank without an ATS API (e.g. PRS, CEEW, J-PAL)
          updates its careers page, new lines appear here so a moderator can
          post the opening in one click.
        </p>

        {openChanges.length === 0 ? (
          <p className="mt-4 rounded-xl bg-stone-50 p-4 text-xs text-stone-600">
            No unresolved careers-page diffs right now.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {openChanges.map(({ change, org, source }) => (
              <div
                key={change.id}
                className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-stone-900">
                    {org.name} — new text detected on careers page
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={String(source.config?.url ?? org.careersUrl ?? "#")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-stone-900 underline"
                    >
                      Open careers page <ExternalLink className="h-3 w-3" />
                    </a>
                    <Link
                      href="/submit"
                      className="rounded-lg bg-stone-900 px-2.5 py-1 font-semibold text-white"
                    >
                      + Post role
                    </Link>
                    <form action={resolvePageChangeAction}>
                      <input type="hidden" name="id" value={change.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <SubmitButton
                        pendingText="Resolving…"
                        className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700"
                      >
                        Mark resolved
                      </SubmitButton>
                    </form>
                  </div>
                </div>
                <pre className="mt-2 max-h-36 overflow-auto rounded-lg bg-white p-2.5 font-mono text-[11px] whitespace-pre-wrap text-stone-700">
                  {change.addedText}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Live API Ingestion Adapters */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-base font-bold text-stone-900">
          Configured Source Adapters ({sources.length} total ·{" "}
          {apiSources.length} direct ATS APIs)
        </h2>
        <p className="text-xs text-stone-500">
          Direct ATS feeds (Ashby, Greenhouse, Lever, SmartRecruiters, Workday)
          plus page-watch monitors.
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {sources.slice(0, 18).map(({ source: s, org }) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-stone-200 p-3 text-xs"
            >
              <div className="min-w-0 pr-2">
                <div className="truncate font-semibold text-stone-900">
                  {org.name}
                </div>
                <div className="text-[11px] text-stone-500">
                  type: <code className="font-mono">{s.type}</code> · status:{" "}
                  <span className="font-medium">{s.lastStatus ?? "ready"}</span>
                </div>
              </div>
              <form action={triggerSourceRunAction}>
                <input type="hidden" name="sourceId" value={s.id} />
                <SubmitButton
                  pendingText="Running…"
                  className="rounded-lg border border-stone-300 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-800 hover:bg-stone-900 hover:text-white"
                >
                  Run
                </SubmitButton>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Batch Hand-off & Role Governance */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-700" />
          <h2 className="text-base font-bold text-stone-900">
            Cohort Roles &amp; Annual Batch Hand-off ({users.length} members)
          </h2>
        </div>
        <p className="text-xs text-stone-500">
          The permanent owner can promote incoming student leads to{" "}
          <code>moderator</code> each year and transition graduating students to{" "}
          <code>alumni</code>. Every change is recorded in the audit log below.
        </p>

        <div className="mt-4 divide-y divide-stone-100 rounded-xl border border-stone-200">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
            >
              <div>
                <span className="font-semibold text-stone-900">{u.name}</span>{" "}
                <span className="text-stone-500">({u.email})</span>
                {u.batch && (
                  <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600">
                    {u.batch}
                  </span>
                )}
              </div>

              {isOwner ? (
                <form
                  action={changeUserRoleAction}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <select
                    name="role"
                    defaultValue={u.role}
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <SubmitButton
                    pendingText="Updating…"
                    className="rounded-lg bg-stone-900 px-3 py-1 font-semibold text-white hover:bg-stone-800"
                  >
                    Update role
                  </SubmitButton>
                </form>
              ) : (
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                  {u.role}
                </span>
              )}
            </div>
          ))}
        </div>

        {auditLogs.length > 0 && (
          <div className="mt-4 text-[11px] text-stone-500">
            <div className="font-semibold text-stone-700">
              Recent Role Hand-off Audit Log:
            </div>
            <ul className="mt-1 space-y-0.5">
              {auditLogs.map((l) => (
                <li key={l.id}>
                  • {new Date(l.createdAt).toLocaleString("en-IN")}: user{" "}
                  <code>{l.targetUserId}</code> changed from{" "}
                  <strong>{l.fromRole}</strong> → <strong>{l.toRole}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
