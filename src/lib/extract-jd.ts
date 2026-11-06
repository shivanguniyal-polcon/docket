import * as cheerio from "cheerio";
import {
  classifyExperience,
  classifyJobType,
  classifyLocationType,
  classifySectors,
} from "@/lib/classify";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface ExtractedJD {
  title: string;
  orgName: string;
  location: string;
  locationType: string;
  type: string;
  experience: string;
  sectors: string[];
  deadline: string | null;
  description: string;
  url: string;
}

function cleanText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToCleanText(htmlStr: string): string {
  if (!htmlStr) return "";
  const withBreaks = htmlStr
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ");
  const $ = cheerio.load(withBreaks);
  return cleanText($.text());
}

/**
 * Fetches a live job URL and extracts its actual Job Description (JD) and
 * structured metadata using:
 *  1. Workday / Ashby / Greenhouse / Lever / SmartRecruiters API detection
 *  2. Schema.org `JobPosting` JSON-LD blocks
 *  3. OpenGraph / meta tags + main article / job body extraction
 */
export async function extractJobFromUrl(rawUrl: string): Promise<ExtractedJD> {
  const urlObj = new URL(rawUrl.trim());
  const url = urlObj.toString();

  // 1. Special handling for Workday URLs (SPA pages whose HTML has no body text)
  // Pattern: https://<tenant>.wd3.myworkdayjobs.com/(en-US/)?<site>/job/<path>
  if (urlObj.hostname.endsWith("myworkdayjobs.com")) {
    const tenant = urlObj.hostname.split(".")[0];
    const parts = urlObj.pathname.split("/").filter(Boolean);
    const jobIdx = parts.indexOf("job");
    if (jobIdx >= 1) {
      const site = parts[jobIdx - 1];
      const jobPath = "/" + parts.slice(jobIdx).join("/");
      const apiUrl = `https://${urlObj.hostname}/wday/cxs/${tenant}/${site}${jobPath}`;
      const res = await fetch(apiUrl, {
        headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          jobPostingInfo?: {
            title?: string;
            jobDescription?: string;
            location?: string;
            endDate?: string;
          };
        };
        const info = data.jobPostingInfo ?? {};
        const desc = htmlToCleanText(info.jobDescription ?? "").slice(0, 8000);
        const title = info.title ?? "Policy Opening";
        const orgName = tenant.toUpperCase();
        const location = info.location ?? "India";
        return {
          title,
          orgName,
          location,
          locationType: classifyLocationType(location, desc),
          type: classifyJobType(title, desc),
          experience: classifyExperience(title, desc),
          sectors: classifySectors(`${title} ${desc}`),
          deadline: info.endDate ? info.endDate.slice(0, 10) : null,
          description: desc,
          url,
        };
      }
    }
  }

  // 2. Standard HTML fetch
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`Could not fetch URL (HTTP ${res.status})`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let title = "";
  let orgName = "";
  let location = "";
  let deadline: string | null = null;
  let description = "";

  // 2a. Look for Schema.org JobPosting JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
          ? parsed["@graph"]
          : [parsed];
      for (const item of candidates) {
        if (
          item &&
          (item["@type"] === "JobPosting" ||
            (Array.isArray(item["@type"]) &&
              item["@type"].includes("JobPosting")))
        ) {
          title = title || String(item.title ?? "");
          orgName =
            orgName ||
            String(
              item.hiringOrganization?.name ??
                item.organization?.name ??
                "",
            );
          const loc =
            item.jobLocation?.address?.addressLocality ||
            item.jobLocation?.address?.addressRegion ||
            item.jobLocation?.address?.addressCountry ||
            "";
          if (loc && !location) location = String(loc);
          if (item.validThrough && !deadline) {
            deadline = String(item.validThrough).slice(0, 10);
          }
          if (item.description && !description) {
            description = htmlToCleanText(String(item.description));
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  // 2b. Fallback to OpenGraph / <title> / <h1>
  if (!title) {
    title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("h1").first().text().trim() ||
      $("title").first().text().trim() ||
      "Policy Opening";
  }
  if (!orgName) {
    orgName =
      $('meta[property="og:site_name"]').attr("content")?.trim() ||
      urlObj.hostname.replace(/^www\./, "").split(".")[0].toUpperCase();
  }

  // 2c. Extract main JD body text
  if (!description || description.length < 120) {
    $("script, style, noscript, svg, nav, header, footer, form, iframe").remove();
    const container = $(
      "article, [class*='job-description'], [class*='jobDescription'], [id*='job-description'], main, [role='main'], .entry-content, .post-content, body",
    ).first();

    const blocks: string[] = [];
    container.find("h2, h3, h4, p, li").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length >= 15) {
        blocks.push(el.tagName.toLowerCase() === "li" ? `• ${t}` : t);
      }
    });

    description =
      blocks.length > 0
        ? cleanText(blocks.join("\n"))
        : cleanText(container.text());
  }

  description = description.slice(0, 8000);
  if (!location) {
    const locMatch = description.match(
      /\b(?:Location|Duty Station|Based in|City)\s*[:\-–]\s*([A-Za-z ,/]{3,40})/i,
    );
    location = locMatch ? locMatch[1].trim() : "India";
  }

  const fullText = `${title} ${description}`;
  return {
    title: title.slice(0, 180),
    orgName: orgName.slice(0, 100),
    location: location.slice(0, 80),
    locationType: classifyLocationType(location, description),
    type: classifyJobType(title, description),
    experience: classifyExperience(title, description),
    sectors: classifySectors(fullText),
    deadline,
    description,
    url,
  };
}

