import Link from "next/link";
import { Plus, CheckCircle2, BookOpen } from "lucide-react";
import { getUser, isModerator } from "@/lib/session";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { saveResourceAction } from "@/app/actions";
import { SubmitButton } from "@/components/loading-button";
import { PlacementPathfinder } from "@/components/placement-pathfinder";

const CATEGORIES: Record<string, string> = {
  cv: "CV & Writing Samples",
  cover_letter: "Cover Notes & Cold Outreach",
  interview: "48-Hour Memos, Data Tests & Cases",
  guide: "Sector & Fellowship Playbooks",
};

const ARCHETYPE_MATRIX = [
  {
    track: "I · Policy Think Tanks",
    orgs: "CEEW, CPR, PRS, CSEP, Vidhi, ORF, ICRIER, NIPFP, Esya",
    coreDeliverable: "2-page policy briefs, legislative digests, working papers, SERC/regulatory comments",
    methodsAndTools: "R / Stata / Python, secondary statutory & budget analysis, qualitative stakeholder interviews",
    collegePositionsThatMatter:
      "Master's thesis / Capstone with a clean dataset or statutory analysis; RAship under an SPP/HSS professor; published op-ed or working paper",
    round1Gate: "48-hour written policy memo (800–1,500 words) or regulatory critique + writing sample screen",
    typicalComp: "Intern: ₹15k–₹25k/mo · Research Analyst (0–2 yrs): ₹8.5–13 LPA",
  },
  {
    track: "II · Governance & Public Sector Consulting",
    orgs: "Samagra, Dalberg, PwC G&PS, EY DPI, Deloitte, Sattva, MSC, Athena",
    coreDeliverable: "CMO/Ministry review decks, PMU implementation roadmaps, KPI dashboards, RFPs",
    methodsAndTools: "MECE issue trees, Pyramid Principle slide decks, Excel modelling, PowerBI/Tableau",
    collegePositionsThatMatter:
      "Placement/Academic Coordinator, Student Lab or Consulting Club lead, field implementation internship with a state mission or district collectorate",
    round1Gate: "Problem-statement slide deck (5–8 slides) + Guesstimate & Governance Case interview (e.g. improving state FLN or discom losses)",
    typicalComp: "Intern: ₹25k–₹50k/mo · Associate / Consultant (0–2 yrs): ₹12–18 LPA",
  },
  {
    track: "III · Evidence & Impact Evaluation Labs",
    orgs: "J-PAL South Asia, IDinsight, IFMR LEAD, Accountability Initiative, GRAAM",
    coreDeliverable: "RCT baseline/endline cleaning, econometric regression tables, SurveyCTO instruments, field protocols",
    methodsAndTools: "Stata (.do files), R (tidyverse/fixest), SurveyCTO/ODK, power calculations, causal inference (DiD, IV, RDD)",
    collegePositionsThatMatter:
      "A+ in Econometrics / Impact Evaluation; primary field survey experience; clean GitHub repository with reproducible R/Stata scripts",
    round1Gate: "Timed 2–4 hour Stata/R data cleaning & econometrics test + technical interview on identification strategy",
    typicalComp: "Intern: ₹20k–₹30k/mo · Research Associate / Associate (0–2 yrs): ₹10–15 LPA",
  },
  {
    track: "IV · Tech, AI & Regulatory Policy",
    orgs: "Sarvam AI, Wadhwani AI, Koan Advisory, Ikigai Law, IFF, eGov Foundation, BGA",
    coreDeliverable: "Regulatory risk matrices, TRAI/MeitY/RBI consultation responses, DPI deployment playbooks, AI safety evals",
    methodsAndTools: "DPDP Act & Digital India Act tracking, competition law, comparative EU/US/India tech regulation, product-policy translation",
    collegePositionsThatMatter:
      "Tech/AI policy clinic project, public consultation submission to MeitY/TRAI/CCI, cross-disciplinary project with CS/AI labs at IIT Delhi",
    round1Gate: "24–48 hour client advisory note (e.g. 'Advise a foundation-model startup on DPDP Act compliance')",
    typicalComp: "Intern: ₹20k–₹40k/mo · Policy Analyst / Deployment Strategist (0–2 yrs): ₹11–16 LPA",
  },
  {
    track: "V · Multilaterals & Philanthropies",
    orgs: "World Bank, Gates Foundation, UNDP, UNICEF, WHO, ADB, OECD, Tata Trusts",
    coreDeliverable: "Country partnership frameworks, technical assistance ToRs, grant due-diligence memos, STC analytical inputs",
    methodsAndTools: "Public Financial Management (PFM), logframes / Theory of Change, cross-country comparative datasets",
    collegePositionsThatMatter:
      "UN/ADB/NITI internship, strong quantitative + domain specialization (Health Systems, Climate Finance, Macro/Fiscal), co-authored faculty paper",
    round1Gate: "Short-Term Consultant (STC) referral via faculty/alumni network, or highly competitive YPP / BIP annual portal window",
    typicalComp: "STC / Consultant: ₹1.2L–₹2.5L/mo · YPP / Officer (3–10+ yrs): Global / National Officer scales",
  },
];

