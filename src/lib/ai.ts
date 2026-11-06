import { createHash } from "crypto";
import { SECTORS, EXPERIENCE, type Sector } from "@/lib/taxonomy";

/**
 * Modular AI Fit Scoring interface.
 *
 * - Default (`AI_PROVIDER=keyword` or no API key): 100% free deterministic
 *   scorer that compares resume/profile skills, sectors, experience, and
 *   keywords against the job posting.
 * - `AI_PROVIDER=gemini` + `GOOGLE_GENERATIVE_AI_API_KEY`: uses Google Gemini
 *   (`gemini-2.5-flash` by default) via the Vercel AI SDK, with automatic
 *   fallback to the keyword scorer if quota is reached or a request fails.
 * - Swapping to OpenAI / Anthropic / AI Gateway later only requires adding a
 *   branch in `getProvider()` below.
 */

export interface FitInput {
  profile: {
    headline?: string | null;
    sectors: string[];
    skills: string[];
    interests?: string | null;
    experienceLevel?: string | null;
    resumeText?: string | null;
  };
  job: {
    title: string;
    orgName: string;
    type?: string | null;
    experience?: string | null;
    location?: string | null;
    sectors: string[];
    description?: string | null;
  };
}

export interface FitResult {
  score: number; // 0-100
  summary: string;
  strengths: string[];
  gaps: string[];
  provider: string;
}

export interface AIProvider {
  name: string;
  scoreFit(input: FitInput): Promise<FitResult>;
}

