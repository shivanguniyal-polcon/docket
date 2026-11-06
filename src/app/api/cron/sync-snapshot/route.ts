import { NextRequest, NextResponse } from "next/server";
import { getUser, isModerator } from "@/lib/session";
import {
  syncSnapshotToDatabase,
  type CrawledJobRecord,
} from "@/lib/snapshot-sync";

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

  const body = (await request.json().catch(() => null)) as
    | { records?: CrawledJobRecord[] }
    | null;

  const res = await syncSnapshotToDatabase(body?.records);
  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    ...res,
  });
}