/**
 * Parses a raw WhatsApp forward, LinkedIn post, or email announcement into
 * structured job fields (Role, Org, Location, Deadline, URL/Email, Type,
 * Experience, Sectors, and cleaned JD).
 */
export function extractJobFromRawText(rawText: string): ExtractedJD {
  const cleaned = cleanText(rawText);
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Extract URL or fallback mailto
  const urlMatch = cleaned.match(/https?:\/\/[^\s)"'<>]+/i);
  const emailMatch = cleaned.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  );
  const url = urlMatch
    ? urlMatch[0].replace(/[.,;]+$/, "")
    : emailMatch
      ? `mailto:${emailMatch[0]}`
      : "";

  // 2. Extract Title
  const roleLabelMatch = cleaned.match(
    /(?:Role|Position|Title|Opening|Opportunity|Hiring(?:\s+for)?)\s*[:\-–]\s*([^\n]{4,120})/i,
  );
  let title = roleLabelMatch ? roleLabelMatch[1].trim() : "";
  if (!title) {
    const candidateLine = lines.find(
      (l) =>
        l.length >= 6 &&
        l.length <= 110 &&
        /\b(intern|internship|fellow|fellowship|associate|analyst|consultant|manager|researcher|research assistant|\bra\b|director|specialist|officer|lead|coordinator|economist)\b/i.test(
          l,
        ),
    );
    title = candidateLine ?? lines[0]?.slice(0, 100) ?? "Policy Opening";
  }
  title = title.replace(/^[*#\-•\s]+|[*#]+$/g, "").trim();

  // 3. Extract Organization
  const orgLabelMatch = cleaned.match(
    /(?:Organi[sz]ation|Company|Institute|Think Tank|Employer|At)\s*[:\-–]\s*([^\n]{2,90})/i,
  );
  let orgName = orgLabelMatch ? orgLabelMatch[1].trim() : "";
  if (!orgName) {
    const atMatch = title.match(/\b(?:at|@|with|—|-)\s+([A-Z][A-Za-z0-9 &().-]{2,60})$/);
    if (atMatch) orgName = atMatch[1].trim();
  }
  if (!orgName && emailMatch) {
    const domain = emailMatch[0].split("@")[1]?.split(".")[0] ?? "";
    if (domain && !["gmail", "outlook", "yahoo", "hotmail"].includes(domain.toLowerCase())) {
      orgName = domain.toUpperCase();
    }
  }

  // 4. Extract Location
  const locMatch = cleaned.match(
    /(?:Location|Based in|City|Duty Station|Place)\s*[:\-–]\s*([^\n]{2,60})/i,
  );
  const location = locMatch ? locMatch[1].trim() : "India";

  // 5. Extract Deadline (YYYY-MM-DD or "15 Dec 2026" / "December 15, 2026")
  let deadline: string | null = null;
  const isoMatch = cleaned.match(/\b(202[6-9]-\d{2}-\d{2})\b/);
  if (isoMatch) {
    deadline = isoMatch[1];
  } else {
    const dMatch = cleaned.match(
      /(?:Deadline|Apply by|Last date|Closing date|Due(?:\s+by)?)\s*[:\-–]?\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+202[6-9]|[A-Za-z]{3,9}\s+\d{1,2},?\s+202[6-9])/i,
    );
    if (dMatch) {
      const parsed = new Date(dMatch[1]);
      if (!Number.isNaN(parsed.getTime())) {
        deadline = parsed.toISOString().slice(0, 10);
      }
    }
  }

  return {
    title: title.slice(0, 180),
    orgName: orgName.slice(0, 100),
    location: location.slice(0, 80),
    locationType: classifyLocationType(location, cleaned),
    type: classifyJobType(title, cleaned),
    experience: classifyExperience(title, cleaned),
    sectors: classifySectors(cleaned),
    deadline,
    description: cleaned.slice(0, 8000),
    url,
  };
}
