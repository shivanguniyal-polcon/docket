import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { runAllEnabledSources } from "@/lib/ingest";

export async function POST() {
  // 1. Add new columns idempotently to PGlite / Postgres
  await db.execute(
    sql`ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "cv_version" text`,
  );
  await db.execute(
    sql`ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "writing_sample" text`,
  );
  await db.execute(
    sql`ALTER TABLE "application" ADD COLUMN IF NOT EXISTS "next_follow_up" date`,
  );
  await db.execute(
    sql`ALTER TABLE "org_note" ADD COLUMN IF NOT EXISTS "role_title" text`,
  );
  await db.execute(
    sql`ALTER TABLE "org_note" ADD COLUMN IF NOT EXISTS "compensation" text`,
  );
  await db.execute(
    sql`ALTER TABLE "org_note" ADD COLUMN IF NOT EXISTS "assignment_time_limit" text`,
  );
  await db.execute(
    sql`ALTER TABLE "org_note" ADD COLUMN IF NOT EXISTS "assignment_tools" text`,
  );

  // 2. Enrich existing cohort org notes with assignment & compensation metadata
  await db.execute(
    sql`UPDATE "org_note" SET "kind" = 'assignment', "role_title" = 'Research Analyst / Intern', "compensation" = '₹20k/mo (Intern) · ₹9.5–12 LPA (Analyst)', "assignment_time_limit" = '48 hours', "assignment_tools" = 'Excel / R + 2-page Policy Brief' WHERE "body" LIKE '%CEEW hiring has 3 stages%'`,
  );
  await db.execute(
    sql`UPDATE "org_note" SET "kind" = 'assignment', "role_title" = 'Associate', "compensation" = '₹13.5–16 LPA', "assignment_time_limit" = '72 hours', "assignment_tools" = 'Slide Deck + Governance Case' WHERE "body" LIKE '%Samagra Associate process%'`,
  );
  await db.execute(
    sql`UPDATE "org_note" SET "kind" = 'assignment', "role_title" = 'LAMP Fellow', "compensation" = '₹23,000/month stipend', "assignment_time_limit" = 'Application Portal', "assignment_tools" = 'Two 500-word Policy & Book Essays' WHERE "body" LIKE '%For LAMP Fellowship%'`,
  );

  // 3. Purge noisy non-policy jobs (including Ashby engineering/infra roles)
  await db.execute(
    sql`DELETE FROM "job" WHERE "title" ~* '(engineer|sde|cuda|kernel|devops|devsecops|sre|frontend|backend|product designer|product manager|solution architect|ml researcher|foundational models|inference|telephony|hpc|growth marketing|field marketing|product marketing|marketing operations|brand & communication|technical writer)'`,
  );

  return NextResponse.json({
    migrated: true,
  });
}
