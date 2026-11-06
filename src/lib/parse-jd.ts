/**
 * Parser for structuring raw extracted Job Descriptions into clean,
 * readable sections, eliminating cookie notices, ATS headers, and run-on dumps.
 */

export interface ParsedJDSection {
  title: string;
  type:
    | "summary"
    | "responsibilities"
    | "qualifications"
    | "skills"
    | "organization"
    | "general";
  bullets: string[];
  paragraphs: string[];
}

export interface ParsedJD {
  metadata: {
    experience?: string;
    education?: string;
    practice?: string;
    location?: string;
    atsFields?: Record<string, string>;
  };
  sections: ParsedJDSection[];
  rawCleaned: string;
}

export function parseStructuredJobDescription(raw: string | null | undefined): ParsedJD {
  if (!raw || !raw.trim()) {
    return {
      metadata: {},
      sections: [],
      rawCleaned: "",
    };
  }

  let text = raw.trim();

  // 1. Strip web crawler boilerplate (cookie banners, ATS alert modals, pagination)
  text = text.replace(/^Skip to main content\s*/i, "");

  // If text starts with SAP SuccessFactors or other cookie notices, fast-forward to real JD opening
  const earlyOpeningIdx = text.search(
    /(?:The opportunity\s*:|Job Description & Summary|Position Summary\s*:|About the role\s*:|About the position\s*:|The Foundation\s*We are|About J-PAL|Broad Role \/ Responsibilities)/i,
  );
  if (
    earlyOpeningIdx > 0 &&
    text.slice(0, earlyOpeningIdx).toLowerCase().includes("cookie")
  ) {
    text = text.slice(earlyOpeningIdx);
  } else {
    text = text
      .replace(
        /Cookie information[\s\S]*?(?:Cookie Preferences|Create Alert|GDPR\.)\s*/gi,
        "",
      )
      .replace(
        /Select how often \(in days\) to receive an alert:[\s\S]*?Create Alert\s*/gi,
        "",
      )
      .replace(/Apply now\s*»\s*Apply now[\s\S]*?Start applying with LinkedIn\s*/gi, "");
  }

  // Common trailing garbage or page numbers
  text = text
    .replace(/@\s*(?:PwC|EY|Deloitte|KPMG)\s*\d+\s*\|\s*Page/gi, "")
    .replace(
      /Education \(if blank, degree and\/or field of study not specified\)[\s\S]*$/i,
      "",
    )
    .replace(/Degrees\/Field of Study required:[\s\S]*$/i, "")
    .trim();

  // 2. Parse ATS header block if present (e.g. PwC Line of Service / Management Level)
  const atsMatch = text.match(
    /^(Line of Service[^\n\r]+?)(Job Description & Summary|At PwC|About the role)/i,
  );
  const atsFields: Record<string, string> = {};
  if (atsMatch) {
    const headerStr = atsMatch[1];
    text = text.slice(atsMatch[1].length).trim();
    const keys = [
      "Line of Service",
      "Industry/Sector",
      "Specialism",
      "Management Level",
    ];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const nextK = keys[i + 1] || "Job Description";
      const regex = new RegExp(k + "(.*?)(?=" + nextK + "|$)", "i");
      const m = headerStr.match(regex);
      if (m && m[1]) atsFields[k] = m[1].trim();
    }
  }

  // 3. Separate concatenated transitions in known headings (where crawler glued words together)
  const knownMarkers = [
    "Job Description & Summary",
    "About the role",
    "About the position",
    "Position Summary",
    "The Opportunity",
    "The Foundation",
    "The Team",
    "Broad Role / Responsibilities",
    "Key Roles & Responsibilities",
    "Your key responsibilities",
    "Key Responsibilities",
    "Responsibilities",
    "Core Responsibilities",
    "What you will do",
    "Broad Experience & Expertise Requirements",
    "Specific Past Work Experience Requirements",
    "Educational Qualification",
    "Educational Qualifications",
    "Qualifications",
    "Basic Qualifications",
    "Minimum Qualifications",
    "Personality traits",
    "Mandatory Skill Set",
    "Preferred Skill Set",
    "Year of experience required",
    "Experience Minimum",
    "Technical Excellence",
    "SaT - TCF",
    "SaT :",
    "GOV :",
    "About J-PAL",
    "About PwC",
    "About EY",
  ];

  for (const marker of knownMarkers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp("([a-z0-9,.:])\\s*(" + escaped + ")\\b", "gi");
    text = text.replace(regex, "$1\n\n### $2\n");
  }

  // Normalize bullet markers
  text = text.replace(/([•]|\n-\s*|\n\*\s*)/g, "\n• ");

  // 4. Extract telemetry metadata highlights
  const metadata: ParsedJD["metadata"] = { atsFields };

  // Experience
  const expMatch = text.match(
    /(?:Year of experience required|Experience|Minimum experience|relevant experience)[\s\-:]*([0-9\+\-–to\s]+(?:years?|yrs?))/i,
  );
  if (expMatch) metadata.experience = expMatch[1].trim();

  // Education
  const eduMatch = text.match(
    /(?:Educational Qualifications?|Education)[\s\-:]*([^\n\r•]{10,120})/i,
  );
  if (eduMatch) {
    metadata.education = eduMatch[1].trim().replace(/^###\s*/, "");
  }

  // Practice / Unit
  const practiceMatch = text.match(
    /(?:Line of Service|Practice|Business Unit|The Team|Division)[\s\-:]*([^\n\r•]{5,80})/i,
  );
  if (practiceMatch) {
    metadata.practice = practiceMatch[1].trim();
  } else if (atsFields["Line of Service"] || atsFields["Specialism"]) {
    metadata.practice = [atsFields["Line of Service"], atsFields["Specialism"]]
      .filter(Boolean)
      .join(" · ");
  }

  // Location details
  const locMatch = text.match(
    /(?:Location|Duty Station|Based in)[\s\-:]*([^\n\r•]{4,80})/i,
  );
  if (locMatch) metadata.location = locMatch[1].trim();

  // 5. Segment into structured sections
  const rawSections = text.split(
    /\n{2,}###\s+|\n{2,}(?=[A-Z][A-Za-z\s/&–-]{3,40}:?\n)/,
  );
  const sections: ParsedJDSection[] = [];

  for (const block of rawSections) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.length < 15) continue;

    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = "Role Overview";
    let type: ParsedJDSection["type"] = "general";
    let contentLines = lines;

    const firstLine = lines[0].replace(/^###\s*/, "").replace(/:$/, "").trim();
    if (firstLine.length < 60 && (lines.length > 1 || trimmed.length > 100)) {
      title = firstLine;
      contentLines = lines.slice(1);
    }

    const tLower = title.toLowerCase();
    if (
      tLower.includes("responsibilit") ||
      tLower.includes("what you will do") ||
      tLower.includes("broad role") ||
      tLower.includes("scope of work")
    ) {
      type = "responsibilities";
    } else if (
      tLower.includes("qualification") ||
      tLower.includes("education") ||
      tLower.includes("experience") ||
      tLower.includes("eligibility") ||
      tLower.includes("about you")
    ) {
      type = "qualifications";
    } else if (
      tLower.includes("skill") ||
      tLower.includes("trait") ||
      tLower.includes("competenc")
    ) {
      type = "skills";
    } else if (
      tLower.includes("about") ||
      tLower.includes("team") ||
      tLower.includes("foundation") ||
      tLower.includes("practice") ||
      tLower.includes("sat") ||
      tLower.includes("gov")
    ) {
      type = "organization";
    } else if (
      tLower.includes("summary") ||
      tLower.includes("overview") ||
      tLower.includes("opportunity")
    ) {
      type = "summary";
    }

    const bullets: string[] = [];
    const paragraphs: string[] = [];

    for (const l of contentLines) {
      if (l.startsWith("•") || l.startsWith("-")) {
        const cleanedBullet = l.replace(/^[•\-]\s*/, "").trim();
        if (cleanedBullet) bullets.push(cleanedBullet);
      } else if (l.length > 0) {
        paragraphs.push(l);
      }
    }

    if (bullets.length > 0 || paragraphs.length > 0) {
      sections.push({
        title,
        type,
        bullets,
        paragraphs,
      });
    }
  }

  // Fallback: If no structured sections could be distinguished, format clean paragraphs
  if (sections.length === 0 && text.length > 0) {
    const paras = text
      .split(/\n{2,}|\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 15);
    sections.push({
      title: "Official Description Overview",
      type: "summary",
      bullets: [],
      paragraphs: paras.length > 0 ? paras : [text],
    });
  }

  return { metadata, sections, rawCleaned: text };
}
