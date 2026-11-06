import * as cheerio from "cheerio";
import { isPolicyRelevant } from "@/lib/classify";
import { db, schema } from "@/db";
import { extractJobFromUrl } from "@/lib/extract-jd";
import { eq } from "drizzle-orm";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface DiscoveredWebJob {
  title: string;
  url: string;
  snippet: string;
  matchedOrgName?: string;
  matchedOrgSlug?: string;
  source: "google_serp" | "yahoo_dork" | "devnet_noticeboard";
  alreadyInDocket?: boolean;
}

/** Preset search dorks tailored for the Indian Public Policy ecosystem. */
export const PRESET_SEARCH_DORKS = [
  {
    id: "keka_policy",
    label: "Keka HR Boards",
    description: "Policy consultancies & non-profits hosted on Keka (Athena, Swaniti, THF)",
    query: 'site:keka.com "Public Policy" OR "Government Advisory" OR "Policy Analyst" India careers',
  },
  {
    id: "academic_ra",
    label: "Academic RAs & Think Tanks",
    description: "Research Associate vacancies at ISB, IIMs, NIPFP, IGIDR, CPR, CSEP",
    query: '"Research Associate" "Public Policy" ("ISB" OR "IIM" OR "NIPFP" OR "IGIDR" OR "CPR" OR "CSEP") apply',
  },
  {
    id: "foundations_manatal",
    label: "Foundations & Philanthropy",
    description: "Manatal & careers-page boards for Indian foundations & trusts",
    query: 'site:careers-page.com "Foundation" OR "Policy" OR "Governance" India',
  },
  {
    id: "devnet_jobs",
    label: "DevNetJobs Noticeboard",
    description: "Open M&E, public finance & development sector consultant ToRs",
    query: "devnetjobs", // Special flag handled by scraper
  },
  {
    id: "govt_young_prof",
    label: "Govt & Young Professionals",
    description: "Young Professional and State Transformation consultant circulars",
    query: '"Young Professional" OR "Consultant" ("NITI Aayog" OR "State Transformation" OR "Public Policy") India last date',
  },
] as const;

/** Scrapes devnetjobsindia.org for active policy and governance postings. */
export async function scrapeDevNetJobsNoticeboard(): Promise<DiscoveredWebJob[]> {
  try {
    const res = await fetch("https://www.devnetjobsindia.org/", {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: DiscoveredWebJob[] = [];
    const seen = new Set<string>();

    $("a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (!/jobdescription\.aspx/i.test(href)) return;
      const fullUrl = new URL(href, "https://www.devnetjobsindia.org/").toString();
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);

      const rawText = $(el).text().replace(/\s+/g, " ").trim();
      if (rawText.length < 8) return;

      // Extract lines from link text (DevNet embeds Org and Location inside <a>)
      const parts = rawText.split(/\s{2,}/);
      const title = parts[0] || rawText;
      const snippet = rawText;

      if (!isPolicyRelevant(`${title} ${snippet}`)) return;

      results.push({
        title,
        url: fullUrl,
        snippet,
        matchedOrgName: parts[1] || "Development Sector Organization",
        source: "devnet_noticeboard",
      });
    });

    return results.slice(0, 15);
  } catch (err) {
    console.warn("[web-search:devnet] Scrape failed:", err);
    return [];
  }
}

