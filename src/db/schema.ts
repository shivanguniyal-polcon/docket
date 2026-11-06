import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  date,
  uuid,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                          Better Auth core tables                           */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Canonical login email. Always the user's verified @iitd.ac.in address.
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // App-specific fields (declared as additionalFields in lib/auth.ts)
  role: text("role").notNull().default("member"), // owner | moderator | member | alumni
  batch: text("batch"), // e.g. "2025-27"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* -------------------------------------------------------------------------- */
/*                         Identity: dual-email support                       */
/* -------------------------------------------------------------------------- */

/** Every verified email a user can log in with (IIT Delhi + personal backup). */
export const userEmail = pgTable("user_email", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  kind: text("kind").notNull(), // iitd | personal
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** One-time tokens for verifying a newly added personal email. */
export const emailToken = pgTable("email_token", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const roleAudit = pgTable("role_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
  targetUserId: text("target_user_id").references(() => user.id, {
    onDelete: "cascade",
  }),
  fromRole: text("from_role"),
  toRole: text("to_role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                                  Profiles                                  */
/* -------------------------------------------------------------------------- */

export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  headline: text("headline"),
  sectors: text("sectors").array().notNull().default([]),
  skills: text("skills").array().notNull().default([]),
  interests: text("interests"),
  experienceLevel: text("experience_level"), // 0-2 | 3-5 | 5-10 | 10+
  // Resume: only extracted plain text is stored (the PDF itself is discarded).
  resumeText: text("resume_text"),
  resumeFileName: text("resume_file_name"),
  resumeUpdatedAt: timestamp("resume_updated_at"),
  // Alumni directory
  alumniOptIn: boolean("alumni_opt_in").notNull().default(false),
  openToReferrals: boolean("open_to_referrals").notNull().default(false),
  currentOrg: text("current_org"),
  currentRole: text("current_role"),
  linkedinUrl: text("linkedin_url"),
  gradYear: integer("grad_year"),
  // Notifications
  emailReminders: boolean("email_reminders").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                         Organizations, sources, jobs                       */
/* -------------------------------------------------------------------------- */

export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  website: text("website"),
  careersUrl: text("careers_url"),
  category: text("category"),
  sectors: text("sectors").array().notNull().default([]),
  hq: text("hq"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const source = pgTable(
  "source",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // greenhouse | lever | ashby | workday | smartrecruiters | rss | page_watch
    type: text("type").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // If true, ingested jobs are auto-published; otherwise they go to review.
    autoPublish: boolean("auto_publish").notNull().default(false),
    lastRunAt: timestamp("last_run_at"),
    lastStatus: text("last_status"), // ok | error | changed
    lastError: text("last_error"),
    lastHash: text("last_hash"), // page_watch content hash
    lastSnapshot: text("last_snapshot"), // page_watch text snapshot
  },
  (t) => [index("source_org_idx").on(t.orgId)],
);

export const job = pgTable(
  "job",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    orgName: text("org_name").notNull(), // denormalised for manual/unknown orgs
    sourceId: uuid("source_id").references(() => source.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id"),
    fingerprint: text("fingerprint").notNull(), // dedupe key
    title: text("title").notNull(),
    url: text("url").notNull(),
    location: text("location"),
    locationType: text("location_type"), // india | global | remote
    type: text("type"), // full_time | internship | fellowship | graduate_program | part_time
    experience: text("experience"), // 0-2 | 3-5 | 5-10 | 10+
    sectors: text("sectors").array().notNull().default([]),
    description: text("description"),
    deadline: date("deadline"),
    postedAt: timestamp("posted_at"),
    // pending | published | rejected | expired
    status: text("status").notNull().default("pending"),
    submittedBy: text("submitted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("job_fingerprint_idx").on(t.fingerprint),
    index("job_status_idx").on(t.status),
    index("job_org_idx").on(t.orgId),
    index("job_deadline_idx").on(t.deadline),
  ],
);

/** Detected changes on page_watch sources awaiting moderator triage. */
export const pageChange = pgTable("page_change", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id")
    .notNull()
    .references(() => source.id, { onDelete: "cascade" }),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  addedText: text("added_text"), // lines that appeared since last snapshot
  status: text("status").notNull().default("open"), // open | resolved | dismissed
  resolvedBy: text("resolved_by").references(() => user.id, {
    onDelete: "set null",
  }),
});

/** Opportunities that reopen every year (LAMP, YPP, CM fellowships...). */
export const recurringDeadline = pgTable("recurring_deadline", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  orgName: text("org_name").notNull(),
  title: text("title").notNull(),
  type: text("type"),
  experience: text("experience"),
  sectors: text("sectors").array().notNull().default([]),
  openMonth: integer("open_month"),
  closeMonth: integer("close_month"),
  eligibility: text("eligibility"),
  url: text("url"),
  notes: text("notes"),
});

/* -------------------------------------------------------------------------- */
/*                            Personal tracker                                */
/* -------------------------------------------------------------------------- */

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export const application = pgTable(
  "application",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => job.id, { onDelete: "set null" }),
    orgId: uuid("org_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    // Snapshot fields so the card survives job deletion / supports off-platform roles
    title: text("title").notNull(),
    orgName: text("org_name").notNull(),
    url: text("url"),
    type: text("type"),
    status: text("status").notNull().default("saved"),
    deadline: date("deadline"),
    appliedAt: date("applied_at"),
    notes: text("notes"),
    contacts: text("contacts"),
    cvVersion: text("cv_version"),
    writingSample: text("writing_sample"),
    nextFollowUp: date("next_follow_up"),
    // Contribute (anonymously) to cohort outcome stats
    shareOutcome: boolean("share_outcome").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("application_user_idx").on(t.userId),
    index("application_org_idx").on(t.orgId),
  ],
);

export const reminderLog = pgTable(
  "reminder_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // e.g. "app:<id>:7d" or "digest:2026-W45"
    sentAt: timestamp("sent_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reminder_unique_idx").on(t.userId, t.key)],
);

/* -------------------------------------------------------------------------- */
/*                               AI fit scores                                */
/* -------------------------------------------------------------------------- */

export const fitScore = pgTable(
  "fit_score",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    summary: text("summary"),
    strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
    gaps: jsonb("gaps").$type<string[]>().notNull().default([]),
    provider: text("provider").notNull(), // gemini | openai | keyword ...
    profileHash: text("profile_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.jobId] })],
);

/* -------------------------------------------------------------------------- */
/*                            Cohort knowledge                                */
/* -------------------------------------------------------------------------- */

export const orgNote = pgTable(
  "org_note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    batch: text("batch"),
    anonymous: boolean("anonymous").notNull().default(false),
    kind: text("kind").notNull().default("tip"), // interview | assignment | compensation | timeline | tip | culture | cold_outreach
    roleTitle: text("role_title"), // e.g. "Research Intern", "Associate"
    compensation: text("compensation"), // e.g. "₹20k/mo stipend", "₹12–14 LPA"
    assignmentTimeLimit: text("assignment_time_limit"), // e.g. "48 hours"
    assignmentTools: text("assignment_tools"), // e.g. "R / Stata + 2-page Policy Brief"
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("org_note_org_idx").on(t.orgId)],
);

export const referralRequest = pgTable("referral_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromUserId: text("from_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  toUserId: text("to_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => job.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  status: text("status").notNull().default("sent"), // sent | accepted | declined
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resource = pgTable("resource", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(), // cv | cover_letter | interview | guide
  body: text("body").notNull(), // markdown
  authorId: text("author_id").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
