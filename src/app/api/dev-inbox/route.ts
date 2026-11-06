import { NextResponse } from "next/server";
import { getRecentDevEmails } from "@/lib/email";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

export async function GET() {
  const isConsole = (process.env.EMAIL_PROVIDER ?? "console") === "console";
  if (!isConsole) {
    return NextResponse.json({ enabled: false, emails: [] });
  }

  try {
    const rows = await db
      .select()
      .from(schema.devEmail)
      .orderBy(desc(schema.devEmail.sentAt))
      .limit(10);

    if (rows.length > 0) {
      return NextResponse.json({
        enabled: true,
        emails: rows.map((r) => ({
          to: r.to,
          subject: r.subject,
          url: r.url ?? undefined,
          sentAt: r.sentAt.toISOString(),
        })),
      });
    }
  } catch (e) {
    console.warn("[api/dev-inbox] DB read fallback:", e);
  }

  return NextResponse.json({
    enabled: true,
    emails: getRecentDevEmails(),
  });
}
