/**
 * Utility functions to extract hard-gate eligibility, rolling urgency,
 * and skill requirements from verified job descriptions and deadlines.
 *
 * NOTE: Strictly no synthetic data is generated. If an attribute cannot
 * be verified or is absent, it returns null or "Under construction".
 */

export interface JobGates {
  experienceGate: {
    label: string;
    isEarlyCareer: boolean;
  };
  rollingUrgency: {
    label: string;
    isUrgent: boolean;
    type: "rolling_prime" | "rolling_late" | "deadline_soon" | "deadline_normal" | "rolling_standard";
  };
  quantRequired: boolean;
  writingSampleRequired: boolean;
  languageRequired: string | null;
}

export function analyzeJobGates(job: {
  title: string;
  description?: string | null;
  deadline?: string | null;
  postedAt?: Date | string | null;
  experience?: string | null;
  type?: string | null;
}): JobGates {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();

  // 1. Experience Hard-Gate
  const exp = job.experience ?? "";
  const isEarlyCareer =
    exp === "0-2" ||
    job.type === "internship" ||
    job.type === "fellowship" ||
    job.type === "graduate_program" ||
    /intern|fellow|junior|associate|trainee/i.test(job.title);

  let expLabel = "0–2 YOE Friendly";
  if (exp === "3-5") expLabel = "3–5 YOE (Mid-Level)";
  else if (exp === "5-10") expLabel = "5–10 YOE (Senior)";
  else if (exp === "10+") expLabel = "10+ YOE (Leadership)";
  else if (!isEarlyCareer) expLabel = "Experience: Review JD";

  // 2. Rolling Urgency / Deadline
  let urgencyLabel = "Rolling Intake";
  let isUrgent = false;
  let urgencyType: JobGates["rollingUrgency"]["type"] = "rolling_standard";

  if (job.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(job.deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 4) {
      urgencyLabel = `🚨 Due in ${diffDays === 0 ? "today" : `${diffDays}d`}`;
      isUrgent = true;
      urgencyType = "deadline_soon";
    } else if (diffDays > 4) {
      urgencyLabel = `Due ${job.deadline}`;
      urgencyType = "deadline_normal";
    } else {
      urgencyLabel = "Deadline Passed";
      urgencyType = "deadline_normal";
    }
  } else if (job.postedAt) {
    const posted = new Date(job.postedAt);
    const now = new Date();
    const daysSincePosted = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSincePosted <= 5) {
      urgencyLabel = `⚡ Prime Window (${daysSincePosted}d ago)`;
      isUrgent = true;
      urgencyType = "rolling_prime";
    } else if (daysSincePosted > 18) {
      urgencyLabel = `⏳ Late Rolling (${daysSincePosted}d ago)`;
      isUrgent = false;
      urgencyType = "rolling_late";
    } else {
      urgencyLabel = "Rolling Intake";
      urgencyType = "rolling_standard";
    }
  }

  // 3. Quant / Methods Requirement (Parsed from real JD text)
  const quantRegex = /\b(stata|rstudio|\br\b|python|econometric|econometrics|regression|surveycto|causal inference|impact evaluation|quantitative analysis|statistical)\b/i;
  const quantRequired = quantRegex.test(text);

  // 4. Writing Sample / Policy Memo Requirement
  const writingRegex = /\b(writing sample|policy brief|policy memo|published paper|sample of work|writing test|take-home|case memo)\b/i;
  const writingSampleRequired = writingRegex.test(text);

  // 5. Regional Language Requirement
  let languageRequired: string | null = null;
  const langMatch = text.match(/\b(hindi|kannada|tamil|telugu|bengali|marathi|gujarati|odia|punjabi|assamese)\b.*?\b(mandatory|required|fluent|fluency|proficiency)\b/i);
  if (langMatch) {
    const lang = langMatch[1].charAt(0).toUpperCase() + langMatch[1].slice(1).toLowerCase();
    languageRequired = `${lang} Required`;
  }

  return {
    experienceGate: { label: expLabel, isEarlyCareer },
    rollingUrgency: { label: urgencyLabel, isUrgent, type: urgencyType },
    quantRequired,
    writingSampleRequired,
    languageRequired,
  };
}