export function hashProfile(p: FitInput["profile"]): string {
  const raw = JSON.stringify({
    h: p.headline ?? "",
    s: [...(p.sectors ?? [])].sort(),
    k: [...(p.skills ?? [])].sort(),
    i: p.interests ?? "",
    e: p.experienceLevel ?? "",
    r: (p.resumeText ?? "").slice(0, 4000),
  });
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

const POLICY_SKILLS = [
  "stata",
  "r",
  "python",
  "sql",
  "excel",
  "econometrics",
  "rct",
  "impact evaluation",
  "qualitative research",
  "quantitative research",
  "policy brief",
  "legislative",
  "stakeholder engagement",
  "monitoring and evaluation",
  "m&e",
  "public finance",
  "budget analysis",
  "regulatory analysis",
  "data visualization",
  "gis",
  "survey design",
  "fieldwork",
  "literature review",
  "cost-benefit",
  "project management",
];

/** Deterministic offline scorer — always available, zero cost. */
export const keywordProvider: AIProvider = {
  name: "keyword",
  async scoreFit({ profile, job }): Promise<FitResult> {
    const strengths: string[] = [];
    const gaps: string[] = [];
    let score = 45;

    const userCorpus = [
      profile.headline ?? "",
      profile.interests ?? "",
      profile.resumeText ?? "",
      ...(profile.skills ?? []),
    ]
      .join(" ")
      .toLowerCase();

    const jobCorpus = [
      job.title,
      job.orgName,
      job.description ?? "",
      ...(job.sectors ?? []),
    ]
      .join(" ")
      .toLowerCase();

    // 1. Sector overlap (up to +25)
    const matchingSectors = (job.sectors ?? []).filter((s) =>
      (profile.sectors ?? []).includes(s),
    );
    if (matchingSectors.length > 0) {
      score += Math.min(25, matchingSectors.length * 14);
      const names = matchingSectors
        .map((s) => SECTORS[s as Sector] ?? s)
        .join(", ");
      strengths.push(`Direct sector match: ${names}`);
    } else if ((job.sectors ?? []).length > 0 && (profile.sectors ?? []).length > 0) {
      const targetNames = job.sectors
        .slice(0, 2)
        .map((s) => SECTORS[s as Sector] ?? s)
        .join(", ");
      gaps.push(`Role focuses on ${targetNames}, outside your selected sectors`);
    }

    // 2. Experience level alignment (up to +15 or -12)
    const expOrder = ["0-2", "3-5", "5-10", "10+"];
    if (profile.experienceLevel && job.experience) {
      const uIdx = expOrder.indexOf(profile.experienceLevel);
      const jIdx = expOrder.indexOf(job.experience);
      if (uIdx !== -1 && jIdx !== -1) {
        if (uIdx === jIdx) {
          score += 15;
          strengths.push(
            `Experience band (${EXPERIENCE[job.experience as keyof typeof EXPERIENCE] ?? job.experience}) matches your profile`,
          );
        } else if (Math.abs(uIdx - jIdx) === 1) {
          score += 5;
        } else if (jIdx > uIdx) {
          score -= 12;
          gaps.push(
            `Role asks for ${EXPERIENCE[job.experience as keyof typeof EXPERIENCE] ?? job.experience} experience`,
          );
        }
      }
    }

    // 3. Skills & methods match (up to +20)
    const requiredSkills = POLICY_SKILLS.filter((sk) => jobCorpus.includes(sk));
    const userRequestedSkills = (profile.skills ?? []).map((s) => s.toLowerCase());
    const matchedSkills = new Set<string>();
    const missingSkills: string[] = [];

    for (const sk of requiredSkills) {
      if (userCorpus.includes(sk) || userRequestedSkills.includes(sk)) {
        matchedSkills.add(sk);
      } else {
        missingSkills.push(sk);
      }
    }
    for (const sk of userRequestedSkills) {
      if (sk.length > 2 && jobCorpus.includes(sk)) matchedSkills.add(sk);
    }

    if (matchedSkills.size > 0) {
      score += Math.min(20, matchedSkills.size * 6);
      strengths.push(
        `Relevant skills/methods: ${Array.from(matchedSkills).slice(0, 4).join(", ")}`,
      );
    }
    if (missingSkills.length > 0) {
      gaps.push(
        `Posting mentions ${missingSkills.slice(0, 3).join(", ")} — highlight or build if applicable`,
      );
    }

    // 4. Resume / interest keyword overlap
    if (profile.resumeText && profile.resumeText.length > 100) {
      score += 4;
    } else if (!profile.headline && (profile.skills ?? []).length === 0) {
      gaps.push("Upload your CV or add skills in Settings for a sharper fit score");
    }

    score = Math.max(15, Math.min(96, Math.round(score)));
    if (strengths.length === 0) {
      strengths.push("General public policy background relevant to this role");
    }
    if (gaps.length === 0) {
      gaps.push("Tailor your cover note to the organization's current projects");
    }

    const tier =
      score >= 78 ? "Strong fit" : score >= 58 ? "Moderate fit" : "Stretch role";
    const summary = `${tier} (${score}/100) for ${job.title} at ${job.orgName}. ${strengths[0]}.`;

    return {
      score,
      summary,
      strengths: strengths.slice(0, 3),
      gaps: gaps.slice(0, 3),
      provider: "keyword",
    };
  },
};

function createGeminiProvider(apiKey: string): AIProvider {
  return {
    name: "gemini",
    async scoreFit(input): Promise<FitResult> {
      try {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        const { generateText } = await import("ai");
        const google = createGoogleGenerativeAI({ apiKey });
        const modelId = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

        const prompt = `You are a career advisor for the IIT Delhi Master of Public Policy (MPP) cohort.
Score how well this candidate fits the policy job below. Return ONLY valid JSON with keys:
{"score": <integer 0-100>, "summary": "<1-2 concise sentences>", "strengths": ["<point 1>", "<point 2>"], "gaps": ["<gap 1>", "<gap 2>"]}

Candidate profile:
- Headline: ${input.profile.headline ?? "MPP candidate / graduate"}
- Experience band: ${input.profile.experienceLevel ?? "not specified"}
- Target sectors: ${(input.profile.sectors ?? []).join(", ") || "any"}
- Skills: ${(input.profile.skills ?? []).join(", ") || "not listed"}
- Interests: ${input.profile.interests ?? "not listed"}
- Resume excerpt: ${(input.profile.resumeText ?? "").slice(0, 2500) || "not uploaded"}

Job posting:
- Title: ${input.job.title}
- Organization: ${input.job.orgName}
- Type: ${input.job.type ?? "unspecified"}, Experience: ${input.job.experience ?? "unspecified"}, Location: ${input.job.location ?? "unspecified"}
- Sectors: ${(input.job.sectors ?? []).join(", ")}
- Description: ${(input.job.description ?? "").slice(0, 2500)}`;

        const { text } = await generateText({
          model: google(modelId),
          prompt,
        });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in Gemini response");
        const parsed = JSON.parse(jsonMatch[0]) as Partial<FitResult>;
        const score = Math.max(
          0,
          Math.min(100, Number(parsed.score ?? 60) || 60),
        );
        return {
          score,
          summary: String(parsed.summary ?? `Fit score ${score}/100.`),
          strengths: Array.isArray(parsed.strengths)
            ? parsed.strengths.map(String).slice(0, 4)
            : [],
          gaps: Array.isArray(parsed.gaps)
            ? parsed.gaps.map(String).slice(0, 4)
            : [],
          provider: "gemini",
        };
      } catch (err) {
        console.warn("[ai:gemini] Falling back to keyword scorer:", err);
        return keywordProvider.scoreFit(input);
      }
    },
  };
}

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "keyword").toLowerCase();
  const geminiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (provider === "gemini" && geminiKey) {
    return createGeminiProvider(geminiKey);
  }
  return keywordProvider;
}

