/**
 * Email delivery, behind a tiny provider interface.
 *
 * - EMAIL_PROVIDER=smtp + SMTP_USER + SMTP_PASS  -> sends through SMTP (e.g. Gmail App Password, 500 emails/day free)
 * - EMAIL_PROVIDER=resend + RESEND_API_KEY       -> sends through Resend
 * - anything else / unset                        -> logs the email to the console / devEmail db table
 *   (handy in local dev: magic links show up in the terminal and on-screen fallback)
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

function smtpProvider(user: string, pass: string): EmailProvider {
  return {
    name: "smtp",
    async send(msg) {
      try {
        const nodemailer = await import("nodemailer");
        const host = process.env.SMTP_HOST || "smtp.gmail.com";
        const port = Number(process.env.SMTP_PORT || 465);
        const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass,
          },
        });

        const from =
          process.env.EMAIL_FROM ||
          `Docket - MPP <${user}>`;

        await transporter.sendMail({
          from,
          to: [msg.to].flat().join(", "),
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        });
        console.log(`[email:smtp] Successfully dispatched email to ${[msg.to].flat().join(", ")} via ${host}`);
      } catch (error) {
        console.warn(
          `[email:smtp] Delivery failed (${error instanceof Error ? error.message : String(error)}). Falling back to in-app stream.`,
        );
        await consoleProvider.send(msg);
      }
    },
  };
}

function getProvider(): EmailProvider {
  if (
    process.env.EMAIL_PROVIDER === "smtp" ||
    (!process.env.EMAIL_PROVIDER && process.env.SMTP_USER && process.env.SMTP_PASS)
  ) {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return smtpProvider(process.env.SMTP_USER, process.env.SMTP_PASS);
    }
    console.warn("[email] EMAIL_PROVIDER=smtp specified, but SMTP_USER or SMTP_PASS is missing. Falling back to console.");
  }

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
