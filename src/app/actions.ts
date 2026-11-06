"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  requireUser,
  requireModerator,
  requireOwner,
  isModerator,
} from "@/lib/session";
import {
  classifyExperience,
  classifyJobType,
  classifyLocationType,
  classifySectors,
  makeFingerprint,
} from "@/lib/classify";
import { sendEmail, emailLayout, button } from "@/lib/email";
import { runSourceById, runAllEnabledSources } from "@/lib/ingest";
import { syncSnapshotToDatabase } from "@/lib/snapshot-sync";
import { extractJobFromUrl } from "@/lib/extract-jd";
import { APPLICATION_STATUSES, ROLES, type Role } from "@/lib/taxonomy";

/* -------------------------------------------------------------------------- */
/*                            Application tracker                             */
/* -------------------------------------------------------------------------- */

export async function trackJobAction(formData: FormData) {
  const user = await requireUser();
  const jobId = String(formData.get("jobId") ?? "").trim();
  const initialStatus = String(formData.get("status") ?? "saved");
  const status = (APPLICATION_STATUSES as readonly string[]).includes(
    initialStatus,
  )
    ? initialStatus
    : "saved";

  if (!jobId) return;

  const [existing] = await db
    .select()
    .from(schema.application)
    .where(
      and(
        eq(schema.application.userId, user.id),
        eq(schema.application.jobId, jobId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.application)
      .set({
        status,
        appliedAt:
          status === "applied" && !existing.appliedAt
            ? new Date().toISOString().slice(0, 10)
            : existing.appliedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.application.id, existing.id));
  } else {
    const [j] = await db
      .select()
      .from(schema.job)
      .where(eq(schema.job.id, jobId))
      .limit(1);
    if (!j) return;

    await db.insert(schema.application).values({
      userId: user.id,
      jobId: j.id,
      orgId: j.orgId,
      title: j.title,
      orgName: j.orgName,
      url: j.url,
      type: j.type,
      status,
      deadline: j.deadline,
      appliedAt:
        status === "applied" ? new Date().toISOString().slice(0, 10) : null,
    });
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/tracker");
  revalidatePath("/calendar");
}

export async function addCustomApplicationAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const orgName = String(formData.get("orgName") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "full_time");
  const status = String(formData.get("status") ?? "saved");
  const deadline = String(formData.get("deadline") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title || !orgName) return;

  const [org] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.name, orgName))
    .limit(1);

  await db.insert(schema.application).values({
    userId: user.id,
    orgId: org?.id ?? null,
    title,
    orgName,
    url,
    type,
    status: (APPLICATION_STATUSES as readonly string[]).includes(status)
      ? status
      : "saved",
    deadline,
    appliedAt:
      status === "applied" ? new Date().toISOString().slice(0, 10) : null,
    notes,
  });

  revalidatePath("/tracker");
  revalidatePath("/calendar");
}

export async function updateApplicationAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const deadline = String(formData.get("deadline") ?? "").trim() || null;
  const appliedAt = String(formData.get("appliedAt") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const contacts = String(formData.get("contacts") ?? "").trim() || null;
  const cvVersion = String(formData.get("cvVersion") ?? "").trim() || null;
  const writingSample =
    String(formData.get("writingSample") ?? "").trim() || null;
  const nextFollowUp =
    String(formData.get("nextFollowUp") ?? "").trim() || null;
  const shareOutcome = formData.get("shareOutcome") === "on";

  if (!id) return;

  await db
    .update(schema.application)
    .set({
      ...(status &&
      (APPLICATION_STATUSES as readonly string[]).includes(status)
        ? { status }
        : {}),
      deadline,
      appliedAt,
      notes,
      contacts,
      cvVersion,
      writingSample,
      nextFollowUp,
      shareOutcome,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.application.id, id),
        eq(schema.application.userId, user.id),
      ),
    );

  revalidatePath("/tracker");
  revalidatePath("/calendar");
  revalidatePath("/orgs");
}

