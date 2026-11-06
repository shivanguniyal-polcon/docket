import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { getAIProvider, hashProfile } from "@/lib/ai";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string;
    force?: boolean;
  };
  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const [[jobRow], [profileRow]] = await Promise.all([
    db
      .select()
      .from(schema.job)
      .where(eq(schema.job.id, body.jobId))
      .limit(1),
    db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, user.id))
      .limit(1),
  ]);

  if (!jobRow) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const profileInput = {
    headline: profileRow?.headline ?? null,
    sectors: profileRow?.sectors ?? [],
    skills: profileRow?.skills ?? [],
    interests: profileRow?.interests ?? null,
    experienceLevel: profileRow?.experienceLevel ?? null,
    resumeText: profileRow?.resumeText ?? null,
  };
  const pHash = hashProfile(profileInput);

  if (!body.force) {
    const [cached] = await db
      .select()
      .from(schema.fitScore)
      .where(
        and(
          eq(schema.fitScore.userId, user.id),
          eq(schema.fitScore.jobId, jobRow.id),
        ),
      )
      .limit(1);

    if (cached && cached.profileHash === pHash) {
      return NextResponse.json(cached);
    }
  }

  const provider = getAIProvider();
  const result = await provider.scoreFit({
    profile: profileInput,
    job: {
      title: jobRow.title,
      orgName: jobRow.orgName,
      type: jobRow.type,
      experience: jobRow.experience,
      location: jobRow.location,
      sectors: jobRow.sectors,
      description: jobRow.description,
    },
  });

  await db
    .insert(schema.fitScore)
    .values({
      userId: user.id,
      jobId: jobRow.id,
      score: result.score,
      summary: result.summary,
      strengths: result.strengths,
      gaps: result.gaps,
      provider: result.provider,
      profileHash: pHash,
    })
    .onConflictDoUpdate({
      target: [schema.fitScore.userId, schema.fitScore.jobId],
      set: {
        score: result.score,
        summary: result.summary,
        strengths: result.strengths,
        gaps: result.gaps,
        provider: result.provider,
        profileHash: pHash,
        createdAt: new Date(),
      },
    });

  return NextResponse.json({
    userId: user.id,
    jobId: jobRow.id,
    ...result,
    profileHash: pHash,
  });
}
