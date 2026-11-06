import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/session";
import { extractJobFromUrl, extractJobFromRawText } from "@/lib/extract-jd";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    rawText?: string;
  };

  if (body.rawText && body.rawText.trim().length > 10) {
    const extracted = extractJobFromRawText(body.rawText);
    return NextResponse.json(extracted);
  }

  if (!body.url) {
    return NextResponse.json(
      { error: "Provide either a URL or raw forward text" },
      { status: 400 },
    );
  }

  try {
    const extracted = await extractJobFromUrl(body.url);
    return NextResponse.json(extracted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to extract JD";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
