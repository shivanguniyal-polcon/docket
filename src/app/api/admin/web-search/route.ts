import { NextRequest, NextResponse } from "next/server";
import { getUser, isModerator } from "@/lib/session";
import { searchWebDorks, importWebJob } from "@/lib/web-search";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user || !isModerator(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  try {
    const results = await searchWebDorks(query);
    return NextResponse.json({ query, count: results.length, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user || !isModerator(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    autoPublish?: boolean;
  };

  if (!body.url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const job = await importWebJob(body.url, body.autoPublish ?? false);
    return NextResponse.json({ success: true, job });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to import web job";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
