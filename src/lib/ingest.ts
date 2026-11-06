import { createHash } from "crypto";
import * as cheerio from "cheerio";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  classifyExperience,
  classifyJobType,
  classifyLocationType,
  classifySectors,
  isPolicyRelevant,
  makeFingerprint,
} from "@/lib/classify";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface RawPosting {
  externalId?: string;
  title: string;
  url: string;
  location?: string | null;
  description?: string | null;
  postedAt?: Date | null;
  deadline?: string | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function stripHtml(html: string | undefined | null): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim().slice(0, 4000);
}

/* -------------------------------------------------------------------------- */
/*                               ATS Adapters                                 */
/* -------------------------------------------------------------------------- */

async function fetchGreenhouse(config: Record<string, unknown>): Promise<RawPosting[]> {
  const board = String(config.board ?? "");
  if (!board) return [];
  const data = await fetchJson<{
    jobs?: Array<{
      id: number;
      title: string;
      absolute_url: string;
      location?: { name?: string };
      content?: string;
      updated_at?: string;
      departments?: Array<{ name?: string }>;
    }>;
  }>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);

  return (data.jobs ?? [])
    .filter((j) =>
      isPolicyRelevant(
        j.title,
        j.departments?.map((d) => d.name).join(" ") ?? "",
      ),
    )
    .map((j) => ({
      externalId: String(j.id),
      title: j.title,
      url: j.absolute_url,
      location: j.location?.name ?? null,
      description: stripHtml(j.content),
      postedAt: j.updated_at ? new Date(j.updated_at) : null,
    }));
}

async function fetchLever(config: Record<string, unknown>): Promise<RawPosting[]> {
  const company = String(config.company ?? "");
  if (!company) return [];
  const data = await fetchJson<
    Array<{
      id: string;
      text: string;
      hostedUrl: string;
      categories?: { location?: string; team?: string };
      descriptionPlain?: string;
      createdAt?: number;
    }>
  >(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);

  return (data ?? [])
    .filter((j) => isPolicyRelevant(j.text, j.categories?.team ?? ""))
    .map((j) => ({
    externalId: j.id,
    title: j.text,
    url: j.hostedUrl,
    location: j.categories?.location ?? null,
    description: (j.descriptionPlain ?? "").slice(0, 4000),
    postedAt: j.createdAt ? new Date(j.createdAt) : null,
  }));
}

async function fetchAshby(config: Record<string, unknown>): Promise<RawPosting[]> {
  const org = String(config.org ?? "");
  if (!org) return [];
  const data = await fetchJson<{
    jobs?: Array<{
      id?: string;
      title: string;
      jobUrl: string;
      location?: string;
      department?: string;
      descriptionPlain?: string;
      publishedAt?: string;
    }>;
  }>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(org)}`);

  return (data.jobs ?? [])
    .filter((j) => isPolicyRelevant(j.title, j.department ?? ""))
    .map((j) => ({
    externalId: j.id ?? j.jobUrl,
    title: j.title,
    url: j.jobUrl,
    location: j.location ?? null,
    description: (j.descriptionPlain ?? "").slice(0, 4000),
    postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
  }));
}

async function fetchSmartRecruiters(
  config: Record<string, unknown>,
): Promise<RawPosting[]> {
  const company = String(config.company ?? "");
  if (!company) return [];
  const data = await fetchJson<{
    content?: Array<{
      id: string;
      name: string;
      ref?: string;
      location?: { city?: string; country?: string };
      releasedDate?: string;
    }>;
  }>(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings?limit=15`,
  );

  const items: RawPosting[] = [];
  for (const j of (data.content ?? []).slice(0, 12)) {
    let description = "";
    try {
      const detail = await fetchJson<{
        jobAd?: {
          sections?: {
            jobDescription?: { text?: string };
            qualifications?: { text?: string };
            additionalInformation?: { text?: string };
          };
        };
      }>(
        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(j.id)}`,
      );
      const s = detail.jobAd?.sections;
      const combinedHtml = [
        s?.jobDescription?.text,
        s?.qualifications?.text,
        s?.additionalInformation?.text,
      ]
        .filter(Boolean)
        .join("\n\n");
      description = stripHtml(combinedHtml);
    } catch {
      // fallback if detail endpoint fails
    }

    items.push({
      externalId: j.id,
      title: j.name,
      url: `https://jobs.smartrecruiters.com/${company}/${j.id}`,
      location:
        [j.location?.city, j.location?.country].filter(Boolean).join(", ") ||
        null,
      description: description || null,
      postedAt: j.releasedDate ? new Date(j.releasedDate) : null,
    });
  }
  return items;
}