const SEMESTER_ROADMAP = [
  {
    phase: "PHASE 01 · AUG – OCT (1ST YEAR SEM 1)",
    title: "Build Your Proof-of-Work Toolkit (Before December Calls Open)",
    bullets: [
      "Lock down one quantitative language (R or Stata) and publish 1 reproducible data-cleaning + chart notebook on GitHub.",
      "Convert your best Semester 1 term paper into a crisp, non-academic 2-page Policy Brief (with an Executive Summary box on page 1) — this becomes your ready Writing Sample.",
      "Build 2 tailored 1-page CVs: (A) Research & Think-Tank CV (leads with methods, datasets & papers) and (B) Governance Consulting CV (leads with quantified execution, stakeholders & leadership).",
    ],
  },
  {
    phase: "PHASE 02 · NOV – JAN (DEC 2026+ WINTER INTERNSHIP & FELLOWSHIP WINDOW)",
    title: "Winter Internships, LAMP & Cold Outreach to PIs",
    bullets: [
      "Apply within the first 5 days to rolling portals: NITI Aayog (1st–10th of every month), PRS Winter Internships, CEEW, CSEP, and J-PAL.",
      "Run a structured Cold-Email Ledger in Docket (/tracker): shortlist 15 Programme Leads / Senior Fellows at CEEW, CPR, ICRIER, and Vidhi; send a 180-word email attaching your 2-page brief + set a 7-day follow-up date.",
      "For graduating 2nd-years: LAMP Fellowship, SBI Youth for India, and State CM Fellowship applications peak in this window.",
    ],
  },
  {
    phase: "PHASE 03 · FEB – APR (SUMMER INTERNSHIPS & MAY 2027 CAMPUS/OFF-CAMPUS CYCLES)",
    title: "Crack the 48-Hour Written Assignment & Case Rounds",
    bullets: [
      "Before interviewing at any organization, open its Institution Profile (/orgs) on Docket to check past 48-hour assignment prompts, tools tested, and alumni referrals.",
      "Practice 6 governance case prompts with a batch partner: (1) State FLN literacy Mission, (2) Discom AT&C loss reduction, (3) PM-JAY hospital empanelment, (4) FPO market linkage, (5) Municipal property tax digitisation, (6) AI voice bot rollout for citizen grievances.",
      "Request a 15-minute prep chat from IITD MPP alumni directly from the job page before submitting your take-home deck.",
    ],
  },
];

