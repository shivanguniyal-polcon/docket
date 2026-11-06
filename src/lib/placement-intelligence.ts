/**
 * Placement Intelligence Engine for the IIT Delhi MPP Cohort.
 *
 * Powers:
 * 1. The "Where Should I Apply?" Background-to-Employer Archetype Matcher
 * 2. The Always-On Employer Hiring Playbook (even when live scraped jobs = 0)
 * 3. The 8-Prompt 48-Hour Assignment & Case Workbench
 * 4. The Monthly Rolling & Statutory Windows Strip
 * 5. The Background-to-Policy CV Bullet Translator
 */

export type BackgroundId =
  | "upsc_humanities"
  | "stem_btech"
  | "econ_quant"
  | "work_ex";

export interface BackgroundProfile {
  id: BackgroundId;
  label: string;
  shortLabel: string;
  subtitle: string;
  unfairAdvantage: string;
  blindSpotToFix: string;
  recommendedEntryTitles: string[];
}

export const BACKGROUND_PROFILES: BackgroundProfile[] = [
  {
    id: "upsc_humanities",
    label: "UPSC / Humanities / Law / Political Science",
    shortLabel: "UPSC / Humanities / Law",
    subtitle:
      "Strong command over Indian Constitution, statutory frameworks, parliamentary procedures, welfare schemes, and long-form analytical writing.",
    unfairAdvantage:
      "You already know how Indian ministries, 73rd/74th Amendments, Centrally Sponsored Schemes, and parliamentary committees work — something STEM/MBA grads take a year to learn.",
    blindSpotToFix:
      "Do NOT list 'Prepared for UPSC CSE' on your CV. Reframe your preparation into concrete policy outputs: legislative briefs, budget analyses, scheme evaluations, and basic R/Excel data tables.",
    recommendedEntryTitles: [
      "Legislative / Policy Analyst",
      "LAMP / State CM / CRISP Fellow",
      "Research Associate (Governance & Regulation)",
      "Government Affairs / Public Policy Analyst",
      "Consultant — State PMU & Scheme Delivery",
    ],
  },
  {
    id: "stem_btech",
    label: "B.Tech / Engineering / Computer Science / STEM Pivot",
    shortLabel: "B.Tech / STEM Pivot",
    subtitle:
      "Strong quantitative reasoning, systems thinking, Python/R/SQL/Excel comfort, and familiarity with technology stacks.",
    unfairAdvantage:
      "Tech-policy firms, DPI organizations (eGov, Sarvam, Wadhwani AI), energy-modelling think tanks (CEEW, WRI), and governance consultancies (Samagra, EY DPI, PwC) actively prize engineers who understand public systems.",
    blindSpotToFix:
      "Pure engineering CVs get rejected by policy teams if they read like software developer resumes. Pair your technical skills with a crisp 2-page Policy Brief (e.g. DPDP Act, IndiaAI, or power-grid modelling).",
    recommendedEntryTitles: [
      "Tech Policy & AI Governance Analyst",
      "Associate — Governance & DPI Consulting",
      "Research Analyst — Energy / Climate Modelling",
      "Policy & Ecosystem Associate (Digital Public Goods)",
      "Data & Policy Analyst",
    ],
  },
  {
    id: "econ_quant",
    label: "Economics / Statistics / Commerce / Quantitative Social Science",
    shortLabel: "Economics / Quant / Stats",
    subtitle:
      "Trained in econometrics, causal inference, microeconomic theory, public finance, and Stata/R data analysis.",
    unfairAdvantage:
      "You can clear the hardest gate in policy hiring: the 2-hour Stata/R data cleaning and regression test at J-PAL, IDinsight, CEEW, NIPFP, ICRIER, CSEP, and Economic Advisory practices.",
    blindSpotToFix:
      "Academic economics papers are too theoretical for consulting/PMU roles. Always translate your regression findings into a 1-page actionable policy recommendation for a Secretary or Regulator.",
    recommendedEntryTitles: [
      "Research Associate / Pre-Doc (RCTs & Impact Eval)",
      "Research Analyst — Macroeconomics, Trade & Public Finance",
      "Analyst — Economic & Regulatory Advisory",
      "M&E / RMEAL Specialist",
      "Young Professional (RBI / Finance Commission / DPIIT)",
    ],
  },
  {
    id: "work_ex",
    label: "Experienced Professional (2–6+ Years Prior Work Experience)",
    shortLabel: "2–6+ Yrs Work-Ex (Lateral)",
    subtitle:
      "Prior experience in consulting, development sector, corporate strategy, technology, media, law, or government projects.",
    unfairAdvantage:
      "You qualify for lateral 3–5 yr and 5–10 yr roles (Consultant, Senior Research Analyst, Program Manager, Engagement Lead) at Big 4 G&PS, Philanthropies (Gates, CSF, Wadhwani), and Multilaterals (World Bank, UNDP, ADB).",
    blindSpotToFix:
      "Do not undersell yourself by applying only to freshers' analyst roles. Pitch your MPP degree as domain specialization on top of proven execution and stakeholder management.",
    recommendedEntryTitles: [
      "Consultant / Senior Consultant (G&PS / DPI)",
      "Programme Manager / Senior Programme Associate",
      "Engagement Manager / Project Lead (State PMU)",
      "Manager — Public Policy & Government Affairs",
      "Short-Term Consultant (STC) — World Bank / ADB / UN",
    ],
  },
];

