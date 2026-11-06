import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/session";
import { draftCoverNote } from "@/lib/ai";
import { db, schema } from "@/db";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const [[jobRow], [profileRow]] = await Promise.all([
    db.select().from(schema.job).where(eq(schema.job.id, body.jobId)).limit(1),
    db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, user.id))
      .limit(1),
  ]);

  if (!jobRow) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const draft = await draftCoverNote(
    user.name,
    (user as { batch?: string | null }).batch ?? null,
    {
      profile: {
        headline: profileRow?.headline ?? null,
        sectors: profileRow?.sectors ?? [],
        skills: profileRow?.skills ?? [],
        interests: profileRow?.interests ?? null,
        experienceLevel: profileRow?.experienceLevel ?? null,
        resumeText: profileRow?.resumeText ?? null,
      },
      job: {
        title: jobRow.title,
        orgName: jobRow.orgName,
        type: jobRow.type,
        experience: jobRow.experience,
        location: jobRow.location,
        sectors: jobRow.sectors,
        description: jobRow.description,
      },
    },
  );

  return NextResponse.json(draft);
}
