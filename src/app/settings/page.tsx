import {
  Mail,
  FileText,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { EXPERIENCE, SECTORS } from "@/lib/taxonomy";
import {
  addPersonalEmailAction,
  deleteAccountAction,
  deleteResumeAction,
  removePersonalEmailAction,
  updateProfileAction,
  uploadResumeAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/loading-button";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    verificationSent?: string;
    emailVerified?: string;
    emailError?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [[profile], emails] = await Promise.all([
    db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, user.id))
      .limit(1),
    db
      .select()
      .from(schema.userEmail)
      .where(eq(schema.userEmail.userId, user.id)),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Profile, Private Resume &amp; Dual-Email Settings
        </h1>
        <p className="text-xs text-stone-600">
          Configure your backup login email for post-graduation continuity,
          manage your private CV for AI fit scoring, and control alumni
          directory visibility.
        </p>
      </div>

      {params.verificationSent && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Verification link sent! Check your personal inbox (or the dev console
          on the Sign-In page) and click the link to activate backup login.
        </div>
      )}
      {params.emailVerified && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          Personal backup email verified! You can now sign in with either your
          @iitd.ac.in address or your personal email.
        </div>
      )}
      {params.emailError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          Could not verify email ({params.emailError}). Please request a fresh
          link below.
        </div>
      )}

      {/* 1. Dual-Email Login Management */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Mail className="h-4 w-4 text-amber-700" />
          Dual-Email Access (IIT Delhi + Personal Backup)
        </div>
        <p className="mt-1 text-xs text-stone-600">
          Your <code className="font-mono">@iitd.ac.in</code> address proves
          cohort membership. Adding a verified personal email ensures you keep
          full access as an alum after your institute email expires.
        </p>

        <div className="mt-4 divide-y divide-stone-100 rounded-xl border border-stone-200">
          {emails.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between px-4 py-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-stone-900">{e.email}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                  {e.kind === "iitd" ? "Primary IITD" : "Personal Backup"}
                </span>
              </div>
              {e.kind === "personal" && (
                <form action={removePersonalEmailAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <SubmitButton
                    pendingText=""
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    className="text-stone-400 hover:text-rose-600"
                    title="Remove backup email"
                  />
                </form>
              )}
            </div>
          ))}
        </div>

        <form
          action={addPersonalEmailAction}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="Add personal email (e.g. name@gmail.com)"
            className="flex-1 rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
          <SubmitButton
            pendingText="Sending link…"
            className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Send verification link
          </SubmitButton>
        </form>
      </section>

      {/* 2. Private Resume Upload for AI Fit */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <FileText className="h-4 w-4 text-amber-700" />
            Private Resume / CV for AI Fit Scoring
          </div>
          {profile?.resumeFileName && (
            <form action={deleteResumeAction}>
              <SubmitButton
                pendingText="Deleting CV text…"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
              >
                Delete stored CV text
              </SubmitButton>
            </form>
          )}
        </div>
        <p className="mt-1 text-xs text-stone-600">
          Upload a PDF or paste your CV text. Only extracted plain text is kept
          (the raw PDF file is discarded immediately), and it is never visible
          to other students or moderators.
        </p>

        {profile?.resumeText && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900">
            <div className="font-semibold">
              Active CV: {profile.resumeFileName ?? "Uploaded resume"} (
              {profile.resumeText.length.toLocaleString()} chars extracted)
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] text-emerald-800">
              {profile.resumeText.slice(0, 260)}…
            </p>
          </div>
        )}

        <form action={uploadResumeAction} className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700">
              Upload Resume PDF (.pdf or .txt)
            </label>
            <input
              type="file"
              name="resume"
              accept=".pdf,.txt"
              className="mt-1 block w-full text-xs text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700">
              Or paste / edit extracted CV text directly
            </label>
            <textarea
              name="resumeText"
              rows={4}
              defaultValue={profile?.resumeText ?? ""}
              placeholder="Paste your education, internships, research projects, skills (Stata, R, Python, policy briefs)…"
              className="mt-1 w-full rounded-xl border border-stone-300 p-3 text-xs"
            />
          </div>

          <SubmitButton
            pendingText="Saving CV…"
            className="rounded-xl bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-800"
          >
            Save Private CV
          </SubmitButton>
        </form>
      </section>

      {/* 3. Profile, Sectors, Skills & Alumni Directory Opt-in */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <UserCheck className="h-4 w-4 text-amber-700" />
          Profile, Target Sectors &amp; Alumni Directory
        </div>

        <form action={updateProfileAction} className="mt-4 space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-semibold text-stone-700">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={user.name}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700">
                Batch (e.g. MPP 2025–27)
              </label>
              <input
                type="text"
                name="batch"
                defaultValue={user.batch ?? "MPP 2025–27"}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700">
                Experience Band
              </label>
              <select
                name="experienceLevel"
                defaultValue={profile?.experienceLevel ?? "0-2"}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
              >
                {Object.entries(EXPERIENCE).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700">
              Headline
            </label>
            <input
              type="text"
              name="headline"
              defaultValue={profile?.headline ?? ""}
              placeholder="e.g. MPP Candidate at IIT Delhi · Interested in AI Governance & Climate Finance"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700">
              Skills &amp; Methods (comma-separated)
            </label>
            <input
              type="text"
              name="skills"
              defaultValue={(profile?.skills ?? []).join(", ")}
              placeholder="Stata, R, Python, Impact Evaluation, Legislative Research, Budget Analysis"
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700">
              Target Policy Sectors
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {Object.entries(SECTORS).map(([k, v]) => (
                <label
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1"
                >
                  <input
                    type="checkbox"
                    name="sectors"
                    value={k}
                    defaultChecked={(profile?.sectors ?? []).includes(k)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4">
            <div className="font-semibold text-stone-900">
              Cohort &amp; Alumni Directory (Optional)
            </div>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-stone-700">
                <input
                  type="checkbox"
                  name="alumniOptIn"
                  defaultChecked={profile?.alumniOptIn ?? false}
                />
                List me in the Cohort &amp; Alumni Directory
              </label>
              <label className="flex items-center gap-2 text-stone-700">
                <input
                  type="checkbox"
                  name="openToReferrals"
                  defaultChecked={profile?.openToReferrals ?? false}
                />
                Allow cohort members to send me referral / coffee-chat requests
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <input
                type="text"
                name="currentOrg"
                defaultValue={profile?.currentOrg ?? ""}
                placeholder="Current / Past Org (e.g. CEEW)"
                className="rounded-xl border border-stone-300 px-3 py-2"
              />
              <input
                type="text"
                name="currentRole"
                defaultValue={profile?.currentRole ?? ""}
                placeholder="Role (e.g. Programme Associate)"
                className="rounded-xl border border-stone-300 px-3 py-2"
              />
              <input
                type="number"
                name="gradYear"
                defaultValue={profile?.gradYear ?? 2027}
                placeholder="Grad Year (e.g. 2027)"
                className="rounded-xl border border-stone-300 px-3 py-2"
              />
              <input
                type="url"
                name="linkedinUrl"
                defaultValue={profile?.linkedinUrl ?? ""}
                placeholder="LinkedIn URL"
                className="rounded-xl border border-stone-300 px-3 py-2"
              />
            </div>
          </div>

          <div className="border-t border-stone-200 pt-4">
            <div className="font-semibold text-stone-900">
              Email Notifications
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-stone-700">
                <input
                  type="checkbox"
                  name="emailReminders"
                  defaultChecked={profile?.emailReminders ?? true}
                />
                7-day and 1-day deadline reminders
              </label>
              <label className="flex items-center gap-2 text-stone-700">
                <input
                  type="checkbox"
                  name="weeklyDigest"
                  defaultChecked={profile?.weeklyDigest ?? true}
                />
                Weekly cohort digest
              </label>
            </div>
          </div>

          <SubmitButton
            pendingText="Saving Profile…"
            className="rounded-xl bg-stone-900 px-5 py-2.5 font-semibold text-white hover:bg-stone-800"
          >
            Save Profile &amp; Preferences
          </SubmitButton>
        </form>
      </section>

      {/* 4. DPDP Privacy & Account Deletion */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <ShieldAlert className="h-4 w-4" />
              Delete Account &amp; Personal Data
            </div>
            <p className="mt-1 text-rose-800">
              Permanently deletes your account, tracked applications, and
              stored resume text immediately.
            </p>
          </div>
          <form action={deleteAccountAction}>
            <SubmitButton
              pendingText="Deleting account…"
              className="shrink-0 rounded-xl border border-rose-300 bg-white px-3.5 py-2 font-semibold text-rose-700 hover:bg-rose-100"
            >
              Delete my account
            </SubmitButton>
          </form>
        </div>
      </section>
    </div>
  );
}
