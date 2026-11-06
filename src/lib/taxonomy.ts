/** Shared vocabularies used for tagging, filtering and display. */

export const SECTORS = {
  health: "Health",
  tech_ai: "Tech & AI",
  regulation: "Regulation & Law",
  government: "Government",
  private_sector: "Private Sector",
  development: "Development",
  climate: "Climate & Energy",
  finance: "Finance & Economics",
  education: "Education",
  agriculture: "Agriculture",
  gender: "Gender & Social",
  urban: "Urban & Infra",
} as const;
export type Sector = keyof typeof SECTORS;

export const JOB_TYPES = {
  full_time: "Full-time",
  internship: "Internship",
  fellowship: "Fellowship",
  graduate_program: "Graduate / Rotational",
  part_time: "Part-time / Contract / RA",
} as const;
export type JobType = keyof typeof JOB_TYPES;

export const EXPERIENCE = {
  "0-2": "0–2 yrs",
  "3-5": "3–5 yrs",
  "5-10": "5–10 yrs",
  "10+": "10+ yrs",
} as const;
export type Experience = keyof typeof EXPERIENCE;

export const LOCATION_TYPES = {
  india: "India",
  global: "Global",
  remote: "Remote",
} as const;
export type LocationType = keyof typeof LOCATION_TYPES;

export const ORG_CATEGORIES = {
  think_tank: "Think tank",
  consulting: "Consulting",
  foundation: "Foundation",
  government: "Government",
  multilateral: "Multilateral",
  tech: "Tech",
  research: "Research",
  advocacy: "Advocacy",
  political: "Political",
  ngo: "NGO",
} as const;

export const APPLICATION_STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export const APPLICATION_STATUS_LABELS = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
} as const;
export type ApplicationStatus = keyof typeof APPLICATION_STATUS_LABELS;

export const ROLES = ["owner", "moderator", "member", "alumni"] as const;
export type Role = (typeof ROLES)[number];

export const NOTE_KINDS = {
  assignment: "Written Assignment / Data Test Prompt",
  compensation: "Stipend / CTC & Pay Transparency",
  interview: "Interview Process & Questions",
  timeline: "Hiring Timeline",
  cold_outreach: "Cold Email / PI Outreach Tip",
  tip: "General Tip",
  culture: "Work Culture",
} as const;

export function label<T extends Record<string, string>>(
  map: T,
  key: string | null | undefined,
): string {
  if (!key) return "";
  return (map as Record<string, string>)[key] ?? key;
}

export const KNOWN_COMPENSATION: Array<{
  pattern: RegExp;
  rolePattern?: RegExp;
  pay: string;
}> = [
  { pattern: /niti aayog/i, pay: "Govt Certificate & Exp (Unpaid)" },
  { pattern: /competition commission|cci\b/i, pay: "₹15,000 / month stipend" },
  { pattern: /dpiit/i, rolePattern: /intern/i, pay: "₹10,000 / month stipend" },
  { pattern: /dpiit/i, pay: "₹60,000–₹70,000 / month (YP)" },
  {
    pattern: /ministry of external affairs|mea\b/i,
    pay: "₹10,000 / month + Airfare",
  },
  { pattern: /prs legislative|lamp/i, pay: "₹23,000 / month stipend" },
  {
    pattern: /ceew/i,
    rolePattern: /intern/i,
    pay: "₹20,000–₹25,000 / month stipend",
  },
  { pattern: /ceew/i, pay: "₹7.0–₹9.5 LPA" },
  { pattern: /samagra/i, pay: "₹14–₹18 LPA" },
  { pattern: /j-pal|poverty action lab/i, pay: "₹5.5–₹7.5 LPA" },
  { pattern: /idinsight/i, pay: "₹9.0–₹12.0 LPA" },
  {
    pattern: /sattva/i,
    rolePattern: /intern/i,
    pay: "₹15,000–₹20,000 / month stipend",
  },
  { pattern: /sattva/i, pay: "₹6.5–₹8.5 LPA" },
  { pattern: /central square foundation/i, pay: "₹7.0–₹9.5 LPA" },
  { pattern: /swaniti/i, pay: "₹5.0–₹7.5 LPA" },
  {
    pattern: /asian development bank|adb\b/i,
    rolePattern: /intern/i,
    pay: "$1,500 / month (~₹1.25L)",
  },
  {
    pattern: /world health organization|who\b/i,
    rolePattern: /intern/i,
    pay: "UN Monthly Living Stipend",
  },
  {
    pattern: /world bank/i,
    rolePattern: /intern|stc/i,
    pay: "World Bank STC Consultant Matrix",
  },
  { pattern: /icrier/i, pay: "₹4.5–₹6.5 LPA" },
  { pattern: /csep/i, pay: "₹6.0–₹8.5 LPA" },
  { pattern: /nipfp/i, pay: "₹5.0–₹7.0 LPA" },
  {
    pattern: /vidhi/i,
    rolePattern: /intern/i,
    pay: "₹15,000 / month stipend",
  },
];

export function getEstimatedCompensation(
  orgName: string,
  title = "",
): string | null {
  for (const item of KNOWN_COMPENSATION) {
    if (item.pattern.test(orgName)) {
      if (item.rolePattern && !item.rolePattern.test(title)) continue;
      return item.pay;
    }
  }
  return null;
}
