import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { makeFingerprint } from "../src/lib/classify";

loadEnv({ path: ".env.local" });

interface SeedOrg {
  slug: string;
  name: string;
  website?: string;
  careersUrl?: string;
  category?: string;
  sectors?: string[];
  hq?: string;
  description?: string;
  source?: {
    type: string;
    config: Record<string, unknown>;
  };
}

interface SeedRecurring {
  title: string;
  orgSlug?: string | null;
  orgName: string;
  type?: string;
  experience?: string;
  sectors?: string[];
  typicalOpenMonth?: number;
  typicalCloseMonth?: number;
  eligibility?: string;
  url?: string;
  notes?: string;
}

const CURATED_JOBS = [
  // --- Internships (Dec 2026+ for First-Year MPP Students) ---
  {
    orgSlug: "ceew",
    orgName: "Council on Energy, Environment and Water (CEEW)",
    title: "Research Intern — Clean Energy Transition & Power Markets (Winter/Spring Cycle)",
    url: "https://www.ceew.in/careers",
    location: "New Delhi",
    locationType: "india",
    type: "internship",
    experience: "0-2",
    sectors: ["climate", "finance", "government"],
    deadline: "2026-12-05",
    description:
      "Support CEEW's Power Markets and Renewable Energy team with state electricity regulatory commission (SERC) tariff order analysis, discom financial modelling, and policy briefs for MNRE and state energy departments. Ideal for 1st-year MPP students looking for December 2026 / January 2027 internships.",
  },
  {
    orgSlug: "prs-legislative-research",
    orgName: "PRS Legislative Research",
    title: "Winter Policy & Legislative Research Intern (Dec 2026 – Jan 2027)",
    url: "https://prsindia.org/careers",
    location: "New Delhi",
    locationType: "india",
    type: "internship",
    experience: "0-2",
    sectors: ["regulation", "government"],
    deadline: "2026-11-28",
    description:
      "Assist PRS analysts in tracking Parliamentary Standing Committee reports, drafting Bill summaries ahead of the Winter Session of Parliament, and compiling state assembly legislative trends.",
  },
  {
    orgSlug: "niti-aayog",
    orgName: "NITI Aayog",
    title: "NITI Aayog Research Internship Scheme (December 2026 / January 2027 Cohort)",
    url: "https://workforindia.niti.gov.in",
    location: "New Delhi",
    locationType: "india",
    type: "internship",
    experience: "0-2",
    sectors: ["government", "development", "health", "tech_ai"],
    deadline: "2026-12-10",
    description:
      "Monthly rolling internship window (1st–10th of each month) across NITI Aayog verticals including Health, Digital Economy, Aspirational Districts, Green Transition, and State Coordination.",
  },
  {
    orgSlug: "sarvam-ai",
    orgName: "Sarvam AI",
    title: "AI Policy & Population-Scale DPI Intern",
    url: "https://www.sarvam.ai/careers",
    location: "Bengaluru / Hybrid",
    locationType: "india",
    type: "internship",
    experience: "0-2",
    sectors: ["tech_ai", "regulation", "government"],
    deadline: "2026-12-15",
    description:
      "Work with Sarvam's public-interest AI deployment team on multilingual sovereign AI benchmarks, IndiaAI Mission alignment, voice-first e-governance pilots, and DPDP compliance documentation.",
  },
  {
    orgSlug: "jpal-south-asia",
    orgName: "J-PAL South Asia",
    title: "Research & Policy Internship (Winter / Spring 2027)",
    url: "https://www.povertyactionlab.org/careers",
    location: "New Delhi / Chennai / Ahmedabad",
    locationType: "india",
    type: "internship",
    experience: "0-2",
    sectors: ["development", "health", "education", "gender"],
    deadline: "2026-12-12",
    description:
      "Contribute to randomized evaluations (RCTs), survey instrument piloting, Stata/R data cleaning, and policy outreach notes with state governments in Tamil Nadu, Odisha, and Punjab.",
  },
  {
    orgSlug: "esya-centre",
    orgName: "Esya Centre",
    title: "Tech Policy & Digital Economy Research Intern",
    url: "https://www.esyacentre.org/careers",
    location: "New Delhi",
    locationType: "india",
    type: "internship",
    experience: "0-2",
    sectors: ["tech_ai", "regulation"],
    deadline: "2026-12-08",
    description:
      "Research emerging technology regulation including the Digital Competition Bill, AI safety governance, telecom spectrum policy, and cross-border data flows.",
  },

  // --- 0–2 Years (Graduating Class of May 2027 & Early Career) ---
  {
    orgSlug: "prs-legislative-research",
    orgName: "PRS Legislative Research",
    title: "LAMP Fellowship 2027–28 (Legislative Assistants to Members of Parliament)",
    url: "https://prsindia.org/lamp",
    location: "New Delhi",
    locationType: "india",
    type: "fellowship",
    experience: "0-2",
    sectors: ["government", "regulation"],
    deadline: "2026-12-22",
    description:
      "Flagship 11-month fellowship pairing young policy graduates one-on-one with a Member of Parliament (Lok Sabha / Rajya Sabha) to draft parliamentary questions, private member bills, standing committee briefs, and speeches.",
  },
  {
    orgSlug: "samagra",
    orgName: "Samagra | Transforming Governance",
    title: "Associate — Governance Consulting (2027 Graduating Batch)",
    url: "https://samagragovernance.in/careers/",
    location: "New Delhi / Chandigarh / Bhubaneswar",
    locationType: "india",
    type: "full_time",
    experience: "0-2",
    sectors: ["government", "education", "agriculture", "health", "tech_ai"],
    deadline: "2026-12-18",
    description:
      "Work directly with Chief Minister's Offices and state departments to design and deliver large-scale governance transformation programmes leveraging data and technology.",
  },
  {
    orgSlug: "idinsight",
    orgName: "IDinsight",
    title: "Associate — Data-on-Demand & Impact Evaluation (India)",
    url: "https://jobs.ashbyhq.com/idinsight",
    location: "New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "0-2",
    sectors: ["development", "health", "education"],
    deadline: "2026-12-20",
    description:
      "Support government and philanthropic leaders across South Asia using econometric impact evaluations, process evaluations, and rapid monitoring systems. Strong Stata/R and quantitative methods required.",
  },
  {
    orgSlug: "microsave-consulting",
    orgName: "MicroSave Consulting (MSC)",
    title: "Analyst — Digital Financial Inclusion & Social Protection",
    url: "https://www.microsave.net/careers/",
    location: "Gurugram / Lucknow",
    locationType: "india",
    type: "full_time",
    experience: "0-2",
    sectors: ["finance", "development", "tech_ai", "gender"],
    deadline: "2027-01-10",
    description:
      "Conduct field research and policy advisory on Direct Benefit Transfers (DBT), ONDC rural commerce, women's SHG digitization, and climate resilience finance.",
  },
  {
    orgSlug: "graam",
    orgName: "GRAAM (Grassroots Research and Advocacy Movement)",
    title: "Research Associate — Participatory Evaluation & Rural Governance",
    url: "https://graam.org.in/career/",
    location: "Mysuru / Bengaluru",
    locationType: "india",
    type: "part_time",
    experience: "0-2",
    sectors: ["development", "education", "health", "government"],
    deadline: "2026-12-14",
    description:
      "Lead mixed-methods field studies, community consultations, and CSR/government programme evaluations across Karnataka and southern states.",
  },
  {
    orgSlug: "pravi-research",
    orgName: "Pravi Research",
    title: "Research Associate — Public Systems & Social Impact",
    url: "https://www.praviresearch.com/home.html",
    location: "New Delhi / Field",
    locationType: "india",
    type: "full_time",
    experience: "0-2",
    sectors: ["development", "government", "education"],
    deadline: "2026-12-30",
    description:
      "Design and execute primary research studies, stakeholder interviews, and policy synthesis notes for social sector foundations and state missions.",
  },
  {
    orgSlug: "nfprc",
    orgName: "Nation First Policy Research Centre (NFPRC)",
    title: "Policy Research Fellow — Governance & Strategic Affairs",
    url: "https://nfprc.org/",
    location: "New Delhi",
    locationType: "india",
    type: "fellowship",
    experience: "0-2",
    sectors: ["government", "regulation", "development"],
    deadline: "2026-12-28",
    description:
      "Undertake empirical policy research, draft white papers on flagship union and state welfare schemes, and organize policy roundtables.",
  },
  {
    orgSlug: "crisp-india",
    orgName: "Centre for Research in Schemes and Policies (CRISP)",
    title: "CRISP Fellowship — State Social Sector Schemes",
    url: "https://crispindia.net/careers",
    location: "Hyderabad / New Delhi / State Capitals",
    locationType: "india",
    type: "fellowship",
    experience: "0-2",
    sectors: ["government", "education", "health", "agriculture"],
    deadline: "2027-01-05",
    description:
      "Work alongside senior retired civil servants and state secretaries to redesign implementation bottlenecks in rural development, higher education, and public health.",
  },

  // --- 3–5 Years (Mid-Level Policy, Consulting & Regulation) ---
  {
    orgSlug: "pwc-india",
    orgName: "PwC India",
    title: "Consultant / Senior Associate — Government & Public Sector (G&PS) Advisory",
    url: "https://www.pwc.in/careers.html",
    location: "New Delhi / Gurugram / Mumbai",
    locationType: "india",
    type: "full_time",
    experience: "3-5",
    sectors: ["government", "private_sector", "urban", "finance"],
    deadline: "2026-12-25",
    description:
      "Advise central ministries and state governments on PMUs, industrial policy, semiconductor/EV incentive schemes, urban infrastructure financing, and ease-of-doing-business reforms.",
  },
  {
    orgSlug: "ey-india",
    orgName: "EY India",
    title: "Consultant — Digital Government & DPI Practice",
    url: "https://www.ey.com/en_in/careers",
    location: "New Delhi / Bengaluru",
    locationType: "india",
    type: "full_time",
    experience: "3-5",
    sectors: ["tech_ai", "government", "private_sector"],
    deadline: "2027-01-08",
    description:
      "Support national and state e-governance missions on AgriStack, Ayushman Bharat Digital Mission (ABDM), and AI adoption in public service delivery.",
  },
  {
    orgSlug: "deloitte-india",
    orgName: "Deloitte India",
    title: "Senior Analyst / Consultant — Economic & Public Policy Advisory",
    url: "https://www2.deloitte.com/in/en/careers.html",
    location: "New Delhi / Mumbai",
    locationType: "india",
    type: "full_time",
    experience: "3-5",
    sectors: ["finance", "climate", "government", "private_sector"],
    deadline: "2026-12-29",
    description:
      "Deliver economic impact assessments, green hydrogen & decarbonization roadmaps, and trade & industrial policy studies for ministries and multilateral agencies.",
  },
  {
    orgSlug: "koan-advisory",
    orgName: "Koan Advisory Group",
    title: "Senior Policy Analyst — Technology, Media & AI Regulation",
    url: "https://www.koanadvisory.com/careers",
    location: "New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "3-5",
    sectors: ["tech_ai", "regulation", "private_sector"],
    deadline: "2026-12-19",
    description:
      "Lead regulatory tracking, competition law analysis, and stakeholder consultations on AI governance, DPDP Rules, fintech regulation, and intermediary liability.",
  },
  {
    orgSlug: "wadhwani-ai",
    orgName: "Wadhwani AI",
    title: "Program Manager — AI Solutions for Public Health & Agriculture",
    url: "https://www.wadhwaniai.org/careers/",
    location: "Mumbai / New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "3-5",
    sectors: ["tech_ai", "health", "agriculture", "government"],
    deadline: "2027-01-12",
    description:
      "Manage deployment and adoption of AI-powered clinical and pest-management tools across National Health Mission (NHM) and Ministry of Agriculture workflows.",
  },
  {
    orgSlug: "egov-foundation",
    orgName: "eGov Foundation",
    title: "Policy & Ecosystem Manager — DIGIT Urban & Sanitation DPI",
    url: "https://egov.org.in/careers/",
    location: "Bengaluru",
    locationType: "india",
    type: "full_time",
    experience: "3-5",
    sectors: ["tech_ai", "urban", "government"],
    deadline: "2027-01-15",
    description:
      "Drive state and global adoption of open-source Digital Public Goods (DIGIT) across municipal finance, urban service delivery, and public health.",
  },
  {
    orgSlug: "nation-with-namo",
    orgName: "Nation with NaMo",
    title: "Political & Governance Consulting Associate (State Campaigns & Policy)",
    url: "https://www.nationwithnamo.com/careers",
    location: "New Delhi / State Capitals",
    locationType: "india",
    type: "full_time",
    experience: "3-5",
    sectors: ["government", "development"],
    deadline: "2026-12-24",
    description:
      "Combine constituency-level quantitative survey diagnostics, welfare scheme feedback, and governance communication strategy.",
  },

  // --- 5–10 Years (Senior Fellows, Engagement Managers & Multilaterals) ---
  {
    orgSlug: "bowergroupasia",
    orgName: "BowerGroupAsia (BGA)",
    title: "Manager — Government Affairs & Public Policy (India Practice)",
    url: "https://bowergroupasia.com/careers/",
    location: "New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "5-10",
    sectors: ["regulation", "private_sector", "tech_ai", "health"],
    deadline: "2027-01-18",
    description:
      "Advise multinational technology, healthcare, and clean-energy clients on Indian union/state regulatory developments, trade policy, and PLI schemes.",
  },
  {
    orgSlug: "wri-india",
    orgName: "WRI India",
    title: "Senior Programme Manager — Sustainable Cities & Electric Mobility",
    url: "https://wri-india.org/careers",
    location: "Bengaluru / Mumbai / New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "5-10",
    sectors: ["climate", "urban", "government"],
    deadline: "2027-01-14",
    description:
      "Lead state electric bus procurement frameworks, net-zero urban transport planning, and climate finance mobilization with municipal corporations.",
  },
  {
    orgSlug: "dalberg",
    orgName: "Dalberg Advisors",
    title: "Project Manager — Social Impact & Climate Strategy",
    url: "https://dalberg.com/careers/",
    location: "Mumbai / New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "5-10",
    sectors: ["development", "climate", "health", "private_sector"],
    deadline: "2027-01-20",
    description:
      "Lead multi-country strategy engagements for philanthropic foundations, bilateral development agencies, and governments across South Asia.",
  },
  {
    orgSlug: "oecd",
    orgName: "OECD",
    title: "Policy Analyst — AI Governance & Digital Economy (Remote / Paris)",
    url: "https://www.oecd.org/en/about/careers.html",
    location: "Paris / Hybrid Remote",
    locationType: "global",
    type: "full_time",
    experience: "5-10",
    sectors: ["tech_ai", "regulation", "finance"],
    deadline: "2027-01-09",
    description:
      "Contribute to the OECD.AI Policy Observatory, G7/G20 digital policy working groups, and comparative regulatory assessments of foundation models.",
  },

  // --- 10+ Years (Directors, Practice Leads & Global Institutions) ---
  {
    orgSlug: "gates-foundation",
    orgName: "Bill & Melinda Gates Foundation",
    title: "Senior Program Officer — Health Systems & Public Finance (India Country Office)",
    url: "https://www.gatesfoundation.org/about/careers",
    location: "New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "10+",
    sectors: ["health", "finance", "government", "development"],
    deadline: "2027-01-22",
    description:
      "Shape and manage the Foundation's India portfolio on primary healthcare financing, NHM institutional strengthening, maternal & child nutrition, and digital health architecture.",
  },
  {
    orgSlug: "world-bank",
    orgName: "The World Bank",
    title: "Senior Public Sector Specialist — Governance & Digital Transformation (South Asia)",
    url: "https://www.worldbank.org/en/about/careers",
    location: "New Delhi / Washington DC",
    locationType: "global",
    type: "full_time",
    experience: "10+",
    sectors: ["government", "finance", "tech_ai", "development"],
    deadline: "2027-01-25",
    description:
      "Lead World Bank lending and technical assistance operations on public financial management (PFM), state capability, and digital governance across South Asia.",
  },
  {
    orgSlug: "wadhwani-foundation",
    orgName: "Wadhwani Foundation",
    title: "Vice President — Government Digital Transformation & Skilling Policy",
    url: "https://www.wadhwanifoundation.org/careers/",
    location: "Bengaluru / New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "10+",
    sectors: ["education", "tech_ai", "government"],
    deadline: "2027-01-30",
    description:
      "Partner with union ministries and state skill missions to scale AI-enabled employability, entrepreneurship, and digital governance programmes.",
  },
  {
    orgSlug: "who-india",
    orgName: "World Health Organization (WHO)",
    title: "National Professional Officer (Lead) — Health Policy & Regulation",
    url: "https://www.who.int/careers",
    location: "New Delhi",
    locationType: "india",
    type: "full_time",
    experience: "10+",
    sectors: ["health", "regulation", "government"],
    deadline: "2027-01-16",
    description:
      "Provide senior technical leadership on Universal Health Coverage (UHC), pharmaceutical & medical device regulation, and pandemic preparedness.",
  },
];

