import { createHash } from "crypto";
import type { Experience, JobType, LocationType, Sector } from "@/lib/taxonomy";

/**
 * Deterministic rule-based classifier for job postings.
 * Runs first on every ingested or manually submitted role (zero cost).
 */

const SECTOR_KEYWORDS: Record<Sector, RegExp> = {
  health: /\b(health|healthcare|public health|epidemiol|clinical|pharma|medical|nutrition|maternal|immuniz|who\b|ayushman|nhm\b|disease|pandemic|hospital)\b/i,
  tech_ai: /\b(ai\b|artificial intelligence|machine learning|llm|digital public infrastructure|\bdpi\b|cyber|data governance|tech policy|platform|algorithmic|semiconductor|telecom|internet|privacy|dpdp|aadhaar|upi\b|ondc|govtech)\b/i,
  regulation: /\b(regulat|antitrust|competition law|compliance|legal|legislative|parliament|statut|litigation|constitutional|telecommunication|trai\b|sebi\b|rbi\b|cci\b|policy analysis|bill\b)\b/i,
  government: /\b(ministry|niti aayog|government|state govt|district|collector|ias\b|public administration|civil service|municipal|panchayat|sarkari|chief minister|prime minister|parliamentary|lok sabha|rajya sabha|mission)\b/i,
  private_sector: /\b(corporate affairs|government affairs|public affairs|gr\b|csr\b|esg\b|consulting|advisory|strategy|client|big 4|market access|industry association)\b/i,
  development: /\b(development|poverty|livelihood|rural|social protection|welfare|wash\b|sanitation|sdg|humanitarian|impact evaluation|rct\b|field research|microfinance|inclusion)\b/i,
  climate: /\b(climate|energy|renewable|solar|wind|carbon|decarboni|emissions|net[- ]zero|environment|sustainability|clean air|water|forestry|biodiversity|ev\b|electric vehicle|green transition|just transition)\b/i,
  finance: /\b(fiscal|monetary|budget|tax|public finance|macroeconom|economist|economic|financial inclusion|fintech|banking|trade|industrial policy|investment)\b/i,
  education: /\b(education|school|edtech|literacy|higher education|nep\b|pedagogy|foundational learning|fln\b|skill|vocational|teacher)\b/i,
  agriculture: /\b(agricultur|agri|farmer|food security|food system|crop|irrigation|dairy|fisheries|rural economy)\b/i,
  gender: /\b(gender|women|child|adolescent|diversity|inclusion|lgbtq|care economy|shg\b|self[- ]help group)\b/i,
  urban: /\b(urban|smart city|housing|mobility|transport|transit|metro|infrastructure|municipal|waste management|planning)\b/i,
};

export function classifySectors(
  text: string,
  fallbackSectors: string[] = [],
): Sector[] {
  const found = new Set<Sector>();
  for (const [sector, regex] of Object.entries(SECTOR_KEYWORDS) as [
    Sector,
    RegExp,
  ][]) {
    if (regex.test(text)) found.add(sector);
  }
  if (found.size === 0) {
    for (const s of fallbackSectors) found.add(s as Sector);
  }
  if (found.size === 0) found.add("government");
  return Array.from(found).slice(0, 4);
}

export function classifyJobType(title: string, description = ""): JobType {
  const combined = `${title} ${description.slice(0, 400)}`;
  if (/\b(intern|internship|summer associate|winter associate|trainee)\b/i.test(title)) {
    return "internship";
  }
  if (/\b(fellow|fellowship|lamp\b|cmgga|young professional|\byp\b)\b/i.test(title)) {
    return "fellowship";
  }
  if (/\b(young professional program|ypp\b|graduate program|rotational|analyst program)\b/i.test(combined)) {
    return "graduate_program";
  }
  if (/\b(part[- ]time|contract|consultant|short[- ]term|stc\b|research assistant|\bra\b|field investigator)\b/i.test(title)) {
    return "part_time";
  }
  return "full_time";
}

