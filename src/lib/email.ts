/**
 * Email delivery, behind a tiny provider interface.
 *
 * - EMAIL_PROVIDER=resend + RESEND_API_KEY  -> sends through Resend (free tier)
 * - anything else / unset                   -> logs the email to the console
 *   (handy in local dev: magic links show up in the terminal)
 *
 * To switch providers later, add another implementation of EmailProvider.
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface EmailProvider {
  name: string;
  send(msg: EmailMessage): Promise<void>;
}

const globalForEmail = globalThis as unknown as {
  __docketLastEmails?: Array<{
    to: string;
    subject: string;
    url?: string;
    sentAt: string;
  }>;
};

export function getRecentDevEmails() {
  return globalForEmail.__docketLastEmails ?? [];
}

const consoleProvider: EmailProvider = {
  name: "console",
  async send(msg) {
    const toStr = [msg.to].flat().join(", ");
    const urlMatch = (msg.text ?? msg.html).match(/https?:\/\/[^\s"'<>]+/);
    const list = globalForEmail.__docketLastEmails ?? [];
    list.unshift({
      to: toStr,
      subject: msg.subject,
      url: urlMatch?.[0],
      sentAt: new Date().toISOString(),
    });
    globalForEmail.__docketLastEmails = list.slice(0, 10);

    try {
      const { db, schema } = await import("@/db");
      await db.insert(schema.devEmail).values({
        to: toStr,
        subject: msg.subject,
        url: urlMatch?.[0] ?? null,
        sentAt: new Date(),
      });
    } catch (e) {
      console.warn("[email:console] Could not persist to devEmail table:", e);
    }

    console.log(
      `\n📧 [email:console] to=${toStr}\n   subject: ${msg.subject}\n   ${
        msg.text ?? msg.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      }\n`,
    );
  },
};

function resendProvider(apiKey: string): EmailProvider {
  return {
    name: "resend",
    async send(msg) {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Docket - MPP <onboarding@resend.dev>",
        to: [msg.to].flat(),
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      if (error) {
        console.warn(
          "[email:resend] Could not deliver via Resend API (" +
            error.message +
            "). Falling back to in-app stream so sign-in is not blocked.",
        );
        await consoleProvider.send(msg);
        return;
      }
    },
  };
}

function getProvider(): EmailProvider {
  if (process.env.EMAIL_PROVIDER === "resend" && process.env.RESEND_API_KEY) {
    return resendProvider(process.env.RESEND_API_KEY);
  }
  return consoleProvider;
}

export async function sendEmail(msg: EmailMessage) {
  return getProvider().send(msg);
}

/** Minimal branded HTML wrapper so every email looks consistent. */
export function emailLayout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f5f2;padding:24px;color:#1c1917">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e7e5e4">
    <div style="font-weight:700;font-size:18px;letter-spacing:-0.02em;margin-bottom:16px">📁 Docket</div>
    <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
    <p style="color:#78716c;font-size:12px;margin-top:28px">Docket is a student-run tool for the IIT Delhi MPP cohort. Not an official IIT Delhi service.</p>
  </div></body></html>`;
}

export function button(href: string, text: string) {
  return `<a href="${href}" style="display:inline-block;background:#1c1917;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${text}</a>`;
}