const STARTER_GUIDES = [
  {
    slug: "indian-policy-cv-playbook",
    title: "The IITD MPP Policy CV Playbook (Think Tanks, Consulting & Multilaterals)",
    category: "cv",
    body: `1. Keep it to 1 page for 0–5 years experience (2 pages only for academic/RA roles or 5+ years).
2. Structure for MPP candidates:
   • Education & Policy Coursework (highlight Econometrics, Policy Evaluation, Law & Governance, Capstone/Thesis topic)
   • Policy & Research Experience (quantify scope: e.g. "Analyzed 14 state ERC tariff orders", "Cleaned NSSO 78th round dataset of 42,000 households in R")
   • Fieldwork & Stakeholder Engagement (mention districts, ministry consultations, or primary surveys)
   • Technical & Policy Toolkit (R / Stata / Python / QGIS / Legislative Drafting / Budget Analysis)
3. Tailor verbs by target:
   • Think Tanks (CEEW, CPR, PRS, CSEP, Vidhi): emphasize empirical rigor, writing samples, datasets, and legislative/regulatory citations.
   • Governance Consulting (Samagra, Dalberg, PwC, EY, Deloitte, MSC): emphasize PMU delivery, state department stakeholders, dashboards, and scale impact.`,
  },
  {
    slug: "writing-samples-and-policy-memos",
    title: "Acing Take-Home Policy Memos & Written Assignments (48-Hour Tasks)",
    category: "interview",
    body: `Almost every Indian policy employer (CEEW, Samagra, IDinsight, J-PAL, Koan, Esya) uses a take-home written assignment or data test in Round 1.

• Executive Summary First (BLUF): Put your 3 core recommendations and the trade-offs in the first 150 words.
• Ground in Indian Institutional Reality: Name the exact nodal ministry, statutory regulator (TRAI, SEBI, CERC, RBI), scheme budget head, and 73rd/74th Amendment or Union/Concurrent List constraints.
• Data Tests (IDinsight / J-PAL / CEEW): Always submit a clean, commented .do or .R script alongside your summary PDF. State your handling of missing values, outliers, and survey weights explicitly.`,
  },
  {
    slug: "cover-letters-that-get-read",
    title: "3-Paragraph Cover Note Formula for Policy Roles & Cold Outreach",
    category: "cover_letter",
    body: `Paragraph 1 — The Hook & Specific Project:
Name the exact vertical or recent report by the organization (e.g. "I am writing to apply for the Programme Associate role in CEEW's Industrial Sustainability team, following your recent study on green steel procurement...").

Paragraph 2 — Your Proof of Work:
Connect 1 quantitative skill + 1 policy domain experience from your IITD MPP coursework, internship, or thesis directly to the JD's deliverables.

Paragraph 3 — Availability & Writing Sample:
State your earliest start window (e.g. "Available for winter internship from Dec 2, 2026" or "Graduating May 2027") and attach a 2-page policy brief link.`,
  },
  {
    slug: "moderator-annual-handoff-checklist",
    title: "Annual Batch Hand-Off Checklist (Maintaining Docket Across Cohorts)",
    category: "guide",
    body: `Every April/May, outgoing 2nd-year student moderators hand over operational stewardship to incoming 1st-year leads:

1. Role Promotion: The permanent Owner promotes 2–3 incoming student leads to "moderator" in the Mod Console (/admin) and transitions graduating members to "alumni".
2. Alumni Continuity Check: Remind graduating batchmates to verify their personal Gmail/Outlook in /settings before their @iitd.ac.in inbox deactivates, and invite them to opt into the Alumni Referral Directory.
3. Post-Placement Memory Drive: Host a 30-minute cohort session after summer internships and final placements where everyone logs 1 anonymous interview note on /orgs and updates their Tracker status to power the n >= 5 outcome funnel.`,
  },
];

