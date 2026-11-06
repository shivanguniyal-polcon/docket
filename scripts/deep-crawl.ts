import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import * as cheerio from "cheerio";
import {
  classifyExperience,
  classifyJobType,
  classifyLocationType,
  classifySectors,
  isPolicyRelevant,
  makeFingerprint,
} from "../src/lib/classify";
import type { CrawledJobRecord } from "../src/lib/snapshot-sync";

loadEnv({ path: ".env.local" });

/**
 * Exhaustive Local 5-Layer Deep Crawler (`pnpm crawl:deep`)
 *
 * Layer 1: Direct Enterprise & Startup ATS JSON APIs
 *   - Workday CXS JSON (PwC India, EY India, Gates Foundation, PATH)
 *   - SmartRecruiters JSON (J-PAL South Asia, OECD)
 *   - Ashby / Greenhouse / Lever JSON (Sarvam AI, IDinsight)
 *   - Zoho Recruit Public v2 JSON API (CEEW, Wadhwani Foundation, Swaniti Initiative)
 *   - Kula AI Next.js SSR Boards (Sattva Consulting)
 *   - Manatal Careers-Page Boards (Central Square Foundation)
 *
 * Layer 2: Deep Career Subpage & PDF/ToR Link Crawler (`page_watch`)
 *   - Crawls think-tank & multilateral India career pages and follows individual posting subpages.
 *
 * Layer 3: Development Sector Noticeboard Aggregator (`devnetjobsindia.org`)
 *   - Extracts open public-access policy, M&E, governance, and research ToRs across India.
 *
 * Layer 4: Automated Search Engine Dorking ("Google / Web Search Queries")
 *   - Uses Google Serper (`SERPER_API_KEY`), Google Custom Search (`GOOGLE_CSE_KEY`),
 *     or zero-key throttled Yahoo India / Bing RSS search dorks to uncover unlinked PDFs,
 *     academic RAships (ISB BIPP, NIPFP, IGIDR), and hidden ATS postings.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface SeedOrg {
  slug: string;
  name: string;
  website?: string;
  careersUrl?: string;
  category?: string;
  sectors?: string[];
  hq?: string;
  source?: {
    type: string;
    config: Record<string, unknown>;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function stripHtmlToText(html: string | undefined | null): string {
  if (!html) return "";
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  return $.text().replace(/\s+/g, " ").trim().slice(0, 8000);
}

function createRecordBuilder(org: {
  slug: string;
  name: string;
  hq?: string;
  sectors?: string[];
}) {
  const nowIso = new Date().toISOString();
  return function buildRecord(item: {
    externalId?: string | null;
    title: string;
    url: string;
    location?: string | null;
    description?: string | null;
    deadline?: string | null;
    postedAt?: string | null;
    experienceHint?: string | null;
  }): CrawledJobRecord {
    const loc = item.location || org.hq || "India";
    const desc = (item.description || "").slice(0, 8000);
    const full = `${item.title} ${ item.experienceHint ?? "" } ${desc}`;
    return {
      fingerprint: makeFingerprint(org.name, item.title, item.url),
      orgSlug: org.slug,
      orgName: org.name,
      externalId: item.externalId ?? item.url,
      title: item.title.slice(0, 240),
      url: item.url,
      location: loc,
      locationType: classifyLocationType(`${loc} ${item.title}`),
      type: classifyJobType(full),
      experience: classifyExperience(full),
      sectors: classifySectors(full, (org.sectors ?? []) as never[]),
      description: desc || `${item.title} at ${org.name} (${loc}).`,
      deadline: item.deadline ?? null,
      postedAt: item.postedAt ?? nowIso,
      crawledAt: nowIso,
    };
  };
}

async function crawlOrg(org: SeedOrg): Promise<CrawledJobRecord[]> {
  const src = org.source;
  if (!src) return [];
  const out: CrawledJobRecord[] = [];
  const buildRecord = createRecordBuilder(org);

  // 1. Zoho Recruit Public v2 JSON API (CEEW, Wadhwani Foundation, Swaniti Initiative)
  if (src.type === "zohorecruit") {
    const host = String(src.config.host ?? "");
    const pagename = String(src.config.pagename ?? "Careers");
    if (!host) return [];
    const listUrl = `https://${host}/recruit/v2/public/Job_Openings?pagename=${encodeURIComponent(
      pagename,
    )}&source=CareerSite`;
    const data = await fetchJson<{
      data?: Array<{
        id: string;
        Posting_Title?: string;
        Job_Opening_Name?: string;
        City?: string;
        Country?: string;
        Job_Type?: string;
        $url?: string;
        Publish?: boolean;
      }>;
    }>(listUrl);

    const active = (data.data ?? [])
      .filter((j) => j.Publish !== false)
      .filter((j) => {
        const title = j.Posting_Title || j.Job_Opening_Name || "";
        return isPolicyRelevant(title, org.category);
      })
      .slice(0, 25);

    for (const j of active) {
      const title = j.Posting_Title || j.Job_Opening_Name || "Policy Opening";
      const jobUrl =
        j.$url ||
        `https://${host}/jobs/${pagename}/${j.id}?source=CareerSite`;
      let description = "";
      let expHint = "";
      let loc = [j.City, j.Country].filter((x) => x && x !== "NA").join(", ") || org.hq || "India";

      try {
        const detail = await fetchJson<{
          data?: Array<{
            Job_Description?: string;
            Work_Experience?: string;
            City?: string;
            State?: string;
            Country?: string;
          }>;
        }>(
          `https://${host}/recruit/v2/public/Job_Openings/${j.id}?pagename=${encodeURIComponent(
            pagename,
          )}&source=CareerSite`,
        );
        const d = detail.data?.[0];
        if (d?.Job_Description) {
          description = stripHtmlToText(d.Job_Description);
        }
        if (d?.Work_Experience) {
          expHint = d.Work_Experience;
        }
        const parts = [d?.City, d?.State, d?.Country].filter(
          (x) => x && x !== "NA",
        );
        if (parts.length > 0) loc = parts.join(", ");
      } catch {
        // fallback to list summary
      }

      out.push(
        buildRecord({
          externalId: j.id,
          title,
          url: jobUrl,
          location: loc,
          description,
          experienceHint: expHint,
        }),
      );
    }
    return out;
  }

  // 2. Kula AI Careers Board (Sattva Consulting)
  if (src.type === "kula") {
    const board = String(src.config.board ?? "");
    if (!board) return [];
    const boardUrl = `https://careers.kula.ai/${board}`;
    const html = await fetchHtml(boardUrl);
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const links: Array<{ slugTitle: string; url: string; cardMeta: string }> = [];

    $(`a[href^='/${board}/']`).each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (!href || seen.has(href)) return;
      seen.add(href);
      const slugPart = href.replace(`/${board}/`, "").replace(/^\d+-/, "");
      const slugTitle = slugPart
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      const cardMeta = $(el).parent().parent().text().replace(/\s+/g, " ").trim();
      if (!isPolicyRelevant(`${slugTitle} ${cardMeta}`, org.category)) return;
      links.push({
        slugTitle,
        url: `https://careers.kula.ai${href}`,
        cardMeta,
      });
    });

    for (const l of links.slice(0, 22)) {
      let title = l.slugTitle;
      let description = l.cardMeta;
      let location = org.hq ?? "Bengaluru / Mumbai / New Delhi, India";
      try {
        const subHtml = await fetchHtml(l.url);
        const $d = cheerio.load(subHtml);
        const pageTitle = $d("title").text().split("|")[0]?.trim();
        if (pageTitle && pageTitle.length > 4) title = pageTitle;
        $d("script, style, nav, footer").remove();
        description = $d("main, body")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
        const locMatch = description.match(
          /Location:\s*([A-Za-z ,/]+?)(?:Business Unit|Employment|Work type|$)/i,
        );
        if (locMatch?.[1]) location = `${locMatch[1].trim()}, India`;
      } catch {
        // fallback to card metadata
      }
      out.push(
        buildRecord({
          externalId: l.url,
          title,
          url: l.url,
          location,
          description,
        }),
      );
    }
    return out;
  }

  // 3. Manatal Careers-Page Board (Central Square Foundation)
  if (src.type === "manatal") {
    const slug = String(src.config.slug ?? "");
    if (!slug) return [];
    const boardUrl = `https://www.careers-page.com/${slug}`;
    const html = await fetchHtml(boardUrl);
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const links: Array<{ title: string; url: string }> = [];

    $("a[href*='/job/']").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href") ?? "";
      if (!href || text.toLowerCase() === "apply" || text.length < 5) return;
      const fullUrl = new URL(href, "https://www.careers-page.com").toString();
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      if (!isPolicyRelevant(text, org.category)) return;
      links.push({ title: text, url: fullUrl });
    });

    for (const l of links.slice(0, 20)) {
      let description = "";
      try {
        const subHtml = await fetchHtml(l.url);
        const $d = cheerio.load(subHtml);
        $d("script, style, nav, footer, iframe").remove();
        description = $d("main, body")
          .first()
          .text()
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
      } catch {
        // ignore
      }
      out.push(
        buildRecord({
          externalId: l.url,
          title: l.title,
          url: l.url,
          location: org.hq ?? "New Delhi, India",
          description,
        }),
      );
    }
    return out;
  }

  // 4. Ashby
  if (src.type === "ashby") {
    const board = String(src.config.board ?? "");
    const data = await fetchJson<{
      jobs?: Array<{
        id: string;
        title: string;
        location?: string;
        jobUrl?: string;
        descriptionPlain?: string;
        descriptionHtml?: string;
        publishedAt?: string;
      }>;
    }>(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`,
    );
    for (const j of data.jobs ?? []) {
      if (!isPolicyRelevant(j.title, org.category)) continue;
      out.push(
        buildRecord({
          externalId: j.id,
          title: j.title,
          url: j.jobUrl ?? `https://jobs.ashbyhq.com/${board}/${j.id}`,
          location: j.location,
          description: j.descriptionPlain || stripHtmlToText(j.descriptionHtml),
          postedAt: j.publishedAt,
        }),
      );
    }
    return out;
  }

  // 5. Greenhouse
  if (src.type === "greenhouse") {
    const board = String(src.config.board ?? "");
    const data = await fetchJson<{
      jobs?: Array<{
        id: number;
        title: string;
        absolute_url: string;
        location?: { name?: string };
        content?: string;
        updated_at?: string;
      }>;
    }>(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
        board,
      )}/jobs?content=true`,
    );
    for (const j of data.jobs ?? []) {
      if (!isPolicyRelevant(j.title, org.category)) continue;
      out.push(
        buildRecord({
          externalId: String(j.id),
          title: j.title,
          url: j.absolute_url,
          location: j.location?.name,
          description: stripHtmlToText(j.content),
          postedAt: j.updated_at,
        }),
      );
    }
    return out;
  }

  // 6. Lever
  if (src.type === "lever") {
    const site = String(src.config.site ?? "");
    const data = await fetchJson<
      Array<{
        id: string;
        text: string;
        hostedUrl: string;
         descriptionPlain?: string;
        categories?: { location?: string };
      }>
    >(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`);
    for (const j of data ?? []) {
      if (!isPolicyRelevant(j.text, org.category)) continue;
      out.push(
        buildRecord({
          externalId: j.id,
          title: j.text,
          url: j.hostedUrl,
          location: j.categories?.location,
          description: j.descriptionPlain,
        }),
      );
    }
    return out;
  }

  // 7. SmartRecruiters
  if (src.type === "smartrecruiters") {
    const company = String(src.config.company ?? "");
    const data = await fetchJson<{
      content?: Array<{
        id: string;
        name: string;
        releasedDate?: string;
        location?: { city?: string; country?: string };
      }>;
    }>(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
        company,
      )}/postings?limit=40`,
    );
    for (const j of (data.content ?? []).slice(0, 15)) {
      if (!isPolicyRelevant(j.name, org.category)) continue;
      let description = "";
      try {
        const detail = await fetchJson<{
          jobAd?: {
            sections?: {
              jobDescription?: { text?: string };
              qualifications?: { text?: string };
            };
          };
        }>(
          `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(
            company,
          )}/postings/${encodeURIComponent(j.id)}`,
        );
        description = stripHtmlToText(
          `${detail.jobAd?.sections?.jobDescription?.text ?? ""} ${
            detail.jobAd?.sections?.qualifications?.text ?? ""
          }`,
        );
      } catch {
        // ignore
      }
      out.push(
        buildRecord({
          externalId: j.id,
          title: j.name,
          url: `https://jobs.smartrecruiters.com/${company}/${j.id}`,
          location: [j.location?.city, j.location?.country]
            .filter(Boolean)
            .join(", "),
          description,
          postedAt: j.releasedDate,
        }),
      );
    }
    return out;
  }

  // 8. Workday
  if (src.type === "workday") {
    const host = String(src.config.host ?? "");
    const tenant = String(src.config.tenant ?? "");
    const site = String(src.config.site ?? "");
    const searchText = String(src.config.searchText ?? "India Policy");
    const endpoint = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
    const data = await fetchJson<{
      jobPostings?: Array<{
        title: string;
        externalPath: string;
        locationsText?: string;
        bulletFields?: string[];
      }>;
    }>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appliedFacets: {},
        limit: 20,
        offset: 0,
        searchText,
      }),
    });

    const relevant = (data.jobPostings ?? [])
      .filter((j) => isPolicyRelevant(j.title, org.category))
      .slice(0, 12);
    for (const j of relevant) {
      let description = (j.bulletFields ?? []).join(" · ");
      let location = j.locationsText ?? org.hq ?? "India";
      try {
        const detail = await fetchJson<{
          jobPostingInfo?: { jobDescription?: string; location?: string };
        }>(`https://${host}/wday/cxs/${tenant}/${site}${j.externalPath}`);
        if (detail.jobPostingInfo?.jobDescription) {
          description = stripHtmlToText(detail.jobPostingInfo.jobDescription);
        }
        if (detail.jobPostingInfo?.location) {
          location = detail.jobPostingInfo.location;
        }
      } catch {
        // fallback
      }
      out.push(
        buildRecord({
          externalId: j.externalPath,
          title: j.title,
          url: `https://${host}/en-US/${site}${j.externalPath}`,
          location,
          description,
        }),
      );
    }
    return out;
  }

  // 9. Deep Career Subpage Watcher (`page_watch`)
  if (src.type === "page_watch") {
    const url = String(src.config.url ?? org.careersUrl ?? "");
    if (!url) return [];
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const baseHost = new URL(url).hostname.replace(/^www\./, "");
    const seen = new Set<string>();
    const links: Array<{ title: string; url: string }> = [];

    $("a[href]").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href")?.trim() ?? "";
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      if (text.length < 8 || text.length > 130) return;
      if (!isPolicyRelevant(text, org.category)) return;
      if (
        /\b(about|our team|contact|privacy|terms|login|subscribe|read more|learn more|cookie|view all|home|blog|events|publications|podcasts|press)\b/i.test(
          text,
        )
      ) {
        return;
      }
      try {
        const resolved = new URL(href, url).toString();
        const targetHost = new URL(resolved).hostname.replace(/^www\./, "");
        if (
          targetHost !== baseHost &&
          !targetHost.includes("ashbyhq") &&
          !targetHost.includes("greenhouse") &&
          !targetHost.includes("lever.co") &&
          !targetHost.includes("workday") &&
          !targetHost.includes("keka") &&
          !targetHost.includes("darwinbox") &&
          !targetHost.includes("zohorecruit") &&
          !targetHost.includes("kula.ai") &&
          !targetHost.includes("careers-page.com")
        ) {
          return;
        }
        if (resolved === url || seen.has(resolved)) return;
        if (
          !/(\/career|\/job|\/work-with-us|\/opening|\/position|\/vacancy|\/fellow|\.pdf)/i.test(
            resolved,
          )
        ) {
          return;
        }
        seen.add(resolved);
        links.push({ title: text, url: resolved });
      } catch {
        // ignore
      }
    });

    for (const l of links.slice(0, 10)) {
      let description = "";
      if (!l.url.toLowerCase().endsWith(".pdf")) {
        try {
          const subHtml = await fetchHtml(l.url);
          const sub$ = cheerio.load(subHtml);
          sub$("script, style, noscript, nav, header, footer").remove();
          description = sub$(
            "article, main, [class*='job'], .entry-content, .post-content, body",
          )
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 8000);
        } catch {
          // ignore
        }
      }
      out.push(
        buildRecord({
          externalId: l.url,
          title: l.title,
          url: l.url,
          location: org.hq ?? "India",
          description,
        }),
      );
    }
  }

  return out;
}

/**
 * Layer 3: Development Sector Noticeboard Aggregator (`devnetjobsindia.org`)
 * Captures open public-access policy, M&E, public finance, governance & research ToRs.
 */