export async function moveApplicationStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(APPLICATION_STATUSES as readonly string[]).includes(status))
    return;

  await db
    .update(schema.application)
    .set({
      status,
      ...(status === "applied"
        ? { appliedAt: new Date().toISOString().slice(0, 10) }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.application.id, id),
        eq(schema.application.userId, user.id),
      ),
    );

  revalidatePath("/tracker");
  revalidatePath("/orgs");
}

export async function deleteApplicationAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(schema.application)
    .where(
      and(
        eq(schema.application.id, id),
        eq(schema.application.userId, user.id),
      ),
    );

  revalidatePath("/tracker");
  revalidatePath("/calendar");
}

/* -------------------------------------------------------------------------- */
/*                           Job submission & review                          */
/* -------------------------------------------------------------------------- */

export async function submitJobAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const orgId = String(formData.get("orgId") ?? "").trim() || null;
  const customOrgName = String(formData.get("orgName") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim() || "India";
  const deadline = String(formData.get("deadline") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const explicitType = String(formData.get("type") ?? "").trim();
  const explicitExp = String(formData.get("experience") ?? "").trim();
  const selectedSectors = formData
    .getAll("sectors")
    .map((s) => String(s))
    .filter(Boolean);

  if (!title || !url) return;

  let orgName = customOrgName;
  let orgSectors: string[] = [];
  if (orgId) {
    const [org] = await db
      .select()
      .from(schema.organization)
      .where(eq(schema.organization.id, orgId))
      .limit(1);
    if (org) {
      orgName = org.name;
      orgSectors = org.sectors;
    }
  }
  if (!orgName) orgName = "Policy Organization";

  const fullText = `${title} ${description ?? ""}`;
  const sectors =
    selectedSectors.length > 0
      ? selectedSectors
      : classifySectors(fullText, orgSectors);
  const type = explicitType || classifyJobType(title, description ?? "");
  const experience =
    explicitExp || classifyExperience(title, description ?? "");
  const locationType = classifyLocationType(location, description ?? "");
  const fingerprint = makeFingerprint(orgName, title, url);
  const autoApprove = isModerator(user.role);

  await db
    .insert(schema.job)
    .values({
      orgId,
      orgName,
      fingerprint,
      title,
      url,
      location,
      locationType,
      type,
      experience,
      sectors,
      description,
      deadline,
      postedAt: new Date(),
      status: autoApprove ? "published" : "pending",
      submittedBy: user.id,
      reviewedBy: autoApprove ? user.id : null,
    })
    .onConflictDoNothing({ target: schema.job.fingerprint });

  revalidatePath("/jobs");
  revalidatePath("/admin");
  redirect(autoApprove ? "/jobs?submitted=published" : "/jobs?submitted=pending");
}

export async function flagNonPolicyJobAction(formData: FormData) {
  await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  await db
    .update(schema.job)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(schema.job.id, jobId));

  revalidatePath("/jobs");
  revalidatePath("/admin");
}

export async function reviewJobAction(formData: FormData) {
  const mod = await requireModerator();
  const jobId = String(formData.get("jobId") ?? "");
  const decision = String(formData.get("decision") ?? ""); // published | rejected | expired
  if (!jobId || !["published", "rejected", "expired"].includes(decision))
    return;

  await db
    .update(schema.job)
    .set({ status: decision, reviewedBy: mod.id, updatedAt: new Date() })
    .where(eq(schema.job.id, jobId));

  revalidatePath("/jobs");
  revalidatePath("/admin");
}

export async function resolvePageChangeAction(formData: FormData) {
  const mod = await requireModerator();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "resolved");
  if (!id) return;

  await db
    .update(schema.pageChange)
    .set({ status, resolvedBy: mod.id })
    .where(eq(schema.pageChange.id, id));

  revalidatePath("/admin");
}

