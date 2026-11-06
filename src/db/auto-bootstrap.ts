import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { sql, count } from "drizzle-orm";
import { db, schema } from "./index";
import { isPolicyRelevant } from "@/lib/classify";
import type { CrawledJobRecord } from "@/lib/snapshot-sync";

const globalForBootstrap = globalThis as unknown as {
  __docketBootstrapped?: Promise<void>;
};

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "role" text DEFAULT 'member' NOT NULL,
  "batch" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "rate_limit" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL,
  "last_request" bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_email" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "email" text NOT NULL UNIQUE,
  "kind" text NOT NULL,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_token" (
  "token_hash" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "expires_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "role_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "target_user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
  "from_role" text,
  "to_role" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "profile" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "headline" text,
  "sectors" text[] DEFAULT '{}' NOT NULL,
  "skills" text[] DEFAULT '{}' NOT NULL,
  "interests" text,
  "experience_level" text,
  "resume_text" text,
  "resume_file_name" text,
  "resume_updated_at" timestamp,
  "alumni_opt_in" boolean DEFAULT false NOT NULL,
  "open_to_referrals" boolean DEFAULT false NOT NULL,
  "current_org" text,
  "current_role" text,
  "linkedin_url" text,
  "grad_year" integer,
  "email_reminders" boolean DEFAULT true NOT NULL,
  "weekly_digest" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "organization" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "website" text,
  "careers_url" text,
  "category" text,
  "sectors" text[] DEFAULT '{}' NOT NULL,
  "hq" text,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "source" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "config" jsonb NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "auto_publish" boolean DEFAULT false NOT NULL,
  "last_run_at" timestamp,
  "last_status" text,
  "last_error" text,
  "last_hash" text,
  "last_snapshot" text
);

CREATE TABLE IF NOT EXISTS "job" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid REFERENCES "organization"("id") ON DELETE SET NULL,
  "org_name" text NOT NULL,
  "source_id" uuid REFERENCES "source"("id") ON DELETE SET NULL,
  "external_id" text,
  "fingerprint" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "location" text,
  "location_type" text,
  "type" text,
  "experience" text,
  "sectors" text[] DEFAULT '{}' NOT NULL,
  "description" text,
  "deadline" date,
  "posted_at" timestamp,
  "status" text DEFAULT 'pending' NOT NULL,
  "submitted_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "reviewed_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_change" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL REFERENCES "source"("id") ON DELETE CASCADE,
  "detected_at" timestamp DEFAULT now() NOT NULL,
  "added_text" text,
  "status" text DEFAULT 'open' NOT NULL,
  "resolved_by" text REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "recurring_deadline" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid REFERENCES "organization"("id") ON DELETE SET NULL,
  "org_name" text NOT NULL,
  "title" text NOT NULL,
  "type" text,
  "experience" text,
  "sectors" text[] DEFAULT '{}' NOT NULL,
  "open_month" integer,
  "close_month" integer,
  "eligibility" text,
  "url" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS "application" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "job_id" uuid REFERENCES "job"("id") ON DELETE SET NULL,
  "org_id" uuid REFERENCES "organization"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "org_name" text NOT NULL,
  "url" text,
  "type" text,
  "status" text DEFAULT 'saved' NOT NULL,
  "deadline" date,
  "applied_at" date,
  "notes" text,
  "contacts" text,
  "cv_version" text,
  "writing_sample" text,
  "next_follow_up" date,
  "share_outcome" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reminder_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "sent_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("user_id", "key")
);

CREATE TABLE IF NOT EXISTS "fit_score" (
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "job_id" uuid NOT NULL REFERENCES "job"("id") ON DELETE CASCADE,
  "score" integer NOT NULL,
  "summary" text,
  "strengths" jsonb DEFAULT '[]' NOT NULL,
  "gaps" jsonb DEFAULT '[]' NOT NULL,
  "provider" text NOT NULL,
  "profile_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY("user_id", "job_id")
);

CREATE TABLE IF NOT EXISTS "org_note" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "batch" text,
  "anonymous" boolean DEFAULT false NOT NULL,
  "kind" text DEFAULT 'tip' NOT NULL,
  "role_title" text,
  "compensation" text,
  "assignment_time_limit" text,
  "assignment_tools" text,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "referral_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "from_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "to_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "job_id" uuid REFERENCES "job"("id") ON DELETE SET NULL,
  "message" text NOT NULL,
  "status" text DEFAULT 'sent' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "resource" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "body" text NOT NULL,
  "author_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