async function crawlDevNetJobsIndia(orgs: SeedOrg[]): Promise<CrawledJobRecord[]> {
  const out: CrawledJobRecord[] = [];
  try {
    const html = await fetchHtml("https://www.devnetjobsindia.org/");
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const candidates: Array<{ title: string; url: string }> = [];

    $("a[href*='jobdescription.aspx']").each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      const href = $(el).attr("href") ?? "";
      if (!href || text.length < 8) return;
      const fullUrl = new URL(href, "https://www.devnetjobsindia.org/").toString();
      if (seen.has(fullUrl)) return;
      seen.add(fullUrl);
      if (!isPolicyRelevant(text)) return;
      candidates.push({ title: text, url: fullUrl });
    });

    // Pick a fallback seeded organization slug or match by name
    const defaultOrg =
      orgs.find((o) => o.slug === "ipe-global") || orgs[0];

    for (const c of candidates.slice(0, 12)) {
      let description = c.title;
      let location = "India";
      try {
        const subHtml = await fetchHtml(c.url);
        const $d = cheerio.load(subHtml);
        $d("script, style, nav, footer").remove();
        description = $d("body")
          .text()
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
        const locMatch = description.match(/Location:\s*([A-Za-z ,/]+?)(?:Apply by|Last Date|Email|$)/i);
        if (locMatch?.[1]) location = locMatch[1].trim();
      } catch {
        // fallback
      }

      const matchedOrg =
        orgs.find((o) =>
          description.toLowerCase().includes(o.name.toLowerCase().split("(")[0].trim()),
        ) ?? defaultOrg;

      const build = createRecordBuilder(matchedOrg);
      out.push(
        build({
          externalId: c.url,
          title: c.title,
          url: c.url,
          location,
          description,
        }),
      );
    }
  } catch {
    // ignore aggregator error
  }
  return out;
}

