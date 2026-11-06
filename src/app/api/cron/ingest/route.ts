import { NextRequest, NextResponse } from "next/server";
import { runAllEnabledSources } from "@/lib/ingest";
import { getUser, isModerator } from "@/lib/session";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const validToken =
    cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!validToken) {
    const user = await getUser();
    if (!user || !isModerator(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const purgeOld = request.nextUrl.searchParams.get("reset") === "1";
  if (purgeOld) {
    const { db, schema } = await import("@/db");
    await db.delete(schema.job);
  }

  const results = await runAllEnabledSources(35);
  return NextResponse.json({
    ranAt: new Date().toISOString(),
    count: results.length,
    results,
  });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
