# Docket — Policy Jobs, Application Tracker & Cohort Memory (IIT Delhi MPP)

Student-run web application for the **IIT Delhi Master of Public Policy (MPP)** cohort and alumni.

## Key Features
- **Live Policy Job Feed (`/jobs`)**: Covers India-first organizations, global multilateral institutions, and remote roles across all four experience bands (`0-2`, `3-5`, `5-10`, `10+` years) and all opportunity types (`full_time`, `internship`, `fellowship`, `graduate_program`, `part_time`).
- **Personal Application Tracker (`/tracker`)**: Kanban board (`Saved` → `Applied` → `Interviewing` → `Offer` / `Rejected` / `Withdrawn`) with private notes, contacts, and off-platform role tracking.
- **Deadlines & Annual Cycles (`/calendar`)**: Personal tracked deadlines + live closing dates + **34 pre-loaded recurring annual fellowships & internships** (LAMP, NITI Aayog YP & Internship, State CM Fellowships, World Bank YPP, UN/OECD/ADB/IMF cycles) + 1-click `.ics` export (`/api/calendar.ics`).
- **Private Resume & Modular AI Fit (`/settings`, `/api/fit`)**: Upload a PDF resume (only extracted plain text is stored; the raw PDF is discarded). Calculates a 0–100 fit score, strengths, and gaps. Uses a free offline heuristic scorer (`AI_PROVIDER=keyword`) by default and swaps seamlessly to Google Gemini (`AI_PROVIDER=gemini` + `GOOGLE_GENERATIVE_AI_API_KEY`).
- **Dual-Email Authentication (`/sign-in`, `/settings`)**: Sign up requires an `@iitd.ac.in` email. Once inside, add and verify a personal backup email so alumni keep lifelong access after their institute inbox expires.
- **Inheritable Cohort Knowledge (`/orgs`, `/alumni`, `/resources`)**:
  - **56 pre-loaded policy organizations** (PwC, EY, Deloitte, PRS, Gates Foundation, Nation with NaMo, NFPRC, CEEW, WRI India, J-PAL South Asia, World Bank, CRISP, MicroSave, BowerGroupAsia, eGov Foundation, GRAAM, Pravi Research, Wadhwani AI, Wadhwani Foundation, Sarvam AI, plus 36 more).
  - Batch-tagged interview & timeline notes (with an anonymous option).
  - Strict k-anonymous (`n >= 5`) application-to-offer conversion funnel per organization.
  - Opt-in Alumni Directory with referral / coffee-chat email requests.
- **Moderator & Batch Hand-Off Console (`/admin`)**: Review queue for member submissions, page-change diff alerts for Indian think-tank career pages, manual/cron ingestion runner, and Owner role management with an audit log.

## Quick Start (Local Development — Zero External Accounts Needed)

By default, Docket uses an embedded Postgres database (**PGlite** in `./.pglite`), logs magic links to the terminal + Sign-In page (`EMAIL_PROVIDER=console`), and runs the offline fit scorer (`AI_PROVIDER=keyword`).

```bash
pnpm install
pnpm db:setup   # Pushes schema and seeds 56 orgs, 34 recurring cycles & 29 openings
pnpm dev        # Starts on http://localhost:3000
```

## Deploying to Production (100% Free Tiers)

Both `docket-iitd.vercel.app` and `docket-mpp.vercel.app` are available on Vercel.

1. **Neon Postgres (Free Tier)**: Create a project at [neon.tech](https://neon.tech) and set `DATABASE_URL` in Vercel environment variables. Run `DATABASE_URL=... pnpm db:setup` once to push the schema and seed data.
2. **Vercel (Hobby — Free)**: Import your GitHub repository into Vercel and set:
   - `BETTER_AUTH_SECRET`: random 32-byte string (`openssl rand -base64 32`)
   - `BETTER_AUTH_URL`: `https://docket-iitd.vercel.app`
   - `ALLOWED_EMAIL_DOMAIN`: `iitd.ac.in`
   - `OWNER_EMAILS`: your `@iitd.ac.in` email
   - `CRON_SECRET`: random secret for scheduled ingestion
3. **Resend (Free Tier — 3,000 emails/mo)**: Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`.
4. **Google Gemini (Optional Free Tier / Cohort Pool)**: Set `AI_PROVIDER=gemini` and `GOOGLE_GENERATIVE_AI_API_KEY`.
5. **GitHub Actions Cron**: Add `APP_URL` and `CRON_SECRET` to your GitHub repo secrets so `.github/workflows/ingest.yml` runs `/api/cron/ingest` and `/api/cron/reminders` every 6 hours.
