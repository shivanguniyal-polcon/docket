import { auth } from "@/lib/auth";
import { ensureDbReady } from "@/db/auto-bootstrap";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export async function GET(req: Request) {
  await ensureDbReady();
  return handler.GET(req);
}

export async function POST(req: Request) {
  await ensureDbReady();
  return handler.POST(req);
}
