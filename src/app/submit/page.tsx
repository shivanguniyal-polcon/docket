import { getUser, isModerator } from "@/lib/session";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { SubmitJobForm } from "@/components/submit-job-form";

export default async function SubmitJobPage() {
  const user = await getUser();
  const orgs = await db
    .select({ id: schema.organization.id, name: schema.organization.name })
    .from(schema.organization)
    .orderBy(asc(schema.organization.name));

  const autoPublish = Boolean(user && isModerator(user.role));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Post an Opening / Share a Mandate with IITD MPP
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          Open to recruiters, partners, faculty, alumni, and cohort members. Paste an official job link or draft details below to alert the batch.
        </p>
      </div>

      {!user && (
        <div className="border border-stone-900 bg-[#F6F3EC] p-4 text-xs">
          <div className="flex items-center justify-between border-b border-stone-300 pb-2">
            <span className="font-mono-tabular font-bold text-amber-900 uppercase">
              Recruiter &amp; Institutional Partner Fast-Track · Zero Login Required
            </span>
            <span className="font-mono-tabular text-[10px] text-stone-600">
              30-Second Mandate Drop
            </span>
          </div>
          <p className="mt-2 text-stone-800 leading-relaxed">
            Hiring for a research grant, client project, fellowship, or lateral advisory role? Drop your link or raw requirements below. Submissions are reviewed by cohort moderators and alerted directly to eligible candidates within hours.
          </p>
        </div>
      )}

      <SubmitJobForm orgs={orgs} autoPublish={autoPublish} />
    </div>
  );
}
