import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { sql, count, isNotNull } from "drizzle-orm";
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
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Check if already initialized
  try {
    const [{ value }] = await db
      .select({ value: count() })
      .from(schema.organization);
    if (value > 0) {
      return;
    }
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
        .onConflictDoUpdate({
          target: schema.job.fingerprint,
          set: {
            deadline: j.deadline,
            description: j.description || null,
          },
        });
    }
  }

  // Seed only the real Owner (Shivang Uniyal)
  const owner = {
    id: "usr_owner_shivang",
    name: "Shivang Uniyal",
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
    currentRole: "MPP Candidate & Portal Owner",
    gradYear: 2027,
  };

  await db
    .insert(schema.user)
    .values({
      id: owner.id,
      name: owner.name,
      email: owner.email,
      emailVerified: true,
      role: owner.role,
      batch: owner.batch,
    })
    .onConflictDoUpdate({
      target: schema.user.email,
      set: {
        name: owner.name,
        role: owner.role,
        batch: owner.batch,
      },
    });

  await db
    .insert(schema.userEmail)
    .values({
      userId: owner.id,
      email: owner.email,
      kind: "iitd",
      verifiedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(schema.profile)
    .values({
      userId: owner.id,
      headline: owner.headline,
      sectors: owner.sectors,
      skills: owner.skills,
      experienceLevel: owner.experienceLevel,
      alumniOptIn: owner.alumniOptIn,
      openToReferrals: owner.openToReferrals,
      currentOrg: owner.currentOrg,
      currentRole: owner.currentRole,
      gradYear: owner.gradYear,
      resumeText:
        "Master of Public Policy (MPP), Indian Institute of Technology Delhi (IIT Delhi). Coursework: Econometrics, Public Policy Analysis, AI & Digital Regulation, Health Systems, Energy & Climate Policy. Skills: R, Python, Stata, Policy Briefs, Regulatory Analysis, Stakeholder Consultations, Impact Evaluation.",
      resumeFileName: "IITD_MPP_Policy_CV.pdf",
      resumeUpdatedAt: new Date(),
    })
    .onConflictDoNothing();

  // Seed starter career guides & anonymous institutional memory notes
  const starterGuides = [
    {
      slug: "indian-policy-cv-playbook",
      title: "The IITD MPP Policy CV Playbook (Think Tanks, Consulting & Multilaterals)",
      category: "cv",
      body: `1. Keep it to 1 page for 0–5 years experience (2 pages only for academic/RA roles or 5+ years).
2. Structure for MPP candidates:
   • Education & Policy Coursework (highlight Econometrics, Policy Evaluation, Law & Governance, Capstone/Thesis topic)
   • Policy & Research Experience (quantify scope: e.g. "Analyzed 14 state ERC tariff orders", "Cleaned NSSO 78th round dataset of 42,000 households in R")
   • Fieldwork & Stakeholder Engagement (mention districts, ministry consultations, or primary surveys)
   • Technical & Policy Toolkit (R / Stata / Python / QGIS / Legislative Drafting / Budget Analysis)
3. Tailor verbs by target:
   • Think Tanks (CEEW, CPR, PRS, CSEP, Vidhi): emphasize empirical rigor, writing samples, datasets, and legislative/regulatory citations.
   • Governance Consulting (Samagra, Dalberg, PwC, EY, Deloitte, MSC): emphasize PMU delivery, state department stakeholders, dashboards, and scale impact.`,
    },
    {
      slug: "writing-samples-and-policy-memos",
      title: "Acing Take-Home Policy Memos & Written Assignments (48-Hour Tasks)",
      category: "interview",
      body: `Almost every Indian policy employer (CEEW, Samagra, IDinsight, J-PAL, Koan, Esya) uses a take-home written assignment or data test in Round 1.

• Executive Summary First (BLUF): Put your 3 core recommendations and the trade-offs in the first 150 words.
• Ground in Indian Institutional Reality: Name the exact nodal ministry, statutory regulator (TRAI, SEBI, CERC, RBI), scheme budget head, and 73rd/74th Amendment or Union/Concurrent List constraints.
• Data Tests (IDinsight / J-PAL / CEEW): Always submit a clean, commented .do or .R script alongside your summary PDF. State your handling of missing values, outliers, and survey weights explicitly.`,
    },
    {
      slug: "cover-letters-that-get-read",
      title: "3-Paragraph Cover Note Formula for Policy Roles & Cold Outreach",
      category: "cover_letter",
      body: `Paragraph 1 — The Hook & Specific Project:
Name the exact vertical or recent report by the organization (e.g. "I am writing to apply for the Programme Associate role in CEEW's Industrial Sustainability team, following your recent study on green steel procurement...").

Paragraph 2 — Your Proof of Work:
Connect 1 quantitative skill + 1 policy domain experience from your IITD MPP coursework, internship, or thesis directly to the JD's deliverables.

Paragraph 3 — Availability & Writing Sample:
State your earliest start window (e.g. "Available for winter internship from Dec 2, 2026" or "Graduating May 2027") and attach a 2-page policy brief link.`,
    },
    {
      slug: "moderator-annual-handoff-checklist",
      title: "Annual Batch Hand-Off Checklist (Maintaining Docket Across Cohorts)",
      category: "guide",
      body: `Every April/May, outgoing 2nd-year student moderators hand over operational stewardship to incoming 1st-year leads:

1. Role Promotion: The permanent Owner promotes 2–3 incoming student leads to "moderator" in the Mod Console (/admin) and transitions graduating members to "alumni".
2. Alumni Continuity Check: Remind graduating batchmates to verify their personal Gmail/Outlook in /settings before their @iitd.ac.in inbox deactivates, and invite them to opt into the Alumni Referral Directory.
3. Post-Placement Memory Drive: Host a 30-minute cohort session after summer internships and final placements where everyone logs 1 anonymous interview note on /orgs and updates their Tracker status to power the n >= 5 outcome funnel.`,
    },
  ];

  for (const g of starterGuides) {
    await db
      .insert(schema.resource)
      .values({
        slug: g.slug,
        title: g.title,
        category: g.category,
        body: g.body,
        authorId: owner.id,
      })
      .onConflictDoNothing({ target: schema.resource.slug });
  }

  const ceewId = slugToOrgId.get("ceew");
  const samagraId = slugToOrgId.get("samagra");
  const prsId = slugToOrgId.get("prs-legislative-research");

  if (ceewId) {
    await db.insert(schema.orgNote).values([
      {
        orgId: ceewId,
        userId: null,
        batch: "MPP Cohort",
        anonymous: true,
        kind: "assignment_prompt",
        roleTitle: "Research Analyst — Power & Renewables",
        compensation: "₹9.5–11.5 LPA (Analyst) · ₹20k/mo (Intern)",
        assignmentTimeLimit: "48 hours",
        assignmentTools: "Excel / R + 2-page policy memo",
        body: "CEEW hiring has 3 stages: (1) Shortlisting + 48-hour written/quant assignment specific to the team (e.g. power sector tariff analysis in Excel/R), (2) Technical interview with the Programme Lead + Senior Analyst (expect deep questions on your MPP thesis/capstone), and (3) Culture & leadership round with HR/Director.",
      },
      {
        orgId: ceewId,
        userId: null,
        batch: "MPP Cohort",
        anonymous: true,
        kind: "timeline",
        roleTitle: "Winter / Summer Research Intern",
        compensation: "₹20,000/month",
        body: "Winter internship calls usually go out in November; summer internship & Research Analyst calls open in February–March. Applying within the first 7 days of posting significantly helps.",
      },
    ]);
  }

  if (samagraId) {
    await db.insert(schema.orgNote).values({
      orgId: samagraId,
      userId: null,
      batch: "MPP Cohort",
      anonymous: true,
      kind: "assignment_prompt",
      roleTitle: "Associate — Governance Consulting",
      compensation: "₹14.5–17.5 LPA",
      assignmentTimeLimit: "48 hours",
      assignmentTools: "6-slide PowerPoint Deck + Issue Tree",
      body: "Samagra Associate process: Deck submission on a governance problem statement → Guesstimate + Governance Case Round (e.g. improving foundational literacy in a state) → Partner chat. Emphasize structured problem-solving and comfort with field travel.",
    });
  }

  if (prsId) {
    await db.insert(schema.orgNote).values({
      orgId: prsId,
      userId: null,
      batch: "MPP Cohort",
      anonymous: true,
      kind: "tip",
      roleTitle: "LAMP Fellow",
      compensation: "₹23,000/month stipend",
      assignmentTimeLimit: "2 x 500-word essays",
      assignmentTools: "Policy Problem Essay + Book/Bill Critique",
      body: "For LAMP Fellowship: the two 500-word essays (one policy problem, one book/article critique) carry huge weight. Keep your stance strictly non-partisan and analytical — PRS values neutral briefings that any MP across the aisle can use.",
    });
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
