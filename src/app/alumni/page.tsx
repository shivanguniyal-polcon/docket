import Link from "next/link";
import { Users, Send, ExternalLink, Briefcase, FileText, BookOpen } from "lucide-react";
import { getUser } from "@/lib/session";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { SECTORS, type Sector } from "@/lib/taxonomy";
import { requestReferralAction } from "@/app/actions";
import { SubmitButton } from "@/components/loading-button";

export default async function AlumniPage() {
  const user = await getUser();

  const rows = await db
    .select({
      user: schema.user,
      profile: schema.profile,
    })
    .from(schema.profile)
    .innerJoin(schema.user, eq(schema.user.id, schema.profile.userId))
    .where(eq(schema.profile.alumniOptIn, true));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-stone-900 pb-4">
        <div>
          <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
            § 01 · TALENT ROSTER &amp; PROOF-OF-WORK
          </div>
          <h1 className="font-serif-editorial mt-1 text-3xl font-normal text-stone-950">
            Cohort Proof-of-Work &amp; Alumni Directory ({rows.length})
          </h1>
          <p className="mt-1 text-xs text-stone-600">
            Opt-in directory of IIT Delhi MPP candidates, seniors &amp; fellows with verified policy spikes, work samples, and coffee-chat availability.
          </p>
        </div>

        <Link
          href="/settings"
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
        >
          Opt in / Update my directory card &amp; work sample →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <Users className="mx-auto h-6 w-6 text-stone-400" />
          <p className="mt-2 text-sm font-medium text-stone-800">
            No members have opted into the directory yet.
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Enable &ldquo;List me in the Cohort &amp; Alumni Directory&rdquo; in
            Settings to appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ user: member, profile }) => (
            <div
              key={member.id}
              className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                    {member.batch ??
                      (profile.gradYear
                        ? `Class of ${profile.gradYear}`
                        : "IITD MPP")}
                  </span>
                  {profile.openToReferrals && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Open to coffee chats
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    {member.name}
                  </h2>
                  {(profile.currentRole || profile.currentOrg) && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-stone-700">
                      <Briefcase className="h-3.5 w-3.5 text-stone-400" />
                      {[profile.currentRole, profile.currentOrg]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>

                {profile.headline && (
                  <p className="text-xs leading-relaxed text-stone-600">
                    {profile.headline}
                  </p>
                )}

                {/* Core Policy Spike */}
                {profile.coreSpike ? (
                  <div className="rounded-lg border border-amber-900/30 bg-amber-50/70 p-2 text-xs">
                    <span className="font-mono-tabular text-[10px] font-bold text-amber-950 uppercase">
                      Core Policy Spike:
                    </span>
                    <div className="font-semibold text-stone-900 mt-0.5">
                      {profile.coreSpike}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-500">
                    <span className="font-mono-tabular text-[10px] font-bold uppercase text-stone-400">
                      Core Policy Spike:
                    </span>{" "}
                    <span className="italic">Currently under construction</span>
                  </div>
                )}

                {/* Verified Work Sample / Policy Brief */}
                {profile.workSampleUrl ? (
                  <div className="rounded-lg border border-emerald-900/30 bg-emerald-50/60 p-2 text-xs">
                    <span className="font-mono-tabular text-[10px] font-bold text-emerald-950 uppercase">
                      Verified Work Sample / Brief:
                    </span>
                    <a
                      href={profile.workSampleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 font-semibold text-emerald-950 underline hover:text-emerald-800"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">
                        {profile.workSampleTitle || "View 2-Page Policy Brief"}
                      </span>
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-500">
                    <span className="font-mono-tabular text-[10px] font-bold uppercase text-stone-400">
                      Work Sample / Brief:
                    </span>{" "}
                    <span className="italic">Currently under construction</span>
                  </div>
                )}

                {/* Capstone Focus */}
                {profile.capstoneTopic ? (
                  <div className="text-[11px] text-stone-700">
                    <strong>Capstone:</strong> {profile.capstoneTopic}
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 italic">
                    Capstone: Currently under construction
                  </div>
                )}

                <div className="flex flex-wrap gap-1 pt-1">
                  {profile.sectors.map((s) => (
                    <span
                      key={s}
                      className="rounded border border-stone-200 px-1.5 py-0.5 text-[10px] text-stone-600"
                    >
                      {SECTORS[s as Sector] ?? s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-stone-100 pt-3">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:underline"
                  >
                    LinkedIn Profile <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {profile.openToReferrals && member.id !== user?.id && (
                  user ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer rounded-xl bg-stone-900 px-3 py-1.5 text-center font-semibold text-white hover:bg-stone-800">
                        Request coffee chat / referral
                      </summary>
                      <form
                        action={requestReferralAction}
                        className="mt-2 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3"
                      >
                        <input
                          type="hidden"
                          name="toUserId"
                          value={member.id}
                        />
                        <textarea
                          name="message"
                          required
                          rows={3}
                          placeholder={`Hi ${member.name.split(" ")[0]}, I'm in the IITD MPP cohort applying to ${profile.currentOrg ?? "your team"}…`}
                          className="w-full rounded-lg border border-stone-300 bg-white p-2 text-xs"
                        />
                        <SubmitButton
                          pendingText="Sending…"
                          icon={<Send className="h-3 w-3" />}
                          className="w-full rounded-lg bg-stone-900 py-1.5 text-xs font-semibold text-white"
                        >
                          Send email via Docket
                        </SubmitButton>
                      </form>
                    </details>
                  ) : (
                    <Link
                      href="/sign-in?next=/alumni"
                      prefetch={false}
                      className="block rounded-xl border border-stone-900 bg-stone-900 px-3 py-1.5 text-center text-xs font-semibold text-[#F6F3EC] hover:bg-stone-800"
                    >
                      Sign in to request coffee chat →
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* § 02 · Cohort Capstone & Policy Brief Vault */}
      <div className="border-2 border-stone-900 bg-[#FBF9F4] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-900 pb-3">
          <div>
            <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
              § 02 · RECRUITER TALENT VAULT
            </div>
            <h2 className="font-serif-editorial text-xl font-normal text-stone-950">
              Cohort Capstone &amp; Published Policy Briefs
            </h2>
          </div>
          <span className="border border-stone-400 bg-white px-2 py-0.5 font-mono-tabular text-[10px] text-stone-600">
            CLASS OF 2026–27
          </span>
        </div>
        <p className="mt-2 text-xs text-stone-600 leading-relaxed max-w-2xl">
          Searchable repository of 2-page executive briefs, dataset pipelines (PLFS, NFHS, UDISE+), and SERC regulatory consultation comments drafted by IIT Delhi MPP students.
        </p>
        <div className="mt-4 border border-dashed border-stone-300 bg-white p-6 text-center text-xs text-stone-500">
          <BookOpen className="mx-auto h-5 w-5 text-stone-400" />
          <div className="mt-2 font-mono-tabular font-bold text-stone-800 uppercase">
            Currently under construction
          </div>
          <p className="mt-1 text-[11px] text-stone-600">
            Incoming student capstone memos and faculty-cleared briefs are undergoing departmental review and will appear here. No synthetic placeholders are generated.
          </p>
        </div>
      </div>
    </div>
  );
}
