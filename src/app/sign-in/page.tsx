"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, Shield, CheckCircle2, ExternalLink, Terminal } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface DevEmail {
  to: string;
  subject: string;
  url?: string;
  sentAt: string;
}

function toRelativeUrl(rawUrl?: string) {
  if (!rawUrl) return "#";
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return rawUrl;
  }
}

function SignInForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/jobs";
  const prefill = searchParams.get("prefill") || "";

  const [email, setEmail] = useState(prefill);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [devEmails, setDevEmails] = useState<DevEmail[]>([]);

  async function refreshDevInbox() {
    try {
      const res = await fetch("/api/dev-inbox");
      if (res.ok) {
        const data = (await res.json()) as {
          enabled: boolean;
          emails: DevEmail[];
        };
        if (data.enabled) setDevEmails(data.emails);
      }
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg(null);

    const { error } = await authClient.signIn.magicLink({
      email: email.trim().toLowerCase(),
      callbackURL: nextPath,
    });

    if (error) {
      setStatus("error");
      setErrorMsg(
        error.message ||
          "Sign-in failed. Make sure you use your @iitd.ac.in address or a verified backup email.",
      );
      return;
    }

    setStatus("sent");
    await refreshDevInbox();
  }

  async function quickPick(preset: string) {
    setEmail(preset);
    setStatus("sending");
    setErrorMsg(null);
    const { error } = await authClient.signIn.magicLink({
      email: preset,
      callbackURL: nextPath,
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message || "Sign-in failed");
      return;
    }
    setStatus("sent");
    await refreshDevInbox();
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <div className="border-2 border-stone-900 bg-[#FBF9F4] p-6">
        <div className="font-mono-tabular flex items-center gap-2 text-[11px] font-bold tracking-widest text-amber-900 uppercase">
          <Shield className="h-3.5 w-3.5" />
          IIT Delhi MPP Cohort Access
        </div>
        <h1 className="font-serif-editorial mt-2 text-3xl text-stone-950">
          Sign in to Docket
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-stone-700">
          New members must sign up with their{" "}
          <code className="border border-stone-300 bg-[#EFECE3] px-1 py-0.5 font-mono text-stone-900">
            @iitd.ac.in
          </code>{" "}
          address. Returning members and alumni can also use a verified personal
          backup email.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="font-mono-tabular block text-[11px] font-bold tracking-wider text-stone-800 uppercase"
            >
              Institutional or Backup Email
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-stone-500" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ppm254500@iitd.ac.in or verified personal email"
                className="w-full border border-stone-900 bg-white py-2 pr-3 pl-9 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full bg-stone-900 py-2.5 text-xs font-bold tracking-wider text-[#FBF9F4] uppercase hover:bg-stone-800 disabled:opacity-50"
          >
            {status === "sending"
              ? "Generating Sign-In Link…"
              : "Send Sign-In Magic Link →"}
          </button>
        </form>

        {status === "error" && errorMsg && (
          <div className="mt-4 border border-red-800 bg-red-50 p-3 text-xs text-red-900">
            {errorMsg}
          </div>
        )}

        {status === "sent" && (
          <div className="mt-4 space-y-2 border border-emerald-900 bg-emerald-50/80 p-3 text-xs text-emerald-950">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-800" />
              Magic link generated for {email}
            </div>
            <p className="text-emerald-900">
              If email delivery is in console/preview mode, click{" "}
              <strong>Complete sign-in</strong> in the box below.
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-stone-300 pt-4 text-[11px] leading-relaxed text-stone-600">
          <strong>Why dual email?</strong> Your IITD email verifies that you
          belong to the cohort. Once inside, add a personal Gmail/Outlook in{" "}
          <em>Settings</em> so you never lose access after graduating.
        </div>
      </div>

      {/* Preview / Demo Mode Quick Sign-in (only shown in local development) */}
      {process.env.NODE_ENV !== "production" && (
        <div className="border border-stone-900 bg-[#EFECE3] p-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono-tabular flex items-center gap-1.5 text-[11px] font-bold text-stone-900 uppercase">
              <Terminal className="h-3.5 w-3.5" />
              Instant Local Dev Sign-In
            </span>
            <button
              type="button"
              onClick={refreshDevInbox}
              className="font-mono-tabular text-[11px] font-semibold text-stone-800 underline"
            >
              Refresh links
            </button>
          </div>
          <p className="mt-1 text-[11px] text-stone-700">
            Local development only: click below to mint a session without checking emails:
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => quickPick("ppm254500@iitd.ac.in")}
              className="border border-stone-900 bg-[#FBF9F4] px-2.5 py-1 text-[11px] font-bold text-stone-900 hover:bg-stone-900 hover:text-[#FBF9F4]"
            >
              Shivang Uniyal · Owner (ppm254500@iitd.ac.in)
            </button>
          </div>

          {devEmails.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-stone-300 pt-2.5">
              <div className="font-mono-tabular text-[11px] font-bold text-stone-800 uppercase">
                Ready Sign-In Links (Click to enter):
              </div>
              {devEmails.slice(0, 3).map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-stone-400 bg-[#FBF9F4] p-2"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-stone-900">{m.to}</div>
                    <div className="text-[10px] text-stone-600">{m.subject}</div>
                  </div>
                  {m.url && (
                    <a
                      href={toRelativeUrl(m.url)}
                      className="inline-flex shrink-0 items-center gap-1 bg-stone-900 px-2.5 py-1 text-[11px] font-bold text-[#FBF9F4] hover:bg-stone-800"
                    >
                      Complete sign-in
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
