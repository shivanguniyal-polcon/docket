import { NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { db, schema } from "@/db";
import { ensureDbReady } from "@/db/auto-bootstrap";
import { eq, isNotNull } from "drizzle-orm";

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

export async function GET() {
  await ensureDbReady();
  const user = await getUser();

  const [apps, jobsWithDeadlines, recurring] = await Promise.all([
    user
      ? db
          .select()
          .from(schema.application)
          .where(eq(schema.application.userId, user.id))
      : Promise.resolve([]),
    db
      .select()
      .from(schema.job)
      .where(isNotNull(schema.job.deadline)),
    db.select().from(schema.recurringDeadline),
  ]);

  const events: string[] = [];
  const nowStamp =
    new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  for (const a of apps) {
    if (!a.deadline) continue;
    const d = formatIcsDate(a.deadline);
    events.push(
      [
        "BEGIN:VEVENT",
        `UID:docket-app-${a.id}@docket.iitd`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${escapeIcs(`[Docket · ${a.status.toUpperCase()}] ${a.title} — ${a.orgName}`)}`,
        `DESCRIPTION:${escapeIcs(`Application deadline for ${a.title} at ${a.orgName}${a.url ? `\\n${a.url}` : ""}`)}`,
        "END:VEVENT",
      ].join("\r\n"),
    );
  }

  for (const j of jobsWithDeadlines) {
    if (!j.deadline || j.status !== "published") continue;
    const d = formatIcsDate(j.deadline);
    events.push(
      [
        "BEGIN:VEVENT",
        `UID:docket-job-${j.id}@docket.iitd`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${escapeIcs(`[Opening Deadline] ${j.title} — ${j.orgName}`)}`,
        `DESCRIPTION:${escapeIcs(`${j.title} at ${j.orgName}\\n${j.url}`)}`,
        "END:VEVENT",
      ].join("\r\n"),
    );
  }

  const year = new Date().getFullYear();
  for (const r of recurring) {
    if (!r.openMonth) continue;
    const m = String(r.openMonth).padStart(2, "0");
    const targetYear =
      r.openMonth < new Date().getMonth() + 1 ? year + 1 : year;
    events.push(
      [
        "BEGIN:VEVENT",
        `UID:docket-rec-${r.id}-${targetYear}@docket.iitd`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${targetYear}${m}01`,
        `SUMMARY:${escapeIcs(`[Cycle Opens] ${r.title} (${r.orgName})`)}`,
        `DESCRIPTION:${escapeIcs(`${r.notes ?? ""}${r.url ? `\\n${r.url}` : ""}`)}`,
        "END:VEVENT",
      ].join("\r\n"),
    );
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Docket IIT Delhi MPP//Policy Deadlines//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Docket Policy Deadlines",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="docket-deadlines.ics"',
    },
  });
}
