import { NextResponse } from "next/server";
import { getRecentDevEmails } from "@/lib/email";

export async function GET() {
  const isConsole = (process.env.EMAIL_PROVIDER ?? "console") === "console";
  if (!isConsole) {
    return NextResponse.json({ enabled: false, emails: [] });
  }
  return NextResponse.json({
    enabled: true,
    emails: getRecentDevEmails(),
  });
}
