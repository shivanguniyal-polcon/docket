import { NextResponse } from "next/server";
import { getRecentDevEmails } from "@/lib/email";
import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

export async function GET() {
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

  const isConsole = (process.env.EMAIL_PROVIDER ?? "console") === "console";
  return NextResponse.json({
    enabled: isConsole,
    emails: isConsole ? getRecentDevEmails() : [],
  });
}