/**
 * Layer 4: Automated Search Engine Dorking ("Google / Web Search Queries")
 * Uses SERPER_API_KEY (Google SERP JSON) if present, or falls back to throttled
 * Yahoo India Search dorks to uncover unlinked PDFs, ToRs, and academic RAships.
 */
async function crawlSearchDorks(orgs: SeedOrg[]): Promise<CrawledJobRecord[]> {
  const out: CrawledJobRecord[] = [];
  const dorkQueries = [
    'site:keka.com "Public Policy" OR "Research Associate" OR "Government Advisory" India',
    'site:careers-page.com "Foundation" OR "Policy" OR "Governance" India',
    '"Research Associate" "Public Policy" ("ISB" OR "IIM" OR "NIPFP" OR "IGIDR" OR "CSEP") apply',
  ];

  const defaultOrg = orgs.find((o) => o.slug === "csep") ?? orgs[0];

  for (const q of dorkQueries) {
    try {
      const results: Array<{ title: string; url: string; snippet: string }> = [];

      if (process.env.SERPER_API_KEY) {
        // Direct Google Search via Serper.dev
        const data = await fetchJson<{
          organic?: Array<{ title: string; link: string; snippet?: string }>;
        }>("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": process.env.SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q, gl: "in", num: 10 }),
        });
        for (const item of data.organic ?? []) {
          results.push({
            title: item.title,
            url: item.link,
            snippet: item.snippet ?? "",
          });
        }
      } else {
        // Zero-key fallback: Throttled Yahoo India Search Dork
        await sleep(600);
        const html = await fetchHtml(
          `https://in.search.yahoo.com/search?p=${encodeURIComponent(q)}`,
        );
        const $ = cheerio.load(html);
        $(".compTitle a").slice(0, 6).each((_, el) => {
          const rawTitle = $(el).text().replace(/\s+/g, " ").trim();
          const rawHref = $(el).attr("href") ?? "";
          const m = rawHref.match(/\/RU=([^/]+)\//);
          const decodedUrl = m ? decodeURIComponent(m[1]) : rawHref;
          const snippet = $(el)
            .closest(".algo")
            .find(".compText")
            .text()
            .replace(/\s+/g, " ")
            .trim();
          if (decodedUrl.startsWith("http")) {
            results.push({ title: rawTitle, url: decodedUrl, snippet });
          }
        });
      }

      for (const r of results) {
        if (!isPolicyRelevant(`${r.title} ${r.snippet}`)) continue;
        // Skip generic homepages or LinkedIn search directories
        if (
          /linkedin\.com\/jobs\/|allgovernmentjobs\.in|naukri\.com|indeed\.com/i.test(
            r.url,
          )
        ) {
          continue;
        }
        if (
          !/(\/job|\/career|\/work-at|\/opening|\/vacancy|research-associate|fellow|\.pdf)/i.test(
            r.url,
          )
        ) {
          continue;
        }

        const matchedOrg =
          orgs.find((o) => {
            const host = o.website ? new URL(o.website).hostname.replace(/^www\./, "") : "";
            return (
              (host && r.url.includes(host)) ||
              r.title.toLowerCase().includes(o.name.toLowerCase().split("(")[0].trim())
            );
          }) ?? defaultOrg;

        let cleanTitle = r.title
          .replace(/^www\.[^\s]+›[^\s]+/i, "")
          .split("|")[0]
          .split(" - ")[0]
          .trim();
        if (cleanTitle.length < 6) cleanTitle = r.title.slice(0, 120);

        const build = createRecordBuilder(matchedOrg);
        out.push(
          build({
            externalId: r.url,
            title: cleanTitle,
            url: r.url,
            location: matchedOrg.hq ?? "India",
            description: r.snippet || cleanTitle,
          }),
        );
      }
    } catch {
      // ignore search dork rate-limit
    }
  }
  return out;
}