async function fetchWorkday(config: Record<string, unknown>): Promise<RawPosting[]> {
  const host = String(config.host ?? "");
  const tenant = String(config.tenant ?? "");
  const site = String(config.site ?? "");
  if (!host || !tenant || !site) return [];

  const searchText = String(config.searchText ?? "policy");
  const endpoint = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  const data = await fetchJson<{
    jobPostings?: Array<{
      title: string;
      externalPath: string;
      locationsText?: string;
      postedOn?: string;
      bulletFields?: string[];
    }>;
  }>(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appliedFacets: {},
      limit: 15,
      offset: 0,
      searchText,
    }),
  });

  const relevant = (data.jobPostings ?? [])
    .filter((j) => isPolicyRelevant(j.title) && Boolean(j.externalPath))
    .slice(0, 12);

  const items: RawPosting[] = [];
  for (const j of relevant) {
    let description = (j.bulletFields ?? []).join(" · ");
    let location = j.locationsText ?? null;
    try {
      const detail = await fetchJson<{
        jobPostingInfo?: {
          jobDescription?: string;
          location?: string;
        };
      }>(`https://${host}/wday/cxs/${tenant}/${site}${j.externalPath}`);
      if (detail.jobPostingInfo?.jobDescription) {
        description = stripHtml(detail.jobPostingInfo.jobDescription);
      }
      if (detail.jobPostingInfo?.location) {
        location = detail.jobPostingInfo.location;
      }
    } catch {
      // keep bulletFields fallback
    }

    items.push({
      externalId: j.externalPath,
      title: j.title,
      url: `https://${host}/en-US/${site}${j.externalPath}`,
      location,
      description,
    });
  }
  return items;
}

async function fetchRss(config: Record<string, unknown>): Promise<RawPosting[]> {
  const url = String(config.url ?? "");
  if (!url) return [];
  const xml = await fetchText(url);
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RawPosting[] = [];

  $("item, entry").each((_, el) => {
    const title = $(el).find("title").first().text().trim();
    const link =
      $(el).find("link").first().text().trim() ||
      $(el).find("link").first().attr("href") ||
      "";
    const desc = stripHtml(
      $(el).find("description, summary, content").first().text(),
    );
    const pubDate = $(el).find("pubDate, published, updated").first().text().trim();
    if (title && link) {
      items.push({
        externalId: link,
        title,
        url: link,
        description: desc,
        postedAt: pubDate ? new Date(pubDate) : null,
      });
    }
  });
  return items.slice(0, 40);
}

/* -------------------------------------------------------------------------- */
/*                           Page-watch change monitor                        */
/* -------------------------------------------------------------------------- */

const JOB_TITLE_REGEX =
  /\b(fellow|fellowship|intern|internship|associate|analyst|consultant|manager|researcher|research assistant|director|specialist|officer|lead|coordinator|economist|advisor|counsel)\b/i;
const NAV_NOISE_REGEX =
  /\b(about us|our team|contact|privacy|terms|login|sign in|subscribe|read more|learn more|cookie|back to|view all|home|blog|events|publications|podcasts|press)\b/i;