export function classifyExperience(title: string, description = ""): Experience {
  const combined = `${title} ${description.slice(0, 800)}`;

  // Explicit years patterns e.g. "3-5 years", "5+ years", "10 years"
  const rangeMatch = combined.match(/(\d{1,2})\s*(?:[-–to]+)\s*(\d{1,2})\s*\+?\s*(?:years|yrs)/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    if (min >= 10) return "10+";
    if (min >= 5) return "5-10";
    if (min >= 3) return "3-5";
    return "0-2";
  }

  const plusMatch = combined.match(/(\d{1,2})\s*\+?\s*(?:years|yrs)\s+of\s+experience/i);
  if (plusMatch) {
    const yrs = parseInt(plusMatch[1], 10);
    if (yrs >= 10) return "10+";
    if (yrs >= 5) return "5-10";
    if (yrs >= 3) return "3-5";
    return "0-2";
  }

  if (/\b(director|vice president|\bvp\b|partner|head of|chief|principal|lead)\b/i.test(title)) {
    return "10+";
  }
  if (/\b(senior manager|senior fellow|program manager|engagement manager|deputy director|specialist)\b/i.test(title)) {
    return "5-10";
  }
  if (/\b(senior associate|senior analyst|manager|consultant|policy officer|research fellow)\b/i.test(title)) {
    return "3-5";
  }
  return "0-2";
}

const INDIA_LOCATIONS =
  /\b(india|new delhi|delhi|ncr|gurugram|gurgaon|noida|mumbai|bengaluru|bangalore|hyderabad|chennai|kolkata|pune|ahmedabad|jaipur|lucknow|bhopal|patna|bhubaneswar|chandigarh|thiruvananthapuram|guwahati|ranchi|raipur|dehradun|shimla|srinagar|panaji|mysuru|mysore|andhra|karnataka|maharashtra|tamil nadu|telangana|kerala|gujarat|rajasthan|uttar pradesh|bihar|odisha|assam|haryana|punjab)\b/i;

export function classifyLocationType(
  location: string | null | undefined,
  description = "",
): LocationType {
  const loc = `${location ?? ""} ${description.slice(0, 300)}`;
  if (/\b(remote|work from home|wfh|anywhere)\b/i.test(loc) && !INDIA_LOCATIONS.test(location ?? "")) {
    return "remote";
  }
  if (INDIA_LOCATIONS.test(loc)) return "india";
  if (/\b(remote)\b/i.test(loc)) return "remote";
  return "global";
}

export function makeFingerprint(orgName: string, title: string, url: string): string {
  const norm = `${orgName.trim().toLowerCase()}::${title.trim().toLowerCase()}::${url.trim().replace(/[?#].*$/, "")}`;
  return createHash("sha256").update(norm).digest("hex").slice(0, 32);
}

const ENGINEERING_EXCLUDE_REGEX =
  /\b(engineer|engineering|sde\d?\b|cuda|kernel|devops|devsecops|sre\b|frontend|front-end|backend|back-end|full[- ]stack|ios\b|android|react\b|nextjs|golang|rust\b|c\+\+|embedded|firmware|qa\b|sdet|ui\/ux|product designer|product manager|graphic designer|video editor|motion designer|recruiter|talent acquisition|account executive|sales representative|inside sales|sap\b|oracle erp|salesforce|abap|cybersecurity|network|cloud architect|solution architect|mlops|ml researcher|foundational models|inference|pre-training|post-training|vlsi|hardware|telephony|hpc\b|monetization|growth marketing|field marketing|product marketing|marketing operations|brand & communication|technical writer)\b/i;

const POLICY_INCLUDE_REGEX =
  /\b(policy|public affairs|government|regulatory|regulation|economist|economic|research|impact|sustainability|climate|health|development|social|governance|legal|law|trust\s*&\s*safety|ethics|civic|think tank|fellow|fellowship|program|programme|advisory|consulting|strategy|monitoring|evaluation|m&e|advocacy|communications|partnerships|grants|philanthrop|multilateral|public sector|g&ps|dpi\b|digital public|deployment strategist|engagement manager|engagement principal|founder['’]?s office|chief of staff|associate|analyst|director|manager|intern|internship|consultant)\b/i;

/**
 * Strict Policy & Social Impact Relevance Gate.
 * - Rejects software/ML engineering, product design, marketing, and pure sales roles.
 * - Requires positive policy/research/governance/strategy signals.
 */
export function isPolicyRelevant(title: string, department = ""): boolean {
  const text = `${title} ${department}`;
  if (ENGINEERING_EXCLUDE_REGEX.test(title) || /\b(engineering|infrastructure|models)\b/i.test(department)) {
    return false;
  }
  return POLICY_INCLUDE_REGEX.test(text);
}