export async function refreshJobJDAction(formData: FormData) {
  await requireUser();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;

  const [jobRow] = await db
    .select()
    .from(schema.job)
    .where(eq(schema.job.id, jobId))
    .limit(1);
  if (!jobRow) return;

  try {
    const extracted = await extractJobFromUrl(jobRow.url);
    if (extracted.description && extracted.description.length > 50) {
      await db
        .update(schema.job)
        .set({
          description: extracted.description,
          ...(extracted.deadline && !jobRow.deadline
            ? { deadline: extracted.deadline }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.job.id, jobId));
    }
  } catch (err) {
    console.warn("Could not live-extract JD:", err);
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}

export async function syncSnapshotAction() {
  await requireModerator();
  await syncSnapshotToDatabase();
  revalidatePath("/admin");
  revalidatePath("/jobs");
}

export async function triggerSourceRunAction(formData: FormData) {
  await requireModerator();
  const sourceId = String(formData.get("sourceId") ?? "");
  if (sourceId === "ALL") {
    await runAllEnabledSources(25);
  } else if (sourceId) {
    await runSourceById(sourceId);
  }
  revalidatePath("/admin");
  revalidatePath("/jobs");
}

/* -------------------------------------------------------------------------- */
/*                       Cohort knowledge: org notes & refs                   */
/* -------------------------------------------------------------------------- */

export async function addOrgNoteAction(formData: FormData) {
  const user = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const kind = String(formData.get("kind") ?? "tip");
  const roleTitle = String(formData.get("roleTitle") ?? "").trim() || null;
  const compensation =
    String(formData.get("compensation") ?? "").trim() || null;
  const assignmentTimeLimit =
    String(formData.get("assignmentTimeLimit") ?? "").trim() || null;
  const assignmentTools =
    String(formData.get("assignmentTools") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const anonymous = formData.get("anonymous") === "on";

  if (!orgId || !body) return;

  await db.insert(schema.orgNote).values({
    orgId,
    userId: user.id,
    batch: user.batch ?? "MPP Cohort",
    anonymous,
    kind,
    roleTitle,
    compensation,
    assignmentTimeLimit,
    assignmentTools,
    body,
  });

  revalidatePath(`/orgs/${orgSlug}`);
  revalidatePath("/orgs");
  revalidatePath("/jobs");
}

export async function deleteOrgNoteAction(formData: FormData) {
  const user = await requireUser();
  const noteId = String(formData.get("noteId") ?? "");
  const orgSlug = String(formData.get("orgSlug") ?? "");
  if (!noteId) return;

  const [note] = await db
    .select()
    .from(schema.orgNote)
    .where(eq(schema.orgNote.id, noteId))
    .limit(1);

  if (!note) return;
  if (note.userId !== user.id && !isModerator(user.role)) return;

  await db.delete(schema.orgNote).where(eq(schema.orgNote.id, noteId));
  revalidatePath(`/orgs/${orgSlug}`);
}

export async function requestReferralAction(formData: FormData) {
  const user = await requireUser();
  const toUserId = String(formData.get("toUserId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const jobId = String(formData.get("jobId") ?? "").trim() || null;

  if (!toUserId || !message || toUserId === user.id) return;

  const [target] = await db
    .select({ user: schema.user, profile: schema.profile })
    .from(schema.user)
    .leftJoin(schema.profile, eq(schema.profile.userId, schema.user.id))
    .where(eq(schema.user.id, toUserId))
    .limit(1);

  if (!target || !target.profile?.openToReferrals) return;

  await db.insert(schema.referralRequest).values({
    fromUserId: user.id,
    toUserId,
    jobId,
    message,
  });

  await sendEmail({
    to: target.user.email,
    subject: `Docket referral request from ${user.name} (${user.batch ?? "IITD MPP"})`,
    html: emailLayout(
      `Referral / chat request from ${user.name}`,
      `<p><strong>${user.name}</strong> (${user.email}${user.batch ? `, ${user.batch}` : ""}) reached out via the Docket Alumni Directory:</p>
       <blockquote style="border-left:3px solid #d6d3d1;padding-left:12px;color:#44403c">${message.replace(/</g, "&lt;")}</blockquote>
       <p>You can reply directly to <strong>${user.email}</strong>.</p>`,
    ),
  });

  revalidatePath("/alumni");
}

/* -------------------------------------------------------------------------- */
/*                     Profile, resume PDF, dual-email settings               */
/* -------------------------------------------------------------------------- */

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const batch = String(formData.get("batch") ?? "").trim() || null;
  const headline = String(formData.get("headline") ?? "").trim() || null;
  const experienceLevel =
    String(formData.get("experienceLevel") ?? "").trim() || null;
  const interests = String(formData.get("interests") ?? "").trim() || null;
  const skillsRaw = String(formData.get("skills") ?? "");
  const skills = skillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sectors = formData
    .getAll("sectors")
    .map((s) => String(s))
    .filter(Boolean);

  const alumniOptIn = formData.get("alumniOptIn") === "on";
  const openToReferrals = formData.get("openToReferrals") === "on";
  const currentOrg = String(formData.get("currentOrg") ?? "").trim() || null;
  const currentRole = String(formData.get("currentRole") ?? "").trim() || null;
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "").trim() || null;
  const gradYearRaw = String(formData.get("gradYear") ?? "").trim();
  const gradYear = gradYearRaw ? parseInt(gradYearRaw, 10) || null : null;
  const emailReminders = formData.get("emailReminders") === "on";
  const weeklyDigest = formData.get("weeklyDigest") === "on";

  if (name) {
    await db
      .update(schema.user)
      .set({ name, batch, updatedAt: new Date() })
      .where(eq(schema.user.id, user.id));
  }

  await db
    .insert(schema.profile)
    .values({
      userId: user.id,
      headline,
      sectors,
      skills,
      interests,
      experienceLevel,
      alumniOptIn,
      openToReferrals,
      currentOrg,
      currentRole,
      linkedinUrl,
      gradYear,
      emailReminders,
      weeklyDigest,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.profile.userId,
      set: {
        headline,
        sectors,
        skills,
        interests,
        experienceLevel,
        alumniOptIn,
        openToReferrals,
        currentOrg,
        currentRole,
        linkedinUrl,
        gradYear,
        emailReminders,
        weeklyDigest,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  revalidatePath("/alumni");
  revalidatePath("/jobs");
}

export async function uploadResumeAction(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("resume") as File | null;
  const pastedText = String(formData.get("resumeText") ?? "").trim();

  let extracted = pastedText;
  let fileName = "Pasted CV text";

  if (file && file.size > 0) {
    fileName = file.name;
    const buf = new Uint8Array(await file.arrayBuffer());
    if (file.name.toLowerCase().endsWith(".pdf")) {
      try {
        const { extractText } = await import("unpdf");
        const res = await extractText(buf, { mergePages: true });
        extracted = Array.isArray(res.text)
          ? res.text.join("\n")
          : String(res.text ?? "");
      } catch (err) {
        console.warn("PDF parse fallback:", err);
      }
    } else {
      extracted = new TextDecoder().decode(buf);
    }
  }

  extracted = extracted.replace(/\s+/g, " ").trim().slice(0, 15_000);
  if (!extracted) return;

  await db
    .insert(schema.profile)
    .values({
      userId: user.id,
      resumeText: extracted,
      resumeFileName: fileName,
      resumeUpdatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.profile.userId,
      set: {
        resumeText: extracted,
        resumeFileName: fileName,
        resumeUpdatedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  revalidatePath("/jobs");
}

export async function deleteResumeAction() {
  const user = await requireUser();
  await db
    .update(schema.profile)
    .set({
      resumeText: null,
      resumeFileName: null,
      resumeUpdatedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.profile.userId, user.id));

  await db.delete(schema.fitScore).where(eq(schema.fitScore.userId, user.id));
  revalidatePath("/settings");
  revalidatePath("/jobs");
}

export async function addPersonalEmailAction(formData: FormData) {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) return;

  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 mins

  await db.insert(schema.emailToken).values({
    tokenHash,
    userId: user.id,
    email,
    expiresAt,
  });

  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/verify-email?token=${rawToken}`;

  await sendEmail({
    to: email,
    subject: "Verify your backup email for Docket",
    html: emailLayout(
      "Verify your backup email",
      `<p>Hi ${user.name}, confirm <strong>${email}</strong> as your backup login address for Docket. Once verified, you can sign in with either your @iitd.ac.in address or this personal email — even after graduation.</p>
       <p>${button(verifyUrl, "Verify backup email")}</p>`,
    ),
    text: `Verify your backup email for Docket: ${verifyUrl}`,
  });

  revalidatePath("/settings");
  redirect("/settings?verificationSent=1");
}

export async function removePersonalEmailAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(schema.userEmail)
    .where(
      and(
        eq(schema.userEmail.id, id),
        eq(schema.userEmail.userId, user.id),
        eq(schema.userEmail.kind, "personal"),
      ),
    );

  revalidatePath("/settings");
}

export async function deleteAccountAction() {
  const user = await requireUser();
  await db.delete(schema.user).where(eq(schema.user.id, user.id));
  redirect("/");
}

/* -------------------------------------------------------------------------- */
/*                    Governance: roles, hand-off & resources                 */
/* -------------------------------------------------------------------------- */

export async function changeUserRoleAction(formData: FormData) {
  const actor = await requireOwner();
  const targetUserId = String(formData.get("userId") ?? "");
  const toRole = String(formData.get("role") ?? "") as Role;

  if (!targetUserId || !(ROLES as readonly string[]).includes(toRole)) return;

  const [target] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, targetUserId))
    .limit(1);
  if (!target) return;

  await db
    .update(schema.user)
    .set({ role: toRole, updatedAt: new Date() })
    .where(eq(schema.user.id, targetUserId));

  await db.insert(schema.roleAudit).values({
    actorId: actor.id,
    targetUserId,
    fromRole: target.role,
    toRole,
  });

  revalidatePath("/admin");
}

export async function saveResourceAction(formData: FormData) {
  const mod = await requireModerator();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "guide");
  const body = String(formData.get("body") ?? "").trim();

  if (!slug || !title || !body) return;

  await db
    .insert(schema.resource)
    .values({
      slug,
      title,
      category,
      body,
      authorId: mod.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.resource.slug,
      set: { title, category, body, authorId: mod.id, updatedAt: new Date() },
    });

  revalidatePath("/resources");
}

/* -------------------------------------------------------------------------- */
/*              Dev / Demo instant login (when EMAIL_PROVIDER=console)        */
/* -------------------------------------------------------------------------- */

export async function devQuickLoginAction(formData: FormData) {
  if (process.env.EMAIL_PROVIDER === "resend") {
    throw new Error("Quick demo login is disabled when Resend is active.");
  }
  const email = String(formData.get("email") ?? "arjun.mpp25@iitd.ac.in")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "Arjun Sharma");
  const role = String(formData.get("role") ?? "owner");
  const batch = String(formData.get("batch") ?? "MPP 2025–27");

  // Ensure user exists, then mint a session via Better Auth's session table
  let [u] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  if (!u) {
    const id = randomBytes(12).toString("hex");
    [u] = await db
      .insert(schema.user)
      .values({
        id,
        name,
        email,
        emailVerified: true,
        role,
        batch,
      })
      .returning();

    await db
      .insert(schema.userEmail)
      .values({
        userId: u.id,
        email,
        kind: "iitd",
        verifiedAt: new Date(),
      })
      .onConflictDoNothing();

    await db
      .insert(schema.profile)
      .values({
        userId: u.id,
        headline: "MPP Candidate at IIT Delhi · Tech Policy & Digital Public Infrastructure",
        sectors: ["tech_ai", "regulation", "government", "climate"],
        skills: [
          "Policy Analysis",
          "Quantitative Research",
          "R",
          "Python",
          "Regulatory Analysis",
          "Stakeholder Engagement",
        ],
        experienceLevel: "0-2",
        interests: "AI governance, Digital Public Infrastructure (DPI), energy transition, state capacity",
      })
      .onConflictDoNothing();
  }

  redirect(`/sign-in?prefill=${encodeURIComponent(email)}`);
}