const PRE_APPLY_CHECKLIST = [
  "Did you check the Institution page (/orgs) on Docket for past 48-hour assignment prompts and stipend/CTC notes?",
  "Did you check if an IITD MPP senior/alum works there (blue badge on the job row) and send a referral/prep request before submitting cold?",
  "Is your CV strictly 1 page (for 0–5 yrs experience) with quantified policy deliverables rather than generic coursework descriptions?",
  "Does your attached 2-page Writing Sample match the organization's sector (e.g. don't send a health brief to an energy-transition team)?",
  "Did you log the CV version, writing sample attached, and a 7-day follow-up date in your Docket Ledger (/tracker)?",
];

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const user = await getUser();
  const resources = await db
    .select()
    .from(schema.resource)
    .orderBy(desc(schema.resource.updatedAt));

  const canEdit = user ? isModerator(user.role) : false;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="border-b-2 border-stone-900 pb-4">
        <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-900 uppercase">
          § 05 · THE IIT DELHI MPP FIELD MANUAL &amp; INDUSTRY STANDARDS
        </div>
        <h1 className="font-serif-editorial mt-1 text-3xl font-normal tracking-tight text-stone-950 sm:text-5xl">
          How to Search, Prepare &amp; Crack Policy Mandates
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-700">
          What the policy industry actually tests in 2026–27, which college
          positions and technical skills move the needle, and the step-by-step
          preparation protocol before you hit apply.
        </p>
      </div>

      {/* Interactive Placement Pathfinder, CV Bullet Translator & 48-Hr Workbench */}
      <PlacementPathfinder
        isSignedIn={Boolean(user)}
        initialTab={resolvedParams?.tab}
      />

      {/* Section 1: The 5-Track Industry Standards Matrix */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between border-b border-stone-900 pb-2">
          <h2 className="font-mono-tabular text-xs font-bold tracking-widest text-stone-900 uppercase">
            PART I · INDUSTRY STANDARDS MATRIX — WHAT EACH EMPLOYER ARCHETYPE DEMANDS
          </h2>
          <span className="font-mono-tabular text-[11px] text-stone-500">
            5 CORE POLICY TRACKS
          </span>
        </div>

        <div className="divide-y divide-stone-300 border border-stone-900 bg-[#FBF9F4]">
          {ARCHETYPE_MATRIX.map((row) => (
            <div key={row.track} className="grid gap-4 p-5 lg:grid-cols-12">
              <div className="space-y-1 lg:col-span-3">
                <div className="font-serif-editorial text-lg font-bold text-stone-950">
                  {row.track}
                </div>
                <div className="font-mono-tabular text-[11px] text-stone-600">
                  {row.orgs}
                </div>
                <div className="mt-2 inline-block border border-emerald-900 bg-emerald-950/10 px-2 py-0.5 font-mono-tabular text-[10px] font-semibold text-emerald-950">
                  {row.typicalComp}
                </div>
              </div>

              <div className="grid gap-3 text-xs sm:grid-cols-2 lg:col-span-9 lg:grid-cols-4">
                <div>
                  <div className="font-mono-tabular text-[10px] font-bold text-stone-500 uppercase">
                    Day-to-Day Deliverable
                  </div>
                  <p className="mt-1 leading-relaxed text-stone-800">
                    {row.coreDeliverable}
                  </p>
                </div>
                <div>
                  <div className="font-mono-tabular text-[10px] font-bold text-stone-500 uppercase">
                    Skills &amp; Tools Needed Now
                  </div>
                  <p className="mt-1 leading-relaxed text-stone-800">
                    {row.methodsAndTools}
                  </p>
                </div>
                <div>
                  <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                    College Positions That Matter
                  </div>
                  <p className="mt-1 leading-relaxed text-stone-800">
                    {row.collegePositionsThatMatter}
                  </p>
                </div>
                <div>
                  <div className="font-mono-tabular text-[10px] font-bold text-stone-900 uppercase">
                    Round-1 Elimination Gate
                  </div>
                  <p className="mt-1 leading-relaxed text-stone-800">
                    {row.round1Gate}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: What Skills & College Positions Actually Matter */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="border border-stone-900 bg-[#FBF9F4] p-6 lg:col-span-7">
          <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-900 uppercase">
            PART II · TIMELINE &amp; PREPARATION PROTOCOL
          </div>
          <h2 className="font-serif-editorial mt-1 text-2xl text-stone-950">
            Semester-by-Semester Action Plan (Dec 2026 Interns &amp; May 2027 Grads)
          </h2>

          <div className="mt-4 divide-y divide-stone-300">
            {SEMESTER_ROADMAP.map((s) => (
              <div key={s.phase} className="py-4 first:pt-0 last:pb-0">
                <div className="font-mono-tabular text-[10px] font-bold text-amber-900">
                  {s.phase}
                </div>
                <h3 className="mt-0.5 text-sm font-bold text-stone-950">
                  {s.title}
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-stone-700">
                  {s.bullets.map((b, idx) => (
                    <li key={idx}>• {b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Pre-Application 5-Point Verification + High-Signal College Roles */}
        <div className="space-y-6 lg:col-span-5">
          <div className="border border-stone-900 bg-stone-900 p-6 text-[#F6F3EC]">
            <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-400 uppercase">
              BEFORE YOU CLICK APPLY · 5-POINT CHECKLIST
            </div>
            <h3 className="font-serif-editorial mt-1 text-2xl font-normal">
              Pre-Submission Protocol
            </h3>
            <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-stone-200">
              {PRE_APPLY_CHECKLIST.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-700 pt-4">
              <Link
                href="/settings"
                className="border border-[#F6F3EC] px-3 py-1.5 font-mono-tabular text-[11px] font-semibold uppercase hover:bg-[#F6F3EC] hover:text-stone-900"
              >
                Update Private CV →
              </Link>
              <Link
                href="/orgs"
                className="border border-stone-600 px-3 py-1.5 font-mono-tabular text-[11px] text-stone-300 uppercase hover:border-[#F6F3EC]"
              >
                Browse Org Prompts →
              </Link>
            </div>
          </div>

          <div className="border border-stone-900 bg-[#FBF9F4] p-6">
            <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-stone-600 uppercase">
              SIGNAL VS. NOISE ON CAMPUS
            </div>
            <h3 className="font-serif-editorial mt-1 text-xl text-stone-950">
              What Positions in College Actually Matter to Policy Recruiters?
            </h3>
            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-stone-700">
              <p>
                <strong className="text-stone-950">
                  1. Faculty Research Assistantships (Highest Signal for Think Tanks &amp; J-PAL):
                </strong>{" "}
                Working 8–10 hrs/week cleaning NSSO/NFHS/PLFS data or drafting a
                literature review for an IITD professor beats any generic club
                certificate.
              </p>
              <p>
                <strong className="text-stone-950">
                  2. Live Ministry / District Capstone Projects (Highest Signal for Samagra &amp; Big 4):
                </strong>{" "}
                Recruiters test whether you have ever spoken to a Block/District
                official or read an actual Government Order (GO) / budget document.
              </p>
              <p>
                <strong className="text-stone-950">
                  3. Public Consultation Submissions (Highest Signal for Tech/AI Policy):
                </strong>{" "}
                Co-authoring a cohort response to a MeitY, TRAI, RBI, or CERC
                consultation paper gives you an instant talking point in Round 1.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Moderator-Maintained Templates & Playbooks */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-900 pb-2">
          <h2 className="font-mono-tabular text-xs font-bold tracking-widest text-stone-900 uppercase">
            PART III · COHORT PLAYBOOKS, TEMPLATES &amp; MODERATOR NOTES ({resources.length})
          </h2>
          {canEdit && (
            <details className="text-xs">
              <summary className="cursor-pointer font-mono-tabular font-semibold text-amber-900 uppercase">
                + Add / Edit Playbook
              </summary>
              <form
                action={saveResourceAction}
                className="mt-3 space-y-2 border border-stone-900 bg-[#FBF9F4] p-4"
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="Guide title"
                    className="border border-stone-400 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    name="slug"
                    required
                    placeholder="slug (e.g. stata-test-prep)"
                    className="border border-stone-400 bg-white px-2.5 py-1.5 font-mono-tabular text-xs"
                  />
                  <select
                    name="category"
                    defaultValue="guide"
                    className="border border-stone-400 bg-white px-2.5 py-1.5 text-xs"
                  >
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  name="body"
                  required
                  rows={5}
                  placeholder="Playbook content…"
                  className="w-full border border-stone-400 bg-white p-2.5 font-mono-tabular text-xs"
                />
                <SubmitButton
                  pendingText="Saving Playbook…"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  className="border border-stone-900 bg-stone-900 px-3 py-1.5 font-mono-tabular text-xs font-semibold text-[#F6F3EC] uppercase"
                >
                  Save Playbook
                </SubmitButton>
              </form>
            </details>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {resources.map((r) => (
            <article
              key={r.id}
              className="border border-stone-900 bg-[#FBF9F4] p-6"
            >
              <div className="flex items-center justify-between font-mono-tabular text-[10px] text-stone-600 uppercase">
                <span className="inline-flex items-center gap-1 font-bold text-amber-900">
                  <BookOpen className="h-3 w-3" />
                  {CATEGORIES[r.category] ?? r.category}
                </span>
                <span>
                  UPDATED {new Date(r.updatedAt).toLocaleDateString("en-IN")}
                </span>
              </div>

              <h3 className="font-serif-editorial mt-1.5 text-xl font-normal text-stone-950">
                {r.title}
              </h3>

              <div className="mt-3 whitespace-pre-line text-xs leading-relaxed text-stone-700">
                {r.body}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
