import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendEmail, emailLayout, button } from "@/lib/email";
import { getUser, isModerator } from "@/lib/session";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const validToken = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!validToken) {
    const user = await getUser();
    if (!user || !isModerator(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      app: schema.application,
      user: schema.user,
      profile: schema.profile,
    })
    .from(schema.application)
    .innerJoin(schema.user, eq(schema.user.id, schema.application.userId))
    .leftJoin(schema.profile, eq(schema.profile.userId, schema.user.id))
    .where(isNotNull(schema.application.deadline));

  let sent = 0;
  for (const { app, user, profile } of rows) {
    if (profile && !profile.emailReminders) continue;
    if (!app.deadline || app.status === "withdrawn" || app.status === "rejected")
      continue;

    const deadlineDate = new Date(`${app.deadline}T00:00:00`);
    const diffDays = Math.round(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays !== 7 && diffDays !== 1) continue;
    const key = `app:${app.id}:${diffDays}d`;

    const existing = await db
      .select()
      .from(schema.reminderLog)
      .where(
        and(
          eq(schema.reminderLog.userId, user.id),
          eq(schema.reminderLog.key, key),
        ),
      )
      .limit(1);

    if (existing.length > 0) continue;

    // Deliver to all verified emails of the user
    const emails = await db
      .select({ email: schema.userEmail.email })
      .from(schema.userEmail)
      .where(
        and(
          eq(schema.userEmail.userId, user.id),
          isNotNull(schema.userEmail.verifiedAt),
        ),
      );

    const recipients =
      emails.length > 0 ? emails.map((e) => e.email) : [user.email];

    await sendEmail({
      to: recipients,
      subject: `Deadline in ${diffDays} day${diffDays === 1 ? "" : "s"}: ${app.title} (${app.orgName})`,
      html: emailLayout(
        `Deadline in ${diffDays} day${diffDays === 1 ? "" : "s"}`,
        `<p>Your tracked application for <strong>${app.title}</strong> at <strong>${app.orgName}</strong> is due on <strong>${app.deadline}</strong> (current status: ${app.status}).</p>
         <p>${button(`${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/tracker`, "Open your Docket tracker")}</p>`,
      ),
    });

    await db
      .insert(schema.reminderLog)
      .values({ userId: user.id, key })
      .onConflictDoNothing();
    sent++;
  }

  return NextResponse.json({ sent, checked: rows.length });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
