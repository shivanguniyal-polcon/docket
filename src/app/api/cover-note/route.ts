import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/session";
import { draftCoverNote, type OutreachFormat } from "@/lib/ai";
import { db, schema } from "@/db";

export async function POST(request: NextRequest) {
  const user = await getUser();

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string;
    outreachType?: OutreachFormat;
    anonymousProfile?: {
      name?: string;
      batch?: string;
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

  const outreachType: OutreachFormat = body.outreachType || "email";

  if (user) {
    const [profileRow] = await db
      .select()
      .from(schema.profile)
      .where(eq(schema.profile.userId, user.id))
      .limit(1);

    const draft = await draftCoverNote(
      user.name,
      (user as { batch?: string | null }).batch ?? null,
      {
        profile: {
          headline:
            profileRow?.headline ?? body.anonymousProfile?.headline ?? null,
          sectors:
            profileRow?.sectors ?? body.anonymousProfile?.sectors ?? [],
          skills: profileRow?.skills ?? body.anonymousProfile?.skills ?? [],
          interests:
            profileRow?.interests ?? body.anonymousProfile?.interests ?? null,
          experienceLevel:
            profileRow?.experienceLevel ??
            body.anonymousProfile?.experienceLevel ??
            null,
          resumeText:
            profileRow?.resumeText ?? body.anonymousProfile?.resumeText ?? null,
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
      outreachType,
    );

    return NextResponse.json(draft);
  }

  // Anonymous user
  const candidateName =
    body.anonymousProfile?.name?.trim() || "IIT Delhi MPP Candidate";
  const candidateBatch = body.anonymousProfile?.batch?.trim() || "IIT Delhi MPP";

  const draft = await draftCoverNote(
    candidateName,
    candidateBatch,
    {
      profile: {
        headline:
          body.anonymousProfile?.headline ??
          "Master of Public Policy (MPP) Candidate at IIT Delhi",
        sectors: body.anonymousProfile?.sectors ?? [],
        skills: body.anonymousProfile?.skills ?? [
          "qualitative research",
          "quantitative research",
          "policy brief",
        ],
        interests: body.anonymousProfile?.interests ?? null,
        experienceLevel: body.anonymousProfile?.experienceLevel ?? "0-2",
        resumeText: body.anonymousProfile?.resumeText ?? null,
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
    outreachType,
  );

  return NextResponse.json(draft);
}