async function extractOpeningsFromHtml(
  $: cheerio.CheerioAPI,
  baseUrl: string,
): Promise<RawPosting[]> {
  const candidates: Array<{ title: string; url: string }> = [];
  const seenUrls = new Set<string>();
  const baseHost = new URL(baseUrl).hostname.replace(/^www\./, "");

  $("a[href]").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const href = $(el).attr("href")?.trim() ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) {
      return;
    }
    if (text.length < 8 || text.length > 120) return;
    if (!JOB_TITLE_REGEX.test(text) || NAV_NOISE_REGEX.test(text)) return;

    try {
      const resolved = new URL(href, baseUrl).toString();
      const targetHost = new URL(resolved).hostname.replace(/^www\./, "");
      if (
        targetHost !== baseHost &&
        !targetHost.includes("ashbyhq") &&
        !targetHost.includes("greenhouse") &&
        !targetHost.includes("lever.co") &&
        !targetHost.includes("workday") &&
        !targetHost.includes("keka") &&
        !targetHost.includes("darwinbox") &&
        !targetHost.includes("zohorecruit")
      ) {
        return;
      }
      if (resolved === baseUrl || seenUrls.has(resolved)) return;
      // Must look like a job detail path or PDF ToR
      if (!/(\/career|\/job|\/work-with-us|\/opening|\/position|\/vacancy|\/fellow|\.pdf)/i.test(resolved)) {
        return;
      }
      seenUrls.add(resolved);
      candidates.push({ title: text, url: resolved });
    } catch {
      // ignore invalid URLs
    }
  });

  const postings: RawPosting[] = [];
  for (const c of candidates.slice(0, 6)) {
    let description = "";
    if (!c.url.toLowerCase().endsWith(".pdf")) {
      try {
        const subHtml = await fetchText(c.url);
        const sub$ = cheerio.load(subHtml);
        sub$("script, style, noscript, nav, header, footer").remove();
        description = sub$("article, main, .entry-content, .post-content, body")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
      } catch {
        // fallback to title only
      }
    }
    postings.push({
      externalId: c.url,
      title: c.title,
      url: c.url,
      description: description || null,
    });
  }
  return postings;
}

async function runPageWatch(
  src: typeof schema.source.$inferSelect,
  org: typeof schema.organization.$inferSelect,
): Promise<{ changed: boolean; addedLines: string[]; inserted: number }> {
  const url = String(src.config?.url ?? "");
  if (!url) return { changed: false, addedLines: [], inserted: 0 };

  const html = await fetchText(url);
  const $ = cheerio.load(html);

  // Extract real job links and their JDs before stripping DOM
  const extractedPostings = await extractOpeningsFromHtml($, url);
  let inserted = 0;
  for (const item of extractedPostings) {
    const fingerprint = makeFingerprint(org.name, item.title, item.url);
    const fullText = `${item.title} ${item.description ?? ""}`;
    const res = await db
      .insert(schema.job)
      .values({
        orgId: org.id,
        orgName: org.name,
        sourceId: src.id,
        externalId: item.externalId ?? null,
        fingerprint,
        title: item.title,
        url: item.url,
        location: org.hq ?? "India",
        locationType: classifyLocationType(org.hq, item.description ?? ""),
        type: classifyJobType(item.title, item.description ?? ""),
        experience: classifyExperience(item.title, item.description ?? ""),
        sectors: classifySectors(fullText, org.sectors),
        description: item.description ?? null,
        postedAt: new Date(),
        status: "published",
      })
      .onConflictDoNothing({ target: schema.job.fingerprint })
      .returning({ id: schema.job.id });
    if (res.length > 0) inserted++;
  }

  $("script, style, noscript, svg, nav, footer").remove();

  const selector =
    typeof src.config?.selector === "string" && src.config.selector
      ? src.config.selector
      : "main, body";
  const lines = $(selector)
    .text()
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 12 && l.length <= 240);

  const uniqueLines = Array.from(new Set(lines)).slice(0, 300);
  const snapshot = uniqueLines.join("\n");
  const hash = createHash("sha256").update(snapshot).digest("hex").slice(0, 32);

  if (!src.lastHash) {
    await db
      .update(schema.source)
      .set({
        lastRunAt: new Date(),
        lastStatus: "ok",
        lastError: null,
        lastHash: hash,
        lastSnapshot: snapshot,
      })
      .where(eq(schema.source.id, src.id));
    return { changed: false, addedLines: [], inserted };
  }

  if (src.lastHash === hash) {
    await db
      .update(schema.source)
      .set({ lastRunAt: new Date(), lastStatus: "ok", lastError: null })
      .where(eq(schema.source.id, src.id));
    return { changed: false, addedLines: [], inserted };
  }

  const oldSet = new Set((src.lastSnapshot ?? "").split("\n"));
  const addedLines = uniqueLines.filter((l) => !oldSet.has(l)).slice(0, 30);

  if (addedLines.length > 0) {
    await db.insert(schema.pageChange).values({
      sourceId: src.id,
      addedText: addedLines.join("\n"),
      status: "open",
    });
  }

  await db
    .update(schema.source)
    .set({
      lastRunAt: new Date(),
      lastStatus: addedLines.length > 0 ? "changed" : "ok",
      lastError: null,
      lastHash: hash,
      lastSnapshot: snapshot,
    })
    .where(eq(schema.source.id, src.id));

  return { changed: addedLines.length > 0, addedLines, inserted };
}

