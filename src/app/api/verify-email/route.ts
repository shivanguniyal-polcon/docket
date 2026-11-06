import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.redirect(
      new URL("/settings?emailError=missing_token", request.url),
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .select()
    .from(schema.emailToken)
    .where(
      and(
        eq(schema.emailToken.tokenHash, tokenHash),
        gt(schema.emailToken.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.redirect(
      new URL("/settings?emailError=invalid_or_expired", request.url),
    );
  }

  await db
    .insert(schema.userEmail)
    .values({
      userId: row.userId,
      email: row.email.toLowerCase(),
      kind: "personal",
      verifiedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.userEmail.email,
      set: { verifiedAt: new Date(), userId: row.userId },
    });

  await db
    .delete(schema.emailToken)
    .where(eq(schema.emailToken.tokenHash, tokenHash));

  return NextResponse.redirect(
    new URL("/settings?emailVerified=1", request.url),
  );
}
