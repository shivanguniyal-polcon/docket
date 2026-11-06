import { requireUser, isModerator } from "@/lib/session";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { SubmitJobForm } from "@/components/submit-job-form";

export default async function SubmitJobPage() {
  const user = await requireUser();
  const orgs = await db
    .select({ id: schema.organization.id, name: schema.organization.name })
    .from(schema.organization)
    .orderBy(asc(schema.organization.name));

  const autoPublish = isModerator(user.role);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          Submit a Policy Opening (with Live JD Extraction)
        </h1>
        <p className="text-xs text-stone-600">
          Paste any official job link below and click{" "}
          <strong>Extract Actual JD from URL</strong> to pull the real title,
          requirements, and tags directly from the employer&apos;s page.
        </p>
      </div>

      <SubmitJobForm orgs={orgs} autoPublish={autoPublish} />
    </div>
  );
}