async function main() {
  const orgsPath = join(process.cwd(), "seed/organizations.json");
  const snapshotPath = join(process.cwd(), "seed/crawled-jobs.json");
  const orgs = JSON.parse(readFileSync(orgsPath, "utf8")) as SeedOrg[];

  // Preserve existing verified snapshot records
  const existingMap = new Map<string, CrawledJobRecord>();
  if (existsSync(snapshotPath)) {
    try {
      const prev = JSON.parse(
        readFileSync(snapshotPath, "utf8"),
      ) as CrawledJobRecord[];
      for (const r of prev) {
        if (isPolicyRelevant(r.title)) existingMap.set(r.fingerprint, r);
      }
    } catch {
      // start fresh
    }
  }

  console.log(
    `🔎 [Layer 1 & 2] Crawling ${orgs.length} organizations (Workday, Zoho Recruit, Kula, Manatal, Ashby, SmartRecruiters & Deep HTML)...`,
  );
  let newlyFound = 0;

  for (const org of orgs) {
    try {
      const records = await crawlOrg(org);
      if (records.length > 0) {
        console.log(
          `  ✓ ${org.name} [${org.source?.type}]: ${records.length} policy openings extracted`,
        );
      }
      for (const r of records) {
        if (!existingMap.has(r.fingerprint)) newlyFound++;
        existingMap.set(r.fingerprint, r);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  · ${org.name}: skipped (${msg.slice(0, 60)})`);
    }
  }

  console.log(`🌐 [Layer 3] Crawling DevNetJobsIndia policy & M&E noticeboard...`);
  const devNetRecords = await crawlDevNetJobsIndia(orgs);
  console.log(`  ✓ DevNetJobsIndia: ${devNetRecords.length} policy ToRs & openings extracted`);
  for (const r of devNetRecords) {
    if (!existingMap.has(r.fingerprint)) newlyFound++;
    existingMap.set(r.fingerprint, r);
  }

  console.log(`🔎 [Layer 4] Running Search Engine Dork Queries (Google/Yahoo SERP)...`);
  const dorkRecords = await crawlSearchDorks(orgs);
  console.log(`  ✓ Search Engine Dorks: ${dorkRecords.length} hidden/PDF openings discovered`);
  for (const r of dorkRecords) {
    if (!existingMap.has(r.fingerprint)) newlyFound++;
    existingMap.set(r.fingerprint, r);
  }

  const allRecords = Array.from(existingMap.values());
  writeFileSync(snapshotPath, JSON.stringify(allRecords, null, 2), "utf8");
  console.log(
    `\n📦 Saved ${allRecords.length} verified policy openings (${newlyFound} new) to seed/crawled-jobs.json`,
  );
}

main().catch((err) => {
  console.error("Crawl failed:", err);
  process.exit(1);
});
