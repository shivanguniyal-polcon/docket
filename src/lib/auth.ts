import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendEmail, emailLayout, button } from "@/lib/email";

export const ALLOWED_DOMAIN = (
  process.env.ALLOWED_EMAIL_DOMAIN ?? "iitd.ac.in"
).toLowerCase();

export function isCohortEmail(email: string) {
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

const ownerEmails = (
  process.env.OWNER_EMAILS ?? "ppm254500@iitd.ac.in,owner@iitd.ac.in"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Find the user who has `email` as a *verified* login address. */
async function findUserByAnyEmail(email: string) {
  const [row] = await db
    .select({ userId: schema.userEmail.userId, canonical: schema.user.email })
    .from(schema.userEmail)
    .innerJoin(schema.user, eq(schema.user.id, schema.userEmail.userId))
    .where(
      and(
        eq(schema.userEmail.email, email),
        isNotNull(schema.userEmail.verifiedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export const auth = betterAuth({
  appName: "Docket",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "docket-iitd-mpp-default-secret-key-2026-32ch",
  trustedOrigins: [
    "http://localhost:3000",
    "https://*.vercel.app",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "member", input: false },
      batch: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: { enabled: true, storage: "database" },
  hooks: {
    /**
     * Dual-email login.
     *  - @iitd.ac.in addresses can sign up and sign in.
     *  - A personal address can sign in only if it is already verified on an
     *    account; we swap in the account's canonical email and deliver the
     *    link to the personal inbox.
     * metadata.deliverTo is ALWAYS overwritten here so a client can never
     * redirect someone else's magic link to their own inbox.
     */
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/magic-link") return;
      const email = String(ctx.body?.email ?? "").trim().toLowerCase();

      if (isCohortEmail(email)) {
        return {
          context: {
            body: { ...ctx.body, email, metadata: { deliverTo: email } },
          },
        };
      }

      const match = await findUserByAnyEmail(email);
      if (!match) {
        throw new APIError("FORBIDDEN", {
          message: `Sign up with your @${ALLOWED_DOMAIN} email first. A personal email works only after you add and verify it in Settings.`,
        });
      }
      return {
        context: {
          body: {
            ...ctx.body,
            email: match.canonical,
            metadata: { deliverTo: email },
          },
        },
      };
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => {
          const email = data.email.toLowerCase();
          if (!isCohortEmail(email)) {
            throw new APIError("FORBIDDEN", {
              message: `Only @${ALLOWED_DOMAIN} emails can create accounts.`,
            });
          }
          return {
            data: {
              ...data,
              email,
              name: data.name || email.split("@")[0],
              role: ownerEmails.includes(email) ? "owner" : "member",
            },
          };
        },
        after: async (created) => {
          await db
            .insert(schema.userEmail)
            .values({
              userId: created.id,
              email: created.email.toLowerCase(),
              kind: "iitd",
              verifiedAt: new Date(),
            })
            .onConflictDoNothing();
          await db
            .insert(schema.profile)
            .values({ userId: created.id })
            .onConflictDoNothing();
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      storeToken: "hashed",
      async sendMagicLink({ email, url, metadata }) {
        let to = email;
        const deliverTo =
          typeof metadata?.deliverTo === "string"
            ? metadata.deliverTo.toLowerCase()
            : email;
        if (deliverTo !== email) {
          // Defence in depth: deliverTo must be a verified address of the same account.
          const match = await findUserByAnyEmail(deliverTo);
          if (match && match.canonical === email) to = deliverTo;
        }
        await sendEmail({
          to,
          subject: "Your Docket sign-in link",
          html: emailLayout(
            "Sign in to Docket",
            `<p>Click below to sign in. This link expires in 15 minutes.</p><p>${button(url, "Sign in")}</p><p style="color:#78716c;font-size:13px">If you didn't request this, you can ignore this email.</p>`,
          ),
          text: `Sign in to Docket: ${url}`,
        });
      },
    }),
    nextCookies(), // keep last
  ],
});

export type Session = typeof auth.$Infer.Session;
