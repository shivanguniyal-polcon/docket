import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate: only checks that a session cookie exists.
 * Real authorization happens in pages/server actions via lib/session.ts.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/jobs/:path*",
    "/tracker/:path*",
    "/calendar/:path*",
    "/orgs/:path*",
    "/alumni/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/submit/:path*",
  ],
};
