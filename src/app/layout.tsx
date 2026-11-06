import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  Newsreader,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { getUser, isModerator } from "@/lib/session";
import { AppNav } from "@/components/nav";
import { TopProgressBar } from "@/components/top-progress-bar";
import { db, schema } from "@/db";
import { ensureDbReady } from "@/db/auto-bootstrap";
import { count, eq } from "drizzle-orm";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontSerif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DOCKET — Public Policy Careers, Mandates & Cohort Ledger (IIT Delhi MPP)",
  description:
    "The single repository for Indian public policy, tech & AI regulation, development consulting, and multilateral mandates — maintained by the IIT Delhi MPP cohort.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureDbReady();
  const user = await getUser();
  let pendingCount = 0;

  if (user && isModerator((user as { role?: string }).role)) {
    const [pendingJobs] = await db
      .select({ value: count() })
      .from(schema.job)
      .where(eq(schema.job.status, "pending"));
    const [openChanges] = await db
      .select({ value: count() })
      .from(schema.pageChange)
      .where(eq(schema.pageChange.status, "open"));
    pendingCount = (pendingJobs?.value ?? 0) + (openChanges?.value ?? 0);
  }

  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#F6F3EC] text-[#141413] selection:bg-stone-900 selection:text-[#F6F3EC]">
        <TopProgressBar />
        <AppNav
          user={
            user
              ? {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: (user as { role?: string }).role ?? "member",
                  batch: (user as { batch?: string | null }).batch ?? null,
                }
              : null
          }
          pendingCount={pendingCount}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 md:pb-14">
          {children}
        </main>
        <footer className="border-t-2 border-stone-900 bg-[#EFECE4] pt-6 pb-20 text-xs text-stone-700 lg:pb-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 sm:flex-row sm:items-center sm:px-6">
            <div className="space-y-0.5">
              <div className="font-mono-tabular text-[11px] font-semibold tracking-wider text-stone-900 uppercase">
                DOCKET · VOL. I · SCHOOL OF PUBLIC POLICY COHORT LEDGER
              </div>
              <p className="text-stone-600">
                Student-run career intelligence &amp; institutional memory for
                the IIT Delhi MPP community. Independent of IIT Delhi
                administration.
              </p>
            </div>
            <div className="font-mono-tabular text-[11px] text-stone-600">
              DPDP COMPLIANT · PRIVATE CV SCORING · K-ANONYMITY (n ≥ 5)
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
