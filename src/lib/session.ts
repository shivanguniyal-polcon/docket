import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureDbReady } from "@/db/auto-bootstrap";
import type { Role } from "@/lib/taxonomy";

/** Current session (deduped per request). */
export const getSession = cache(async () => {
  await ensureDbReady();
  return auth.api.getSession({ headers: await headers() });
});

export async function getUser() {
  const s = await getSession();
  return s?.user ?? null;
}

/** Use in pages / server actions that require sign-in. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user as typeof user & { role: Role; batch: string | null };
}

export function isModerator(role: string | null | undefined) {
  return role === "owner" || role === "moderator";
}

export async function requireModerator() {
  const user = await requireUser();
  if (!isModerator(user.role)) redirect("/jobs");
  return user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/jobs");
  return user;
}
