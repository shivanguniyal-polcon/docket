import Link from "next/link";
import { Users, Send, ExternalLink, Briefcase } from "lucide-react";
import { getUser } from "@/lib/session";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { SECTORS, type Sector } from "@/lib/taxonomy";
import { requestReferralAction } from "@/app/actions";

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Cohort &amp; Alumni Directory ({rows.length})
          </h1>
          <p className="text-xs text-stone-600">
            Opt-in directory of IIT Delhi MPP seniors, alumni &amp; fellows open
            to coffee chats and referral requests.
          </p>
        </div>

        <Link
          href="/settings"
          className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
        >
          Opt in / Update my directory card →
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
              className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700">
                    {member.batch ??
                      (profile.gradYear
                        ? `Class of ${profile.gradYear}`
                        : "IITD MPP")}
                  </span>
                  {profile.openToReferrals && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Open to referrals
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
                  <details className="text-xs">
                    <summary className="cursor-pointer rounded-xl bg-stone-900 px-3 py-1.5 text-center font-semibold text-white hover:bg-stone-800">
                      Request referral / coffee chat
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
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-stone-900 py-1.5 text-xs font-semibold text-white"
                      >
                        <Send className="h-3 w-3" />
                        Send email via Docket
                      </button>
                    </form>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