`;

async function runBootstrapOnce() {
  // Check if already initialized
  try {
    const [{ value }] = await db
      .select({ value: count() })
      .from(schema.organization);
    if (value > 0) return;
  } catch {
    // Table does not exist yet -> run DDL
  }

  for (const stmt of SCHEMA_DDL.split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await db.execute(sql.raw(stmt));
  }

  // Re-check if organizations exist after DDL
  const [{ value: existingOrgs }] = await db
    .select({ value: count() })
    .from(schema.organization);
  if (existingOrgs > 0) return;

  const orgsPath = join(process.cwd(), "seed/organizations.json");
  const recurringPath = join(process.cwd(), "seed/recurring.json");
  const snapshotPath = join(process.cwd(), "seed/crawled-jobs.json");

  const slugToOrgId = new Map<string, string>();

  if (existsSync(orgsPath)) {
    const orgsRaw = JSON.parse(readFileSync(orgsPath, "utf8")) as Array<{
      slug: string;
      name: string;
      website?: string;
      careersUrl?: string;
      category?: string;
      sectors?: string[];
      hq?: string;
      description?: string;
      source?: { type: string; config: Record<string, unknown> };
    }>;

    for (const o of orgsRaw) {
      const [inserted] = await db
        .insert(schema.organization)
        .values({
          slug: o.slug,
          name: o.name,
          website: o.website ?? null,
          careersUrl: o.careersUrl ?? null,
          category: o.category ?? "think_tank",
          sectors: o.sectors ?? [],
          hq: o.hq ?? "India",
          description: o.description ?? null,
        })
        .onConflictDoUpdate({
          target: schema.organization.slug,
          set: { name: o.name },
        })
        .returning({ id: schema.organization.id });

      slugToOrgId.set(o.slug, inserted.id);

      if (o.source) {
        const isApi = [
          "ashby",
          "greenhouse",
          "lever",
          "smartrecruiters",
          "workday",
          "zohorecruit",
          "kula",
          "manatal",
        ].includes(o.source.type);
        await db.insert(schema.source).values({
          orgId: inserted.id,
          type: o.source.type,
          config: o.source.config,
          enabled: true,
          autoPublish: isApi,
        });
      }
    }
  }

  if (existsSync(recurringPath)) {
    const recurringRaw = JSON.parse(
      readFileSync(recurringPath, "utf8"),
    ) as Array<{
      title: string;
      orgSlug?: string | null;
      orgName: string;
      type?: string;
      experience?: string;
      sectors?: string[];
      typicalOpenMonth?: number;
      typicalCloseMonth?: number;
      eligibility?: string;
      url?: string;
      notes?: string;
    }>;

    for (const r of recurringRaw) {
      await db.insert(schema.recurringDeadline).values({
        orgId: r.orgSlug ? (slugToOrgId.get(r.orgSlug) ?? null) : null,
        orgName: r.orgName,
        title: r.title,
        type: r.type ?? "fellowship",
        experience: r.experience ?? "0-2",
        sectors: r.sectors ?? [],
        openMonth: r.typicalOpenMonth ?? null,
        closeMonth: r.typicalCloseMonth ?? null,
        eligibility: r.eligibility ?? null,
        url: r.url ?? null,
        notes: r.notes ?? null,
      });
    }
  }

  if (existsSync(snapshotPath)) {
    const jobsRaw = JSON.parse(
      readFileSync(snapshotPath, "utf8"),
    ) as CrawledJobRecord[];
    for (const j of jobsRaw) {
      if (!isPolicyRelevant(j.title)) continue;
      await db
        .insert(schema.job)
        .values({
          orgId: slugToOrgId.get(j.orgSlug) ?? null,
          orgName: j.orgName,
          externalId: j.externalId,
          fingerprint: j.fingerprint,
          title: j.title,
          url: j.url,
          location: j.location,
          locationType: j.locationType,
          type: j.type,
          experience: j.experience,
          sectors: j.sectors,
          description: j.description || null,
          deadline: j.deadline,
          postedAt: j.postedAt ? new Date(j.postedAt) : new Date(),
          status: "published",
        })
        .onConflictDoNothing();
    }
  }

  // Seed default Owner & Cohort personas
  const personas = [
    {
      id: "usr_owner_ganesh",
      name: "Ganesh Uniyal",
      email: "ppm254500@iitd.ac.in",
      role: "owner",
      batch: "MPP 2025–27",
      headline:
        "MPP at IIT Delhi · Permanent Steward of Docket · Tech, AI & Regulatory Policy",
      sectors: ["tech_ai", "regulation", "government", "health"],
      skills: [
        "Policy Analysis",
        "AI Governance",
        "R",
        "Python",
        "Regulatory Impact Assessment",
        "Stakeholder Engagement",
      ],
      experienceLevel: "0-2",
      alumniOptIn: true,
      openToReferrals: true,
      currentOrg: "SPP, IIT Delhi",
      currentRole: "MPP Candidate",
      gradYear: 2027,
    },
    {
      id: "usr_owner_iitd",
      name: "Docket Owner",
      email: "owner@iitd.ac.in",
      role: "owner",
      batch: "MPP 2025–27",
      headline: "MPP at IIT Delhi · Permanent Steward of Docket",
      sectors: ["tech_ai", "regulation", "government"],
      skills: ["Policy Analysis", "R", "Stata", "Legislative Research"],
      experienceLevel: "0-2",
      alumniOptIn: true,
      openToReferrals: true,
      currentOrg: "SPP, IIT Delhi",
      currentRole: "MPP Steward",
      gradYear: 2027,
    },
    {
      id: "usr_mod_ananya",
      name: "Ananya Verma",
      email: "ananya.mpp25@iitd.ac.in",
      role: "moderator",
      batch: "MPP 2025–27",
      headline:
        "2nd-Year MPP · Climate Finance & Energy Transition · Former Intern @ CEEW",
      sectors: ["climate", "finance", "government"],
      skills: ["Stata", "Energy Modelling", "Public Finance", "Policy Briefs"],
      experienceLevel: "0-2",
      alumniOptIn: true,
      openToReferrals: true,
      currentOrg: "CEEW",
      currentRole: "Student Moderator",
      gradYear: 2027,
    },
    {
      id: "usr_stu_rohan",
      name: "Rohan Nair",
      email: "rohan.mpp26@iitd.ac.in",
      role: "member",
      batch: "MPP 2026–28",
      headline:
        "1st-Year MPP seeking Dec 2026 Winter Internship in Health & Development Policy",
      sectors: ["health", "development", "government"],
      skills: ["R", "Survey Design", "Qualitative Research"],
      experienceLevel: "0-2",
      alumniOptIn: false,
      openToReferrals: false,
      currentOrg: "IIT Delhi",
      currentRole: "1st-Year MPP Student",
      gradYear: 2028,
    },
    {
      id: "usr_alum_meera",
      name: "Meera Krishnan",
      email: "meera.mpp23@iitd.ac.in",
      role: "alumni",
      batch: "MPP 2023–25",
      headline:
        "MPP Alum · Senior Associate at Samagra Governance · Happy to refer IITD juniors",
      sectors: ["government", "education", "tech_ai"],
      skills: ["Governance Consulting", "PMU Delivery", "Data Analytics"],
      experienceLevel: "3-5",
      alumniOptIn: true,
      openToReferrals: true,
      currentOrg: "Samagra",
      currentRole: "Senior Associate",
      gradYear: 2025,
    },
    {
      id: "usr_alum_kabir",
      name: "Kabir Deshmukh",
      email: "kabir.mpp22@iitd.ac.in",
      role: "alumni",
      batch: "MPP 2022–24",
      headline:
        "MPP Alum · Policy Consultant at PwC India (G&PS) · Ex-LAMP Fellow",
      sectors: ["government", "private_sector", "regulation", "finance"],
      skills: ["Industrial Policy", "Legislative Research", "Public Procurement"],
      experienceLevel: "3-5",
      alumniOptIn: true,
      openToReferrals: true,
      currentOrg: "PwC India",
      currentRole: "Consultant (G&PS)",
      gradYear: 2024,
    },
  ];

  for (const p of personas) {
    await db
      .insert(schema.user)
      .values({
        id: p.id,
        name: p.name,
        email: p.email,
        emailVerified: true,
        role: p.role,
        batch: p.batch,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.userEmail)
      .values({
        userId: p.id,
        email: p.email,
        kind: "iitd",
        verifiedAt: new Date(),
      })
      .onConflictDoNothing();

    await db
      .insert(schema.profile)
      .values({
        userId: p.id,
        headline: p.headline,
        sectors: p.sectors,
        skills: p.skills,
        experienceLevel: p.experienceLevel,
        alumniOptIn: p.alumniOptIn,
        openToReferrals: p.openToReferrals,
        currentOrg: p.currentOrg,
        currentRole: p.currentRole,
        gradYear: p.gradYear,
        resumeText:
          p.role === "owner"
            ? "Master of Public Policy (MPP), Indian Institute of Technology Delhi (IIT Delhi). Coursework: Econometrics, Public Policy Analysis, AI & Digital Regulation, Health Systems, Energy & Climate Policy. Skills: R, Python, Stata, Policy Briefs, Regulatory Analysis, Stakeholder Consultations, Impact Evaluation."
            : null,
        resumeFileName: p.role === "owner" ? "IITD_MPP_Policy_CV.pdf" : null,
        resumeUpdatedAt: p.role === "owner" ? new Date() : null,
      })
      .onConflictDoNothing();
  }
}

export async function ensureDbReady() {
  if (!globalForBootstrap.__docketBootstrapped) {
    globalForBootstrap.__docketBootstrapped = runBootstrapOnce().catch((err) => {
      globalForBootstrap.__docketBootstrapped = undefined;
      console.error("DB auto-bootstrap warning:", err);
    });
  }
  return globalForBootstrap.__docketBootstrapped;
}
