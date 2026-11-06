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