/** Searches the web via Google Serper API (if key present) or Yahoo Web Search dorks. */
export async function searchWebDorks(query: string): Promise<DiscoveredWebJob[]> {
  if (query === "devnetjobs") {
    return scrapeDevNetJobsNoticeboard();
  }

  const results: DiscoveredWebJob[] = [];

  // 1. Google Serper API (if configured)
  if (process.env.SERPER_API_KEY) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, gl: "in", num: 15 }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          organic?: Array<{ title: string; link: string; snippet?: string }>;
        };
        for (const item of data.organic ?? []) {
          if (!item.link.startsWith("http")) continue;
          if (/linkedin\.com\/jobs\/|naukri\.com|indeed\.com/i.test(item.link)) continue;
          results.push({
            title: item.title,
            url: item.link,
            snippet: item.snippet || "",
            source: "google_serp",
          });
        }
        return await enrichWithOrgAndDocketStatus(results);
      }
    } catch (err) {
      console.warn("[web-search:serper] Serper API error:", err);
    }
  }

  // 2. Zero-key Yahoo Web Search Dork fallback
  try {
    const res = await fetch(
      `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      const seen = new Set<string>();

      $(".algo").each((_, el) => {
        const rawHref = $(el).find("a").first().attr("href") ?? "";
        const m = rawHref.match(/\/RU=([^/]+)\//);
        const url = m ? decodeURIComponent(m[1]) : rawHref;
        if (!url || !url.startsWith("http") || url.includes("yahoo.com")) return;
        if (seen.has(url)) return;
        seen.add(url);

        // Skip massive general aggregators
        if (/linkedin\.com\/jobs\/|naukri\.com|indeed\.com|shine\.com/i.test(url)) return;

        const titleText = $(el).find("h3 a, .compTitle h3, .compTitle").first().text().replace(/\s+/g, " ").trim();
        const snippet = $(el).find(".compText").text().replace(/\s+/g, " ").trim();

        results.push({
          title: titleText || "Policy Opening",
          url,
          snippet,
          source: "yahoo_dork",
        });
      });
    }
  } catch (err) {
    console.warn("[web-search:yahoo] Yahoo search error:", err);
  }

  return await enrichWithOrgAndDocketStatus(results);
}

/** Matches results against seeded organizations and checks if already in Docket DB. */
async function enrichWithOrgAndDocketStatus(
  items: DiscoveredWebJob[],
): Promise<DiscoveredWebJob[]> {
  try {
    const orgs = await db
      .select({ id: schema.organization.id, slug: schema.organization.slug, name: schema.organization.name, website: schema.organization.website })
      .from(schema.organization);

    const existingJobs = await db
      .select({ url: schema.job.url })
      .from(schema.job);
    const existingUrlSet = new Set(existingJobs.map((j) => j.url.toLowerCase()));

    return items.map((item) => {
      let matchedName: string | undefined;
      let matchedSlug: string | undefined;

      for (const o of orgs) {
        const host = o.website ? o.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0].toLowerCase() : "";
        if (
          (host && item.url.toLowerCase().includes(host)) ||
          item.title.toLowerCase().includes(o.name.toLowerCase().split("(")[0].trim())
        ) {
          matchedName = o.name;
          matchedSlug = o.slug;
          break;
        }
      }

      return {
        ...item,
        matchedOrgName: matchedName,
        matchedOrgSlug: matchedSlug,
        alreadyInDocket: existingUrlSet.has(item.url.toLowerCase()),
      };
    });
  } catch {
    return items;
  }
}

/** Imports a discovered web result into Docket with auto-extracted JD & metadata. */
export async function importWebJob(rawUrl: string, autoPublish = false) {
  const extracted = await extractJobFromUrl(rawUrl);

  const orgs = await db
    .select({ id: schema.organization.id, slug: schema.organization.slug, name: schema.organization.name })
    .from(schema.organization);

  const matched = orgs.find(
    (o) =>
      o.name.toLowerCase() === extracted.orgName.toLowerCase() ||
      extracted.url.toLowerCase().includes(o.slug),
  );

  const { makeFingerprint } = await import("@/lib/classify");
  const fingerprint = makeFingerprint(
    matched?.name || extracted.orgName,
    extracted.title,
    extracted.url,
  );

  const [job] = await db
    .insert(schema.job)
    .values({
      orgId: matched?.id ?? null,
      orgName: matched?.name ?? extracted.orgName,
      fingerprint,
      title: extracted.title,
      url: extracted.url,
      location: extracted.location,
      locationType: extracted.locationType,
      type: extracted.type,
      experience: extracted.experience,
      sectors: extracted.sectors,
      description: extracted.description || null,
      deadline: extracted.deadline,
      postedAt: new Date(),
      status: autoPublish ? "published" : "pending",
    })
    .onConflictDoUpdate({
      target: schema.job.fingerprint,
      set: {
        description: extracted.description || null,
        deadline: extracted.deadline,
        updatedAt: new Date(),
      },
    })
    .returning();

  return job;
}