/**
 * Generates a tailored 180-word cover note / cold email for a policy role.
 * Uses Gemini if configured, or a crisp, structured template grounded in the
 * candidate's IITD MPP profile and the job's sectors/skills.
 */
export async function draftCoverNote(
  userName: string,
  batch: string | null,
  input: FitInput,
): Promise<{ subject: string; body: string; provider: string }> {
  const geminiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (
    (process.env.AI_PROVIDER ?? "keyword").toLowerCase() === "gemini" &&
    geminiKey
  ) {
    try {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const { generateText } = await import("ai");
      const google = createGoogleGenerativeAI({ apiKey: geminiKey });
      const modelId = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
      const { text } = await generateText({
        model: google(modelId),
        prompt: `Write a concise, non-fluffy 180-word cover note / cold outreach email from ${userName} (${batch ?? "Master of Public Policy candidate, IIT Delhi"}) applying for "${input.job.title}" at ${input.job.orgName}.
Candidate headline: ${input.profile.headline ?? "MPP at IIT Delhi"}
Candidate skills: ${(input.profile.skills ?? []).join(", ")}
Candidate resume excerpt: ${(input.profile.resumeText ?? "").slice(0, 1500)}
Job description excerpt: ${(input.job.description ?? "").slice(0, 1500)}

Return ONLY plain text starting with "Subject: ..." on line 1, followed by a blank line and a 3-paragraph email body.`,
      });
      const lines = text.trim().split(/\r?\n/);
      const subjectLine = lines[0]?.replace(/^Subject:\s*/i, "").trim();
      return {
        subject:
          subjectLine ||
          `Application: ${input.job.title} — ${userName} (IIT Delhi MPP)`,
        body: lines.slice(1).join("\n").trim(),
        provider: "gemini",
      };
    } catch {
      // fall through to deterministic drafter
    }
  }

  const sectorNames = (input.job.sectors ?? [])
    .slice(0, 2)
    .map((s) => SECTORS[s as Sector] ?? s)
    .join(" and ");
  const skillList =
    (input.profile.skills ?? []).slice(0, 4).join(", ") ||
    "quantitative policy analysis, regulatory research, and stakeholder synthesis";
  const headline =
    input.profile.headline ||
    "a Master of Public Policy (MPP) candidate at the Indian Institute of Technology Delhi (IIT Delhi)";

  const subject = `Application for ${input.job.title} — ${userName} (IIT Delhi MPP)`;
  const body = `Dear Hiring Team at ${input.job.orgName},

I am writing to apply for the ${input.job.title} role at ${input.job.orgName}. I am ${userName} (${batch ?? "IIT Delhi MPP"}), ${headline.replace(/^MPP Candidate at IIT Delhi\s*·?\s*/i, "focusing on ")}. Having closely followed ${input.job.orgName}'s work in ${sectorNames || "public policy and governance"}, I am keen to contribute to your ongoing research and advisory mandates.

Through my training in the Master of Public Policy programme at IIT Delhi, I have built hands-on experience in ${skillList}. My recent coursework and policy research directly align with the analytical and execution requirements outlined in the ${input.job.title} terms of reference.

I have attached my CV and a relevant 2-page policy writing sample for your consideration, and would welcome the opportunity to complete a written assignment or speak with the team.

Warm regards,
${userName}
Master of Public Policy (MPP), IIT Delhi`;

  return { subject, body, provider: "template" };
}