export interface OrgHiringMeta {
  slug: string;
  name: string;
  category: string;
  sectors: string[];
  tier: "core" | "reach" | "safety_rolling";
  hiringChannel:
    | "Live ATS Board"
    | "Rolling Portal"
    | "Cold Email + 2-Page Brief"
    | "Monthly Window"
    | "Annual Cohort Window";
  bestFor: BackgroundId[];
  entryRoles: string;
  lateralRoles: string;
  howToApplyWhenZeroListed: string;
  applyUrl: string;
}

export const ORG_HIRING_PLAYBOOK: Record<string, OrgHiringMeta> = {
  ceew: {
    slug: "ceew",
    name: "Council on Energy, Environment and Water (CEEW)",
    category: "think_tank",
    sectors: ["climate", "finance", "tech_ai", "agriculture", "urban"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["stem_btech", "econ_quant", "work_ex"],
    entryRoles: "Research Intern · Research Analyst · Programme Associate",
    lateralRoles: "Senior Programme Associate · Programme Lead · Fellow",
    howToApplyWhenZeroListed:
      "Apply directly on CEEW's Zoho Recruit portal (100+ active roles across Energy Transitions, Technology Futures, Sustainable Water & Clean Air) and email the vertical's Programme Lead with a 2-page brief.",
    applyUrl: "https://ceew.zohorecruit.in/jobs/Careers",
  },
  "sattva-consulting": {
    slug: "sattva-consulting",
    name: "Sattva Consulting",
    category: "consulting",
    sectors: ["development", "government", "education", "climate", "gender"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["upsc_humanities", "stem_btech", "econ_quant", "work_ex"],
    entryRoles:
      "Intern (Foundations / Sustainability / Data) · Analyst · Associate Consultant",
    lateralRoles:
      "Consultant (Government Advisory / MEL / Legal Policy) · Project Lead · Engagement Manager",
    howToApplyWhenZeroListed:
      "Sattva's Kula AI board has 50+ open roles year-round plus a dedicated 'Sattva Internship Form' for winter/summer cohorts.",
    applyUrl: "https://careers.kula.ai/sattva",
  },
  "wadhwani-foundation": {
    slug: "wadhwani-foundation",
    name: "Wadhwani Foundation (WITP & Skilling)",
    category: "ngo",
    sectors: ["tech_ai", "education", "government", "private_sector"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["stem_btech", "work_ex", "upsc_humanities"],
    entryRoles: "Outcome Analyst · Technology Policy Analyst · Associate",
    lateralRoles:
      "Programme Manager · Ecosystem Program Manager · Platform Head",
    howToApplyWhenZeroListed:
      "Apply via Wadhwani Foundation's Zoho Recruit board (70+ active roles across New Delhi, Bengaluru, Lucknow & Hyderabad).",
    applyUrl: "https://careers.wfglobal.org/jobs/Careers",
  },
  "swaniti-initiative": {
    slug: "swaniti-initiative",
    name: "Swaniti Initiative",
    category: "think_tank",
    sectors: ["government", "climate", "development"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["upsc_humanities", "stem_btech", "econ_quant"],
    entryRoles:
      "Junior Analyst (Policy Engagement) · MP Analyst · Aspirational Block Fellow · Associate (Energy Transition)",
    lateralRoles:
      "Program Manager (SPARC-AI Fellows) · Lead Consultant (Decarbonization & Skilling)",
    howToApplyWhenZeroListed:
      "Check Swaniti's Zoho Recruit board for constituency fellowship, MP engagement, and state energy-transition analyst calls.",
    applyUrl: "https://swaniti.zohorecruit.in/jobs/Careers",
  },
  "central-square-foundation": {
    slug: "central-square-foundation",
    name: "Central Square Foundation (CSF)",
    category: "ngo",
    sectors: ["education", "government", "tech_ai"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["upsc_humanities", "econ_quant", "stem_btech", "work_ex"],
    entryRoles:
      "Project Associate · Consultant (RMEAL / High-Potential Students) · Coordinator (State DPMU)",
    lateralRoles:
      "Project Manager / Senior Project Manager (School Governance, EdTech & AI, FLN State PMUs)",
    howToApplyWhenZeroListed:
      "Apply on CSF's Manatal board (careers-page.com/central-square-foundation) or email ssshiring@centralsquarefoundation.org for state PMU roles.",
    applyUrl: "https://www.careers-page.com/central-square-foundation",
  },
  "prs-legislative-research": {
    slug: "prs-legislative-research",
    name: "PRS Legislative Research",
    category: "think_tank",
    sectors: ["regulation", "government"],
    tier: "core",
    hiringChannel: "Rolling Portal",
    bestFor: ["upsc_humanities", "econ_quant"],
    entryRoles:
      "LAMP Fellow · Winter/Summer Policy Intern · Associate Analyst (Legislative & Budget)",
    lateralRoles: "Analyst · Programme Lead (MP/MLA Engagement)",
    howToApplyWhenZeroListed:
      "PRS accepts rolling internship applications 4–6 weeks before each Parliamentary session (Winter, Budget, Monsoon) and opens LAMP in Nov–Jan.",
    applyUrl: "https://prsindia.org/careers",
  },
  samagra: {
    slug: "samagra",
    name: "Samagra | Transforming Governance",
    category: "consulting",
    sectors: ["government", "education", "agriculture", "health", "tech_ai"],
    tier: "reach",
    hiringChannel: "Rolling Portal",
    bestFor: ["stem_btech", "work_ex", "upsc_humanities", "econ_quant"],
    entryRoles:
      "Associate (Governance Consulting) · Applied Public Policy Lab Analyst",
    lateralRoles: "Senior Associate · Consultant · Engagement Manager",
    howToApplyWhenZeroListed:
      "Samagra runs structured recruitment drives; always reach out to IITD MPP alumni at Samagra (e.g. Meera K.) for an internal referral before submitting on their portal.",
    applyUrl: "https://samagragovernance.in/",
  },
  "jpal-south-asia": {
    slug: "jpal-south-asia",
    name: "J-PAL South Asia",
    category: "research",
    sectors: ["development", "health", "education", "gender", "agriculture"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["econ_quant", "stem_btech"],
    entryRoles:
      "Research Associate · Policy & Training Associate · Winter/Summer Intern",
    lateralRoles: "Research Manager · Policy Manager · Senior Research Associate",
    howToApplyWhenZeroListed:
      "Apply via J-PAL's SmartRecruiters board and monitor individual IIT/Harvard/MIT PIs running RCTs in Tamil Nadu, Odisha, Bihar, and Punjab.",
    applyUrl: "https://www.povertyactionlab.org/careers",
  },
  idinsight: {
    slug: "idinsight",
    name: "IDinsight",
    category: "research",
    sectors: ["development", "health", "education", "agriculture"],
    tier: "reach",
    hiringChannel: "Live ATS Board",
    bestFor: ["econ_quant", "stem_btech", "work_ex"],
    entryRoles: "Associate · Data-on-Demand Analyst · Economist Intern",
    lateralRoles: "Senior Associate · Manager · Senior Economist",
    howToApplyWhenZeroListed:
      "Prepare a clean Stata/R replication repository on GitHub and apply when New Delhi Associate windows open on Ashby.",
    applyUrl: "https://www.idinsight.org/careers/",
  },
  "pwc-india": {
    slug: "pwc-india",
    name: "PwC India (Government & Public Sector — G&PS)",
    category: "consulting",
    sectors: ["government", "private_sector", "urban", "finance", "climate"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["work_ex", "stem_btech", "econ_quant", "upsc_humanities"],
    entryRoles: "Associate — G&PS · Management Trainee · Intern",
    lateralRoles:
      "Consultant · Senior Consultant · Manager (PMU / Urban / Industrial Policy)",
    howToApplyWhenZeroListed:
      "Search 'Government' or 'Public Sector' on PwC India's Workday board and request an internal referral from IITD MPP alumni in G&PS.",
    applyUrl:
      "https://pwc.wd3.myworkdayjobs.com/Global_Experienced_Careers",
  },
  "ey-india": {
    slug: "ey-india",
    name: "EY India (Government & Public Sector / DPI)",
    category: "consulting",
    sectors: ["government", "tech_ai", "finance", "urban", "health"],
    tier: "core",
    hiringChannel: "Rolling Portal",
    bestFor: ["stem_btech", "work_ex", "econ_quant", "upsc_humanities"],
    entryRoles: "Analyst — Government Advisory · Consultant (0–2 yrs)",
    lateralRoles:
      "Consultant / Senior Consultant — Digital Government, AgriStack, ABDM & State PMUs",
    howToApplyWhenZeroListed:
      "EY G&PS hires continuously for central ministry and state PMU mandates; connect with Partner/Director teams on LinkedIn with a 1-page consulting CV.",
    applyUrl: "https://www.ey.com/en_in/careers",
  },
  "deloitte-india": {
    slug: "deloitte-india",
    name: "Deloitte India (Government & Public Services / Economic Advisory)",
    category: "consulting",
    sectors: ["government", "finance", "climate", "urban", "private_sector"],
    tier: "core",
    hiringChannel: "Rolling Portal",
    bestFor: ["econ_quant", "work_ex", "stem_btech"],
    entryRoles: "Analyst — Economic Advisory / GPS · Intern",
    lateralRoles:
      "Consultant · Deputy Manager · Manager (Public Policy, WASH, Urban & Decarbonization)",
    howToApplyWhenZeroListed:
      "Filter by 'Government & Public Services' or 'Economic Advisory' on Deloitte South Asia careers.",
    applyUrl: "https://www2.deloitte.com/in/en/careers.html",
  },
  "niti-aayog": {
    slug: "niti-aayog",
    name: "NITI Aayog",
    category: "government",
    sectors: ["government", "development", "health", "tech_ai", "climate"],
    tier: "safety_rolling",
    hiringChannel: "Monthly Window",
    bestFor: ["upsc_humanities", "stem_btech", "econ_quant", "work_ex"],
    entryRoles:
      "NITI Research Intern (Monthly 1st–10th Window) · Young Professional (YP)",
    lateralRoles: "Associate · Consultant / Senior Consultant (Verticals)",
    howToApplyWhenZeroListed:
      "NITI Aayog's online internship portal opens strictly from the 1st to the 10th of EVERY month at workforindia.niti.gov.in; YP/Consultant calls post under Work With NITI.",
    applyUrl: "https://workforindia.niti.gov.in",
  },
  "vidhi-legal-policy": {
    slug: "vidhi-legal-policy",
    name: "Vidhi Centre for Legal Policy",
    category: "think_tank",
    sectors: ["regulation", "government", "tech_ai", "climate"],
    tier: "core",
    hiringChannel: "Rolling Portal",
    bestFor: ["upsc_humanities", "stem_btech"],
    entryRoles:
      "Research Intern (Rolling 4-week cohorts) · Associate Fellow (Legal & Policy)",
    lateralRoles: "Senior Resident Fellow · Lead (Charkha / JALDI / Tech Law)",
    howToApplyWhenZeroListed:
      "Vidhi runs a rolling internship application portal year-round (apply at least 4 weeks before your intended start date with a 1,500-word legislative/policy writing sample).",
    applyUrl: "https://vidhilegalpolicy.in/careers/",
  },
  "esya-centre": {
    slug: "esya-centre",
    name: "Esya Centre",
    category: "think_tank",
    sectors: ["tech_ai", "regulation"],
    tier: "core",
    hiringChannel: "Cold Email + 2-Page Brief",
    bestFor: ["stem_btech", "upsc_humanities", "econ_quant"],
    entryRoles:
      "Research Intern · Junior Fellow · Research Assistant (Tech Policy & Digital Economy)",
    lateralRoles: "Fellow · Programme Manager",
    howToApplyWhenZeroListed:
      "Send a 2-page brief on AI governance, Digital Competition Bill, or DPDP Rules directly via Esya's careers page — they actively hire IITD MPP students.",
    applyUrl: "https://www.esyacentre.org/careers",
  },
  "koan-advisory": {
    slug: "koan-advisory",
    name: "Koan Advisory Group",
    category: "consulting",
    sectors: ["tech_ai", "regulation", "private_sector"],
    tier: "core",
    hiringChannel: "Cold Email + 2-Page Brief",
    bestFor: ["upsc_humanities", "stem_btech", "work_ex"],
    entryRoles: "Research Intern · Policy Analyst (New Media, AI & Competition)",
    lateralRoles: "Senior Policy Analyst · Manager",
    howToApplyWhenZeroListed:
      "Email careers@koanadvisory.com with a 1-page CV and a 1,000-word regulatory analysis of TRAI/CCI/MeitY consultations.",
    applyUrl: "https://www.koanadvisory.com/careers",
  },
  "sarvam-ai": {
    slug: "sarvam-ai",
    name: "Sarvam AI",
    category: "private_sector",
    sectors: ["tech_ai", "government", "regulation"],
    tier: "reach",
    hiringChannel: "Live ATS Board",
    bestFor: ["stem_btech", "work_ex"],
    entryRoles: "AI Policy & DPI Intern · Deployment Strategist (Population-Scale AI)",
    lateralRoles: "Public Sector & IndiaAI Mission Lead · Product Policy Manager",
    howToApplyWhenZeroListed:
      "Pitch voice-AI e-governance pilot case studies for state departments on Sarvam's Ashby board or via IITD faculty/alumni links.",
    applyUrl: "https://www.sarvam.ai/careers",
  },
  "egov-foundation": {
    slug: "egov-foundation",
    name: "eGov Foundation (DIGIT DPI)",
    category: "ngo",
    sectors: ["tech_ai", "urban", "government", "health", "finance"],
    tier: "core",
    hiringChannel: "Rolling Portal",
    bestFor: ["stem_btech", "work_ex", "upsc_humanities"],
    entryRoles: "Program Associate — Policy & Advocacy · Implementation Analyst",
    lateralRoles:
      "Policy Manager (Public Financial Management / Urban / Health DPI) · Engagement Lead",
    howToApplyWhenZeroListed:
      "Apply via egov.org.in/careers highlighting Digital Public Infrastructure (DIGIT), municipal governance, or state health mission experience.",
    applyUrl: "https://egov.org.in/careers/",
  },
  graam: {
    slug: "graam",
    name: "GRAAM (Grassroots Research and Advocacy Movement)",
    category: "think_tank",
    sectors: ["development", "education", "health", "government", "agriculture"],
    tier: "safety_rolling",
    hiringChannel: "Live ATS Board",
    bestFor: ["upsc_humanities", "econ_quant"],
    entryRoles:
      "Research Intern · Research Associate · Project Coordinator (Rural & Participatory Eval)",
    lateralRoles: "Senior Research Associate · Head of Research",
    howToApplyWhenZeroListed:
      "GRAAM actively recruits MPP students for winter/summer field evaluations and full-time research roles on graam.org.in/career.",
    applyUrl: "https://graam.org.in/career/",
  },
  "pravi-research": {
    slug: "pravi-research",
    name: "Pravi Research",
    category: "research",
    sectors: ["development", "government", "education", "gender"],
    tier: "safety_rolling",
    hiringChannel: "Cold Email + 2-Page Brief",
    bestFor: ["upsc_humanities", "econ_quant"],
    entryRoles: "Research Intern · Research Associate (Mixed-Methods & Field Studies)",
    lateralRoles: "Project Lead · Senior Research Associate",
    howToApplyWhenZeroListed:
      "Reach out via praviresearch.com with primary survey design, qualitative coding, and field research samples.",
    applyUrl: "https://www.praviresearch.com/home.html",
  },
  nfprc: {
    slug: "nfprc",
    name: "Nation First Policy Research Centre (NFPRC)",
    category: "think_tank",
    sectors: ["government", "regulation", "development"],
    tier: "safety_rolling",
    hiringChannel: "Cold Email + 2-Page Brief",
    bestFor: ["upsc_humanities", "econ_quant"],
    entryRoles: "Policy Research Intern · Policy Research Fellow / Associate",
    lateralRoles: "Senior Research Fellow",
    howToApplyWhenZeroListed:
      "Apply via nfprc.org with a policy white-paper sample on union/state flagship welfare schemes or constitutional governance.",
    applyUrl: "https://nfprc.org/",
  },
  "crisp-india": {
    slug: "crisp-india",
    name: "Centre for Research in Schemes and Policies (CRISP)",
    category: "ngo",
    sectors: ["government", "education", "health", "agriculture"],
    tier: "core",
    hiringChannel: "Annual Cohort Window",
    bestFor: ["upsc_humanities", "econ_quant", "work_ex"],
    entryRoles: "CRISP Fellow · Research Intern",
    lateralRoles: "State Lead · Senior Programme Manager",
    howToApplyWhenZeroListed:
      "Monitor crispindia.net for the CRISP Fellowship working directly with retired Union Secretaries and state governments.",
    applyUrl: "https://crispindia.net/",
  },
  "microsave-consulting": {
    slug: "microsave-consulting",
    name: "MicroSave Consulting (MSC)",
    category: "consulting",
    sectors: ["finance", "development", "tech_ai", "gender", "climate"],
    tier: "core",
    hiringChannel: "Rolling Portal",
    bestFor: ["econ_quant", "work_ex", "upsc_humanities", "stem_btech"],
    entryRoles: "Analyst — Financial Inclusion, DBT & Social Protection · Intern",
    lateralRoles: "Assistant Manager · Consultant · Senior Manager",
    howToApplyWhenZeroListed:
      "Submit your CV to MSC's talent pool on microsave.net/careers focusing on DBT, ONDC, fintech regulation, or SHG livelihoods.",
    applyUrl: "https://www.microsave.net/careers/",
  },
  bowergroupasia: {
    slug: "bowergroupasia",
    name: "BowerGroupAsia (BGA India)",
    category: "consulting",
    sectors: ["regulation", "private_sector", "tech_ai", "health", "climate"],
    tier: "reach",
    hiringChannel: "Cold Email + 2-Page Brief",
    bestFor: ["work_ex", "upsc_humanities", "stem_btech"],
    entryRoles: "Analyst / Research Intern — India Government Affairs",
    lateralRoles: "Senior Analyst · Manager · Director (Public Policy)",
    howToApplyWhenZeroListed:
      "BGA hires India Analysts for New Delhi & Mumbai to brief global tech, healthcare & energy clients; apply via bowergroupasia.com/careers.",
    applyUrl: "https://bowergroupasia.com/careers/",
  },
  icrier: {
    slug: "icrier",
    name: "ICRIER (Indian Council for Research on International Economic Relations)",
    category: "think_tank",
    sectors: ["finance", "tech_ai", "climate", "agriculture", "regulation"],
    tier: "core",
    hiringChannel: "Live ATS Board",
    bestFor: ["econ_quant", "stem_btech", "upsc_humanities"],
    entryRoles: "Research Assistant · Research Associate · Intern",
    lateralRoles: "Fellow · Senior Fellow",
    howToApplyWhenZeroListed:
      "ICRIER posts rolling project-based RA/Associate calls under icrier.org/work-with-us across Digital Economy, Trade, Climate & Agriculture.",
    applyUrl: "https://icrier.org/work-with-us/",
  },
  csep: {
    slug: "csep",
    name: "Centre for Social and Economic Progress (CSEP)",
    category: "think_tank",
    sectors: ["finance", "climate", "health", "government"],
    tier: "core",
    hiringChannel: "Rolling Portal",
    bestFor: ["econ_quant", "upsc_humanities", "stem_btech"],
    entryRoles: "Research Intern (Summer/Winter) · Research Analyst · Research Associate",
    lateralRoles: "Associate Fellow · Fellow",
    howToApplyWhenZeroListed:
      "Apply via csep.org/about/internships/ or csep.org/about/current-openings/ with a strong quantitative or fiscal/energy policy writing sample.",
    applyUrl: "https://csep.org/about/current-openings/",
  },
  nipfp: {
    slug: "nipfp",
    name: "National Institute of Public Finance and Policy (NIPFP)",
    category: "think_tank",
    sectors: ["finance", "government", "regulation"],
    tier: "safety_rolling",
    hiringChannel: "Cold Email + 2-Page Brief",
    bestFor: ["econ_quant", "upsc_humanities"],
    entryRoles: "Research Intern · Research Assistant / Economist",
    lateralRoles: "Project Consultant · Fellow (Public Finance & Macro)",
    howToApplyWhenZeroListed:
      "Check nipfp.org.in/careers and email faculty working on GST, state finances, or macroeconomic modelling with your Stata/R code sample.",
    applyUrl: "https://www.nipfp.org.in/careers/",
  },
};

export interface AssignmentBlueprint {
  id: string;
  title: string;
  targetOrgs: string;
  sector: string;
  archetype: BackgroundId;
  timeLimit: string;
  deliverable: string;
  promptText: string;
  winningStructure: string[];
  indianContextMustCites: string[];
  eliminationMistakes: string[];
}

export const ASSIGNMENT_BLUEPRINTS: AssignmentBlueprint[] = [
  {
    id: "ceew-power-tariff",
    title: "Think-Tank Brief: State Discom Green Open Access & Tariff Reform",
    targetOrgs: "CEEW · WRI India · CSEP · Vasudha · Swaniti",
    sector: "Climate & Energy",
    archetype: "stem_btech",
    timeLimit: "48 Hours",
    deliverable: "1,200-Word Policy Memo + 1 Summary Chart (R/Excel)",
    promptText:
      "Draft a 2-page policy brief for a State Energy Secretary evaluating why Commercial & Industrial (C&I) adoption of Green Energy Open Access (GEOA) remains slow despite the Ministry of Power's 100 kW threshold rule, while protecting the financial health of state DISCOMs.",
    winningStructure: [
      "Box 1 (Top 15% of Page 1): Executive Summary with 3 numbered, quantified recommendations (BLUF — Bottom Line Up Front).",
      "Section 1 (250 words): The Bottleneck — decompose Cross-Subsidy Surcharge (CSS), Additional Surcharge (AS), and banking charges imposed by SERCs.",
      "Section 2 (400 words + 1 Chart): Comparative Evidence — compare tariff orders across 3 states (e.g., Karnataka, Maharashtra, Gujarat) showing landed cost of GEOA vs. grid tariff.",
      "Section 3 (350 words): Phased Regulatory Pathway — propose a time-of-day (ToD) banking mechanism and predictable 5-year CSS trajectory.",
    ],
    indianContextMustCites: [
      "Electricity (Promoting Renewable Energy Through Green Energy Open Access) Rules, 2022",
      "State Electricity Regulatory Commission (SERC) Multi-Year Tariff (MYT) Orders",
      "RDSS (Revamped Distribution Sector Scheme) AT&C loss trajectories & PM-KUSUM Feeder Solarisation",
    ],
    eliminationMistakes: [
      "Writing a generic essay on climate change instead of analyzing SERC tariff components (CSS, wheeling, banking).",
      "Ignoring the political economy of agricultural cross-subsidies and state fiscal space.",
    ],
  },
  {
    id: "samagra-fln-case",
    title: "Governance Consulting Case: State Foundational Literacy (FLN) Turnaround",
    targetOrgs: "Samagra · Central Square Foundation · Dalberg · Sattva · PwC G&PS",
    sector: "Education & State Capacity",
    archetype: "upsc_humanities",
    timeLimit: "48 Hours",
    deliverable: "6-Slide Pyramid-Principle Deck (PDF)",
    promptText:
      "A State Education Department has seen NIPUN Bharat Grade-3 reading fluency stall at 34% across 45,000 government primary schools despite distributing new workbooks. Design a 12-month governance & academic execution roadmap for the Mission Director.",
    winningStructure: [
      "Slide 1: Diagnosis Issue Tree (MECE) — split into Academic Inputs (pedagogy, TLM), Teacher Capacity & Time-on-Task (admin burden), and Governance/Monitoring (ARP/BRP school visits).",
      "Slide 2: Root-Cause Prioritization — show why classroom instructional time and mentor (BRP/CRP) supportive supervision are the binding constraints.",
      "Slide 3: Intervention 1 (Academic) — structured 90-minute daily teaching-at-the-right-level (TaRL) block + integrated teacher guide + workbook tracker.",
      "Slide 4: Intervention 2 (Governance & Tech) — mobile spot-assessment app for Block Resource Persons (BRPs) + monthly District Magistrate (DM) review dashboard.",
      "Slide 5: 90-Day Pilot → State Scale Rollout Plan, KPIs, and Risk Mitigation.",
    ],
    indianContextMustCites: [
      "NIPUN Bharat Mission guidelines, UDISE+ & ASER / NAS (PARAKH) benchmarks",
      "SCERT / DIET academic cadence & Block/Cluster Resource Coordinators (BRCs/CRCs)",
      "Samagra Shiksha Annual Work Plan & Budget (AWP&B)",
    ],
    eliminationMistakes: [
      "Proposing expensive new hardware/tablets for every child instead of fixing existing teacher-mentor workflows.",
      "Using descriptive slide titles ('Background', 'Solutions') instead of assertion-based action titles ('BRP administrative load reduces classroom coaching to <12% of visits').",
    ],
  },
  {
    id: "koan-esya-dpdp",
    title: "Tech Policy Critique: DPDP Act Rules & AI Training Data Governance",
    targetOrgs: "Koan Advisory · Esya Centre · Vidhi · Ikigai Law · Sarvam AI · BGA",
    sector: "Tech, AI & Regulation",
    archetype: "stem_btech",
    timeLimit: "48 Hours",
    deliverable: "1,000-Word Regulatory Submission / Client Briefing",
    promptText:
      "Prepare a regulatory briefing note for MeitY / an Indian foundation-model consortium analyzing the tension between verifiable parental consent, notice-and-consent obligations under the Digital Personal Data Protection (DPDP) Act, 2023, and training multilingual Indian AI models.",
    winningStructure: [
      "Section 1 (200 words): Statutory Mapping — cite Section 3(c)(ii) (publicly available personal data exemption) and Section 7 (legitimate uses) vs. Section 9 (children's data).",
      "Section 2 (350 words): Technical & Compliance Friction — explain how token-level unlearning and retroactive withdrawal of consent affect pre-trained weights vs. RAG pipelines.",
      "Section 3 (300 words): Comparative Regulatory Benchmarks — contrast EU AI Act / GDPR legitimate interest, Singapore PDPC AI Advisory Guidelines, and Japan's copyright/data rules.",
      "Section 4 (150 words): Concrete Rule-Making Language — draft a specific safe-harbor clause or sandbox condition under Section 17(2)(b) (research/statistical exemption).",
    ],
    indianContextMustCites: [
      "Digital Personal Data Protection Act, 2023 (Sections 3, 6, 7, 9, 17) & Draft DPDP Rules",
      "IndiaAI Mission (AIKosh datasets, compute pillar) & Digital India Act consultations",
      "Data Protection Board of India (DPBI) enforcement architecture",
    ],
    eliminationMistakes: [
      "Writing generic ethical AI platitudes without citing exact sections of the DPDP Act, 2023.",
      "Copy-pasting EU GDPR analysis without noting that the DPDP Act replaced 'legitimate interest' with 'certain legitimate uses' (Section 7).",
    ],
  },
  {
    id: "jpal-idinsight-rct",
    title: "Impact Evaluation & Data Test: Household Survey Cleaning & RCT Threats",
    targetOrgs: "J-PAL South Asia · IDinsight · World Bank DIME · IFMR LEAD",
    sector: "Development & Econometrics",
    archetype: "econ_quant",
    timeLimit: "3 Hours (Timed Quant Test)",
    deliverable: "Commented R / Stata Script + 600-Word Technical Memo",
    promptText:
      "You are given a raw baseline survey of 4,200 rural households across 120 gram panchayats for a randomized evaluation of a women's SHG digital credit intervention. Clean duplicate household IDs, handle top-coded income outliers, test baseline balance across treatment and control, and diagnose 2 threats to internal validity.",
    winningStructure: [
      "Step 1 (Code Hygiene): Master script with relative file paths, seed set, clear section headers, and zero hard-coded row deletions.",
      "Step 2 (Data Cleaning Log): Document exact handling of `-99`/`999` missing codes, duplicate `hh_id` resolution, and 99th-percentile winsorization of household expenditure.",
      "Step 3 (Balance Table): Run cluster-robust regressions (`vce(cluster gp_id)`) of baseline covariates on treatment assignment and report joint F-test orthogonality.",
      "Step 4 (Econometric Memo): Explain why standard errors must be clustered at the Gram Panchayat level (unit of randomization) and how differential attrition or spillover across SHG federations would bias ITT estimates.",
    ],
    indianContextMustCites: [
      "NRLM (DAY-NRLM) SHG-Bank Linkage & Village Organization (VO) structure",
      "Cluster randomization at Gram Panchayat / Block level & SurveyCTO high-frequency checks (HFCs)",
    ],
    eliminationMistakes: [
      "Dropping observations with missing covariates without checking if missingness is correlated with treatment.",
      "Forgetting to cluster standard errors at the randomization unit (Gram Panchayat) when running balance regressions.",
    ],
  },
  {
    id: "prs-bill-digest",
    title: "Legislative Brief: Parliamentary Standing Committee Analysis",
    targetOrgs: "PRS Legislative Research · LAMP Fellowship · Swaniti · Vidhi · Chase India",
    sector: "Legislation & Parliament",
    archetype: "upsc_humanities",
    timeLimit: "24 Hours",
    deliverable: "800-Word Non-Partisan Legislative Brief for an MP",
    promptText:
      "A Member of Parliament has been nominated to the Department-Related Standing Committee examining a new Central Bill regulating gig and platform workers' social security contributions. Draft a strictly non-partisan 2-page briefing note highlighting key provisions, constitutional competence, and 4 questions the MP should raise during clause-by-clause scrutiny.",
    winningStructure: [
      "Part 1 (150 words): Context & Key Features of the Bill (aggregator contribution cap, welfare board composition, portability).",
      "Part 2 (350 words): Key Issues for Consideration — (a) Overlap with Code on Social Security, 2020 vs. State Acts (Rajasthan/Karnataka), (b) Incidence of per-transaction cess on consumers vs. worker take-home pay, (c) Algorithmic transparency & deactivation appeals.",
      "Part 3 (200 words): 4 Sharp Questions for Ministry Witnesses during Committee Depositions.",
    ],
    indianContextMustCites: [
      "Code on Social Security, 2020 (Section 114 — Gig & Platform Workers) & e-Shram portal",
      "Seventh Schedule — Concurrent List (Entries 23 & 24: Social Security and Labour Welfare)",
      "Rajasthan Platform Based Gig Workers (Registration and Welfare) Act, 2023 & Karnataka Draft Bill",
    ],
    eliminationMistakes: [
      "Taking a partisan or activist tone — PRS/LAMP briefs must present competing arguments neutrally with empirical/statutory backing.",
    ],
  },
];

export interface MonthlyActionWindow {
  title: string;
  organization: string;
  windowLabel: string;
  experience: string;
  sectors: string[];
  actionNote: string;
  url: string;
}

export const MONTHLY_ACTION_WINDOWS: MonthlyActionWindow[] = [
  {
    title: "NITI Aayog Research Internship Portal (Monthly 1st–10th Window)",
    organization: "NITI Aayog",
    windowLabel: "OPEN 1ST–10TH OF EVERY MONTH",
    experience: "0-2",
    sectors: ["government", "development", "health", "tech_ai", "climate"],
    actionNote:
      "Portal opens strictly on the 1st and closes on the 10th of each month. Apply up to 2 months in advance of your desired start month (e.g. apply Nov 1–10 for Dec/Jan winter internship).",
    url: "https://workforindia.niti.gov.in",
  },
  {
    title: "Competition Commission of India (CCI) Economics & Law Internship",
    organization: "Competition Commission of India (CCI)",
    windowLabel: "ROLLING MONTHLY (APPLY BEFORE 1ST OF PRIOR MONTH)",
    experience: "0-2",
    sectors: ["regulation", "finance", "tech_ai"],
    actionNote:
      "Stipend ₹15,000/month. Covers digital markets, antitrust, and M&A combinations. Submit application before the 1st of the preceding month.",
    url: "https://www.cci.gov.in/internship",
  },
  {
    title: "DPIIT (Ministry of Commerce & Industry) Internship & Young Professional Scheme",
    organization: "DPIIT, Govt of India",
    windowLabel: "OPEN ROLLING YEAR-ROUND",
    experience: "0-2",
    sectors: ["finance", "private_sector", "government", "regulation"],
    actionNote:
      "Stipend ₹10,000/month (Interns) / ₹60,000–₹70,000/month (YPs). Ideal for industrial policy, Make in India, PLI schemes, Startup India, and ONDC.",
    url: "https://dpiit.gov.in/internship-scheme",
  },
  {
    title: "MEA (Ministry of External Affairs) Internship Programme",
    organization: "Ministry of External Affairs",
    windowLabel: "2 TERMS / YEAR (STIPEND ₹10K/MO + AIRFARE)",
    experience: "0-2",
    sectors: ["government", "development"],
    actionNote:
      "Open to Indian graduate/post-graduate students in Public Policy, International Relations, Law, and Economics via internship.mea.gov.in.",
    url: "https://internship.mea.gov.in/",
  },
  {
    title: "LAMP Fellowship (Legislative Assistants to Members of Parliament)",
    organization: "PRS Legislative Research",
    windowLabel: "PEAK WINDOW: NOV – JAN",
    experience: "0-2",
    sectors: ["government", "regulation"],
    actionNote:
      "11-month flagship parliamentary fellowship in New Delhi. Requires two 500-word essays (one policy problem analysis + one statement of intent).",
    url: "https://prsindia.org/lamp",
  },
  {
    title: "Vidhi Centre for Legal Policy Rolling Internship & Fellowship Track",
    organization: "Vidhi Centre for Legal Policy",
    windowLabel: "ROLLING (APPLY 4 WEEKS PRIOR TO START)",
    experience: "0-2",
    sectors: ["regulation", "tech_ai", "government"],
    actionNote:
      "Accepts MPP and law students year-round across Digital Law, Climate, Health, and Judicial Reforms. Requires a 1,500-word writing sample.",
    url: "https://vidhilegalpolicy.in/careers/",
  },
];

export function reframeBulletForPolicy(
  rawBullet: string,
  background: BackgroundId,
): {
  thinkTank: string;
  governanceConsulting: string;
  techRegulatory: string;
} {
  const clean = rawBullet.trim().replace(/^[-•*]\s*/, "");
  const topic =
    clean.length > 8
      ? clean.replace(/\.$/, "")
      : "state-level public service delivery and regulatory reform";

  if (background === "upsc_humanities") {
    return {
      thinkTank: `Synthesized statutory frameworks, parliamentary committee reports, and union/state budget allocations on "${topic}", authoring a 2,000-word empirical policy brief with 3 actionable legislative recommendations.`,
      governanceConsulting: `Diagnosed last-mile implementation bottlenecks across district/state administrative workflows for "${topic}", designing a 4-stage KPI monitoring framework and stakeholder execution roadmap.`,
      techRegulatory: `Mapped constitutional competence, delegated legislation, and regulatory compliance obligations surrounding "${topic}", benchmarking Indian statutory provisions against global OECD/EU frameworks.`,
    };
  }

  if (background === "stem_btech") {
    return {
      thinkTank: `Built a reproducible Python/R data pipeline to clean and analyze 10,000+ administrative records on "${topic}", translating quantitative trends into a 2-page policy brief for public-sector decision-makers.`,
      governanceConsulting: `Engineered an automated KPI tracking dashboard and diagnostic issue tree for "${topic}", reducing manual reporting latency and enabling data-backed programme reviews across multi-stakeholder teams.`,
      techRegulatory: `Evaluated system architecture, Digital Public Infrastructure (DPI) interoperability, and DPDP Act data-governance risks for "${topic}", drafting technical-regulatory compliance specifications.`,
    };
  }

  if (background === "econ_quant") {
    return {
      thinkTank: `Estimated econometric specifications and summary balance tables in Stata/R on "${topic}" using unit-level survey/administrative microdata, isolating key fiscal and distributional trade-offs.`,
      governanceConsulting: `Conducted cost-effectiveness and fiscal impact modelling on "${topic}", structuring a prioritized investment and M&E indicator matrix for institutional leadership.`,
      techRegulatory: `Analyzed market concentration, pricing dynamics, and consumer-welfare effects in "${topic}", preparing competition and regulatory impact evidence aligned with CCI/TRAI methodologies.`,
    };
  }

  return {
    thinkTank: `Led multi-stakeholder empirical research and policy synthesis on "${topic}", managing end-to-end deliverable quality across government departments, industry bodies, and academic advisors.`,
    governanceConsulting: `Directed cross-functional workstreams on "${topic}", owning client/ministry review decks, PMU milestone tracking, and on-time delivery across senior bureaucratic stakeholders.`,
    techRegulatory: `Spearheaded regulatory strategy and institutional engagement on "${topic}", translating complex statutory shifts into executive risk briefs and government-affairs submissions.`,
  };
}
