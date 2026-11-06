import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { db, schema } from "@/db";
import { isPolicyRelevant } from "@/lib/classify";

export interface CrawledJobRecord {
  fingerprint: string;
  orgSlug: string;
  orgName: string;
  externalId: string | null;
  title: string;
  url: string;
  location: string;
  locationType: string;
  type: string;
  experience: string;
  sectors: string[];
  description: string;
  deadline: string | null;
  postedAt: string;
  crawledAt: string;
}

/**
 * Syncs the Git-tracked `seed/crawled-jobs.json` snapshot (or an external
 * Cloudflare R2 / JSON URL) into the Postgres / PGlite `job` table.
 */
export async function syncSnapshotToDatabase(customRecords?: CrawledJobRecord[]) {
  let records: CrawledJobRecord[] = customRecords ?? [];

  if (records.length === 0) {
    const r2Url = process.env.CLOUDFLARE_R2_SNAPSHOT_URL;
    if (r2Url) {
      const res = await fetch(r2Url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) records = (await res.json()) as CrawledJobRecord[];
    } else {
      const p = join(process.cwd(), "seed/crawled-jobs.json");
      if (existsSync(p)) {
        records = JSON.parse(readFileSync(p, "utf8")) as CrawledJobRecord[];
      }
    }
  }

  // Also ensure any new organizations in seed/organizations.json exist in DB
  const orgsSeedPath = join(process.cwd(), "seed/organizations.json");
  if (existsSync(orgsSeedPath)) {
    try {
      const seedOrgs = JSON.parse(readFileSync(orgsSeedPath, "utf8")) as Array<{
        slug: string;
        name: string;
        website?: string;
        careersUrl?: string;
        category?: string;
        sectors?: string[];
        hq?: string;
        description?: string;
      }>;
      for (const so of seedOrgs) {
        await db
          .insert(schema.organization)
          .values({
            slug: so.slug,
            name: so.name,
            website: so.website ?? null,
            careersUrl: so.careersUrl ?? null,
            category: so.category ?? "think_tank",
            sectors: so.sectors ?? [],
            hq: so.hq ?? "India",
            description: so.description ?? null,
          })
          .onConflictDoUpdate({
            target: schema.organization.slug,
            set: {
              careersUrl: so.careersUrl ?? null,
            },
          });
      }
    } catch {
      // ignore seed org sync error
    }
  }

  const orgs = await db
    .select({ id: schema.organization.id, slug: schema.organization.slug })
    .from(schema.organization);
  const slugToId = new Map(orgs.map((o) => [o.slug, o.id]));

  let upserted = 0;
  for (const r of records) {
    if (!isPolicyRelevant(r.title)) continue;
    const orgId = slugToId.get(r.orgSlug) ?? null;

    await db
      .insert(schema.job)
      .values({
        orgId,
        orgName: r.orgName,
        externalId: r.externalId,
        fingerprint: r.fingerprint,
        title: r.title,
        url: r.url,
        location: r.location,
        locationType: r.locationType,
        type: r.type,
        experience: r.experience,
        sectors: r.sectors,
        description: r.description || null,
        deadline: r.deadline,
        postedAt: r.postedAt ? new Date(r.postedAt) : new Date(),
        status: "published",
      })
      .onConflictDoUpdate({
        target: schema.job.fingerprint,
        set: {
          description: r.description || null,
          location: r.location,
          deadline: r.deadline,
          updatedAt: new Date(),
        },
      });
    upserted++;
  }

  return { totalInSnapshot: records.length, upserted };
}