async function main() {
  const orgsRaw = JSON.parse(
    readFileSync(join(process.cwd(), "seed/organizations.json"), "utf8"),
  ) as SeedOrg[];
  const recurringRaw = JSON.parse(
    readFileSync(join(process.cwd(), "seed/recurring.json"), "utf8"),
  ) as SeedRecurring[];

  const slugToOrgId = new Map<string, string>();

  // 1. Upsert organizations & their ingestion sources
  for (const o of orgsRaw) {
    const [inserted] = await db
      .insert(schema.organization)
      .values({
        slug: o.slug,
        name: o.name,
        website: o.website ?? null,
        careersUrl: o.careersUrl ?? null,
        category: o.category ?? "think_tank",
        sectors: o.sectors ?? [],
        hq: o.hq ?? "India",
        description: o.description ?? null,
      })
      .onConflictDoUpdate({
        target: schema.organization.slug,
        set: {
          name: o.name,
          website: o.website ?? null,
          careersUrl: o.careersUrl ?? null,
          category: o.category ?? "think_tank",
          sectors: o.sectors ?? [],
          hq: o.hq ?? "India",
          description: o.description ?? null,
        },
      })
      .returning({ id: schema.organization.id });

    slugToOrgId.set(o.slug, inserted.id);

    if (o.source) {
      const existingSrc = await db
        .select({ id: schema.source.id })
        .from(schema.source)
        .where(eq(schema.source.orgId, inserted.id))
        .limit(1);

      if (existingSrc.length === 0) {
        const isApi = ["ashby", "greenhouse", "lever", "smartrecruiters", "workday"].includes(
          o.source.type,
        );
        await db.insert(schema.source).values({
          orgId: inserted.id,
          type: o.source.type,
          config: o.source.config,
          enabled: true,
          autoPublish: isApi,
        });
      }
    }
  }

  // 2. Seed recurring annual opportunities
  await db.delete(schema.recurringDeadline);
  for (const r of recurringRaw) {
    const orgId = r.orgSlug ? (slugToOrgId.get(r.orgSlug) ?? null) : null;
    await db.insert(schema.recurringDeadline).values({
      orgId,
      orgName: r.orgName,
      title: r.title,
      type: r.type ?? "fellowship",
      experience: r.experience ?? "0-2",
      sectors: r.sectors ?? [],
      openMonth: r.typicalOpenMonth ?? null,
      closeMonth: r.typicalCloseMonth ?? null,
      eligibility: r.eligibility ?? null,
      url: r.url ?? null,
      notes: r.notes ?? null,
    });
  }

  // 3. Sync deep-crawled snapshot (seed/crawled-jobs.json) first, or run live ingestion if absent
  const { syncSnapshotToDatabase } = await import("../src/lib/snapshot-sync");
  const snapRes = await syncSnapshotToDatabase();
  let totalIngested = snapRes.upserted;
  if (totalIngested === 0) {
    const { runAllEnabledSources } = await import("../src/lib/ingest");
    const ingestResults = await runAllEnabledSources(25);
    totalIngested = ingestResults.reduce((acc, r) => acc + r.inserted, 0);
  }

  // 4. Clean up any legacy demo personas and seed only the real Owner (Shivang Uniyal)
  await db.execute(
    sql.raw(`
      DELETE FROM "user" WHERE email IN (
        'owner@iitd.ac.in',
        'ananya.mpp25@iitd.ac.in',
        'rohan.mpp26@iitd.ac.in',
        'meera.mpp23@iitd.ac.in',
        'kabir.mpp22@iitd.ac.in'
      );
    `),
  );

  const personas = [
    {
      id: "usr_owner_shivang",
      name: "Shivang Uniyal",
      email: "ppm254500@iitd.ac.in",
      personalEmail: undefined as string | undefined,
      role: "owner",
      batch: "MPP 2025–27",
      headline: "MPP at IIT Delhi · Permanent Steward of Docket · Tech, AI & Regulatory Policy",
      sectors: ["tech_ai", "regulation", "government", "health"],
      skills: ["Policy Analysis", "AI Governance", "R", "Python", "Regulatory Impact Assessment", "Stakeholder Engagement"],
      experienceLevel: "0-2",
      alumniOptIn: true,
      openToReferrals: true,
      currentOrg: "SPP, IIT Delhi",
      currentRole: "MPP Candidate & Portal Owner",
      gradYear: 2027,
    },
  ];

  for (const p of personas) {
    await db
      .insert(schema.user)
      .values({
        id: p.id,
        name: p.name,
        email: p.email,
        emailVerified: true,
        role: p.role,
        batch: p.batch,
      })
      .onConflictDoUpdate({
        target: schema.user.email,
        set: {
          name: p.name,
          role: p.role,
          batch: p.batch,
        },
      });

    await db
      .insert(schema.userEmail)
      .values({
        userId: p.id,
        email: p.email,
        kind: "iitd",
        verifiedAt: new Date(),
      })
      .onConflictDoNothing();

    await db
      .insert(schema.profile)
      .values({
        userId: p.id,
        headline: p.headline,
        sectors: p.sectors,
        skills: p.skills,
        experienceLevel: p.experienceLevel,
        alumniOptIn: p.alumniOptIn,
        openToReferrals: p.openToReferrals,
        currentOrg: p.currentOrg,
        currentRole: p.currentRole,
        gradYear: p.gradYear,
        resumeText:
          "Master of Public Policy (MPP), Indian Institute of Technology Delhi (IIT Delhi). Coursework: Econometrics, Public Policy Analysis, AI & Digital Regulation, Health Systems, Energy & Climate Policy. Skills: R, Python, Stata, Policy Briefs, Regulatory Analysis, Stakeholder Consultations, Impact Evaluation.",
        resumeFileName: "IITD_MPP_Policy_CV.pdf",
        resumeUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.profile.userId,
        set: {
          headline: p.headline,
          currentOrg: p.currentOrg,
          currentRole: p.currentRole,
          alumniOptIn: true,
          openToReferrals: true,
        },
      });
  }

  // 5. Seed anonymous cohort org notes on CEEW, Samagra, and PRS
  const ceewId = slugToOrgId.get("ceew");
  const samagraId = slugToOrgId.get("samagra");
  const prsId = slugToOrgId.get("prs-legislative-research");

  const existingNotes = await db.select().from(schema.orgNote);
  if (existingNotes.length === 0) {
    if (ceewId) {
      await db.insert(schema.orgNote).values([
        {
          orgId: ceewId,
          userId: null,
          batch: "MPP Cohort",
          anonymous: true,
          kind: "interview",
          body: "CEEW hiring has 3 stages: (1) Shortlisting + 48-hour written/quant assignment specific to the team (e.g. power sector tariff analysis in Excel/R), (2) Technical interview with the Programme Lead + Senior Analyst (expect deep questions on your MPP thesis/capstone), and (3) Culture & leadership round with HR/Director.",
        },
        {
          orgId: ceewId,
          userId: null,
          batch: "MPP Cohort",
          anonymous: true,
          kind: "timeline",
          body: "Winter internship calls usually go out in November; summer internship & Research Analyst calls open in February–March. Applying within the first 7 days of posting significantly helps.",
        },
      ]);
    }

    if (samagraId) {
      await db.insert(schema.orgNote).values({
        orgId: samagraId,
        userId: null,
        batch: "MPP Cohort",
        anonymous: true,
        kind: "interview",
        body: "Samagra Associate process: Deck submission on a governance problem statement → Guesstimate + Governance Case Round (e.g. improving foundational literacy in a state) → Partner chat. Emphasize structured problem-solving and comfort with field travel.",
      });
    }

    if (prsId) {
      await db.insert(schema.orgNote).values({
        orgId: prsId,
        userId: null,
        batch: "MPP Cohort",
        anonymous: true,
        kind: "tip",
        body: "For LAMP Fellowship: the two 500-word essays (one policy problem, one book/article critique) carry huge weight. Keep your stance strictly non-partisan and analytical — PRS values neutral briefings that any MP across the aisle can use.",
      });
    }
  }

  // 6. Seed starter career guides
  for (const g of STARTER_GUIDES) {
    await db
      .insert(schema.resource)
      .values({
        slug: g.slug,
        title: g.title,
        category: g.category,
        body: g.body,
        authorId: "usr_owner_shivang",
      })
      .onConflictDoNothing({ target: schema.resource.slug });
  }

  console.log(
    `✅ Seeded ${orgsRaw.length} organizations, ${recurringRaw.length} recurring annual cycles, ${totalIngested} real live-ingested policy openings, ${personas.length} cohort personas, and ${STARTER_GUIDES.length} career guides.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
