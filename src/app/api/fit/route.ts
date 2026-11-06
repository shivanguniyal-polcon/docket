import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { getAIProvider, hashProfile } from "@/lib/ai";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const user = await getUser();

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string;
    force?: boolean;
    anonymousProfile?: {
      name?: string;
      headline?: string | null;
      sectors?: string[];
      skills?: string[];
      interests?: string | null;
      experienceLevel?: string | null;
      resumeText?: string | null;
    };
  };

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const [jobRow] = await db
    .select()
    .from(schema.job)
    .where(eq(schema.job.id, body.jobId))
    .limit(1);

  if (!jobRow) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // 1. Authenticated User Flow: load user profile & use DB caching
  if (user) {
    const [profileRow] = await db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, user.id))
      .limit(1);

    const profileInput = {
      headline: profileRow?.headline ?? body.anonymousProfile?.headline ?? null,
      sectors: profileRow?.sectors ?? body.anonymousProfile?.sectors ?? [],
      skills: profileRow?.skills ?? body.anonymousProfile?.skills ?? [],
      interests: profileRow?.interests ?? body.anonymousProfile?.interests ?? null,
      experienceLevel:
        profileRow?.experienceLevel ??
        body.anonymousProfile?.experienceLevel ??
        null,
      resumeText:
        profileRow?.resumeText ?? body.anonymousProfile?.resumeText ?? null,
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

  // 2. Unauthenticated / Anonymous Flow: evaluate instantly without requiring login
  const profileInput = {
    headline:
      body.anonymousProfile?.headline ??
      "Master of Public Policy (MPP) Candidate at IIT Delhi",
    sectors: body.anonymousProfile?.sectors ?? [],
    skills:
      body.anonymousProfile?.skills ?? [
        "qualitative research",
        "quantitative research",
        "policy brief",
      ],
    interests: body.anonymousProfile?.interests ?? null,
    experienceLevel: body.anonymousProfile?.experienceLevel ?? "0-2",
    resumeText: body.anonymousProfile?.resumeText ?? null,
  };
  const pHash = hashProfile(profileInput);

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

  return NextResponse.json({
    userId: null,
    jobId: jobRow.id,
    ...result,
    profileHash: pHash,
  });
}