/* -------------------------------------------------------------------------- */
/*                              Source runner                                 */
/* -------------------------------------------------------------------------- */

export interface SourceRunResult {
  sourceId: string;
  orgName: string;
  type: string;
  status: "ok" | "changed" | "error";
  inserted: number;
  error?: string;
}

export async function runSourceById(sourceId: string): Promise<SourceRunResult> {
  const [row] = await db
    .select({
      source: schema.source,
      org: schema.organization,
    })
    .from(schema.source)
    .innerJoin(
      schema.organization,
      eq(schema.organization.id, schema.source.orgId),
    )
    .where(eq(schema.source.id, sourceId))
    .limit(1);

  if (!row) {
    return {
      sourceId,
      orgName: "Unknown",
      type: "unknown",
      status: "error",
      inserted: 0,
      error: "Source not found",
    };
  }

  const { source: src, org } = row;
  try {
    if (src.type === "page_watch") {
      const res = await runPageWatch(src, org);
      return {
        sourceId: src.id,
        orgName: org.name,
        type: src.type,
        status: res.changed ? "changed" : "ok",
        inserted: res.inserted,
      };
    }

    let raw: RawPosting[] = [];
    if (src.type === "greenhouse") raw = await fetchGreenhouse(src.config);
    else if (src.type === "lever") raw = await fetchLever(src.config);
    else if (src.type === "ashby") raw = await fetchAshby(src.config);
    else if (src.type === "smartrecruiters")
      raw = await fetchSmartRecruiters(src.config);
    else if (src.type === "workday") raw = await fetchWorkday(src.config);
    else if (src.type === "rss") raw = await fetchRss(src.config);

    let inserted = 0;
    for (const item of raw) {
      const fingerprint = makeFingerprint(org.name, item.title, item.url);
      const fullText = `${item.title} ${item.description ?? ""}`;
      const sectors = classifySectors(fullText, org.sectors);
      const type = classifyJobType(item.title, item.description ?? "");
      const experience = classifyExperience(item.title, item.description ?? "");
      const locationType = classifyLocationType(
        item.location,
        item.description ?? "",
      );

      const res = await db
        .insert(schema.job)
        .values({
          orgId: org.id,
          orgName: org.name,
          sourceId: src.id,
          externalId: item.externalId ?? null,
          fingerprint,
          title: item.title,
          url: item.url,
          location: item.location ?? org.hq ?? "India",
          locationType,
          type,
          experience,
          sectors,
          description: item.description ?? null,
          postedAt: item.postedAt ?? new Date(),
          status: src.autoPublish ? "published" : "pending",
        })
        .onConflictDoNothing({ target: schema.job.fingerprint })
        .returning({ id: schema.job.id });

      if (res.length > 0) inserted++;
    }

    await db
      .update(schema.source)
      .set({ lastRunAt: new Date(), lastStatus: "ok", lastError: null })
      .where(eq(schema.source.id, src.id));

    return {
      sourceId: src.id,
      orgName: org.name,
      type: src.type,
      status: "ok",
      inserted,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.source)
      .set({ lastRunAt: new Date(), lastStatus: "error", lastError: msg })
      .where(eq(schema.source.id, src.id));
    return {
      sourceId: src.id,
      orgName: org.name,
      type: src.type,
      status: "error",
      inserted: 0,
      error: msg,
    };
  }
}

export async function runAllEnabledSources(limit = 60): Promise<SourceRunResult[]> {
  const sources = await db
    .select({ id: schema.source.id, type: schema.source.type })
    .from(schema.source)
    .where(eq(schema.source.enabled, true));

  // Prioritize structured ATS API feeds before page_watch monitors
  sources.sort((a, b) => {
    const aIsApi = a.type !== "page_watch" ? 0 : 1;
    const bIsApi = b.type !== "page_watch" ? 0 : 1;
    return aIsApi - bIsApi;
  });

  const results: SourceRunResult[] = [];
  for (const s of sources.slice(0, limit)) {
    results.push(await runSourceById(s.id));
  }
  return results;
}
