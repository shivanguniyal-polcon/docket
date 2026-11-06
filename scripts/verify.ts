import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { auth } from "../src/lib/auth";
import { getRecentDevEmails } from "../src/lib/email";
import { getAIProvider } from "../src/lib/ai";

loadEnv({ path: ".env.local" });

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  console.log("1️⃣ Verifying seeded database counts...");
  const [orgs, jobs, recurring, resources] = await Promise.all([
    db.select().from(schema.organization),
    db.select().from(schema.job),
    db.select().from(schema.recurringDeadline),
    db.select().from(schema.resource),
  ]);
  assert(orgs.length >= 50, `Expected >=50 orgs, got ${orgs.length}`);
  assert(jobs.length >= 25, `Expected >=25 jobs, got ${jobs.length}`);
  assert(recurring.length >= 30, `Expected >=30 recurring, got ${recurring.length}`);
  assert(resources.length >= 4, `Expected >=4 resources, got ${resources.length}`);
  console.log(
    `   ✓ ${orgs.length} orgs, ${jobs.length} jobs, ${recurring.length} recurring deadlines, ${resources.length} guides`,
  );

  // Verify experience bands are all represented
  for (const band of ["0-2", "3-5", "5-10", "10+"]) {
    const countBand = jobs.filter((j) => j.experience === band).length;
    assert(countBand >= 3, `Expected >=3 jobs in band ${band}, got ${countBand}`);
  }
  console.log("   ✓ All 4 experience bands (0-2, 3-5, 5-10, 10+) populated");

  console.log("2️⃣ Testing dual-email authentication rules...");
  // (a) Non-IITD unknown email must be rejected
  let blockedNonIitd = false;
  try {
    await auth.api.signInMagicLink({
      body: { email: "random.outsider@gmail.com" },
      headers: new Headers(),
    });
  } catch {
    blockedNonIitd = true;
  }
  assert(blockedNonIitd, "Unverified non-IITD email should be blocked");
  console.log("   ✓ Blocked unverified non-@iitd.ac.in signup");

  // (b) Valid @iitd.ac.in email must succeed
  const iitdRes = await auth.api.signInMagicLink({
    body: { email: "owner@iitd.ac.in" },
    headers: new Headers(),
  });
  assert(iitdRes.status === true, "IITD magic link should succeed");
  const lastEmail1 = getRecentDevEmails()[0];
  assert(
    lastEmail1?.to === "owner@iitd.ac.in",
    `Expected delivery to owner@iitd.ac.in, got ${lastEmail1?.to}`,
  );
  console.log("   ✓ Sent magic link to primary @iitd.ac.in address");

  // (c) Verified personal backup email (ganesh.policy.backup@gmail.com -> owner@iitd.ac.in) must succeed and deliver to personal inbox
  const backupRes = await auth.api.signInMagicLink({
    body: { email: "ganesh.policy.backup@gmail.com" },
    headers: new Headers(),
  });
  assert(backupRes.status === true, "Verified personal backup email should succeed");
  const lastEmail2 = getRecentDevEmails()[0];
  assert(
    lastEmail2?.to === "ganesh.policy.backup@gmail.com",
    `Expected delivery to ganesh.policy.backup@gmail.com, got ${lastEmail2?.to}`,
  );
  console.log(
    "   ✓ Verified personal backup email resolved to canonical account & delivered link to personal inbox",
  );

  console.log("3️⃣ Testing AI Fit Scoring engine...");
  const [ownerProfile] = await db
    .select()
    .from(schema.profile)
    .where(eq(schema.profile.userId, "usr_owner_iitd"))
    .limit(1);
  const sampleJob = jobs.find((j) => j.sectors.includes("tech_ai")) ?? jobs[0];
  const ai = getAIProvider();
  const fit = await ai.scoreFit({
    profile: {
      headline: ownerProfile.headline,
      sectors: ownerProfile.sectors,
      skills: ownerProfile.skills,
      interests: ownerProfile.interests,
      experienceLevel: ownerProfile.experienceLevel,
      resumeText: ownerProfile.resumeText,
    },
    job: sampleJob,
  });
  assert(fit.score >= 50 && fit.score <= 100, `Unexpected score: ${fit.score}`);
  assert(fit.strengths.length > 0, "Expected non-empty strengths");
  console.log(
    `   ✓ Scored "${sampleJob.title}" (${sampleJob.orgName}): ${fit.score}% [${fit.provider}] — ${fit.summary}`,
  );

  console.log("\n🎉 All verification checks passed!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  });
