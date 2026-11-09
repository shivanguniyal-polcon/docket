"use client";

import { useState } from "react";
import { Zap, Loader2, Check, ArrowRight, Building2, MapPin, Calendar, FileText } from "lucide-react";
import { addCustomApplicationAction } from "@/app/actions";

interface ExtractedData {
  title: string;
  orgName: string;
  location: string;
  deadline: string | null;
  description: string;
  url: string;
  type?: string;
}

export function QuickForwardModal() {
  const [open, setOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleExtract() {
    setIsExtracting(true);
    setError(null);
    setExtracted(null);

    try {
      const payload = inputMode === "text" ? { rawText: inputText } : { url: inputUrl };
      const res = await fetch("/api/extract-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse mandate");

      setExtracted({
        title: data.title || "Policy Opening",
        orgName: data.orgName || "Policy Organization",
        location: data.location || "India",
        deadline: data.deadline || null,
        description: data.description || "",
        url: data.url || inputUrl || "https://docket-mpp.vercel.app",
        type: data.type || "full_time",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSaveToTracker() {
    if (!extracted) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("title", extracted.title);
      formData.set("orgName", extracted.orgName);
      formData.set("url", extracted.url);
      formData.set("type", extracted.type || "full_time");
      formData.set("status", "saved");
      if (extracted.deadline) formData.set("deadline", extracted.deadline);
      formData.set("notes", `Forward extracted via Quick Ingest:\n${extracted.description.slice(0, 500)}`);

      await addCustomApplicationAction(formData);
      setSuccessMsg("✓ Successfully saved to your Personal Tracker (/tracker)!");
      setTimeout(() => {
        setOpen(false);
        setExtracted(null);
        setSuccessMsg(null);
        setInputText("");
        setInputUrl("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to tracker");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-3 py-1.5 font-mono-tabular text-xs font-bold text-[#F6F3EC] uppercase transition hover:bg-stone-800"
      >
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        Quick Paste Forward
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border-2 border-stone-900 bg-[#FBF9F4] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-stone-900 pb-3">
              <div>
                <div className="font-mono-tabular text-[10px] font-bold text-amber-900 uppercase">
                  Instant WhatsApp &amp; Forward Ingestion
                </div>
                <h2 className="font-serif-editorial text-xl font-normal text-stone-950">
                  Parse Unstructured Policy Forward
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border border-stone-900 bg-white px-2 py-0.5 font-mono-tabular text-xs font-bold text-stone-900 hover:bg-stone-900 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-stone-600">
              Paste messy text from a cohort WhatsApp group, email, or direct URL. Docket parses the organization, title, eligibility, and deadline instantly.
            </p>

            <div className="mt-4 flex gap-2 border-b border-stone-300 pb-2">
              <button
                type="button"
                onClick={() => setInputMode("text")}
                className={`px-3 py-1 font-mono-tabular text-xs font-bold uppercase ${
                  inputMode === "text"
                    ? "border-b-2 border-stone-900 font-extrabold text-stone-950"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                💬 Paste WhatsApp / Text Message
              </button>
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`px-3 py-1 font-mono-tabular text-xs font-bold uppercase ${
                  inputMode === "url"
                    ? "border-b-2 border-stone-900 font-extrabold text-stone-950"
                    : "text-stone-500 hover:text-stone-900"
                }`}
              >
                🔗 Paste Career URL / PDF Link
              </button>
            </div>

            <div className="mt-3">
              {inputMode === "text" ? (
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={6}
                  placeholder={`Example forward:
"Urgent opening at CEEW for Research Analyst in Climate Policy.
Location: New Delhi. Stata/R required. 0-2 yrs exp.
Deadline: Nov 25. Apply via careers@ceew.in"`}
                  className="w-full border border-stone-400 bg-white p-3 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                />
              ) : (
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://example.org/careers/policy-analyst"
                  className="w-full border border-stone-400 bg-white p-3 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                />
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleExtract}
                disabled={isExtracting || (inputMode === "text" ? !inputText.trim() : !inputUrl.trim())}
                className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-4 py-2 font-mono-tabular text-xs font-bold text-white uppercase hover:bg-stone-800 disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Extracting Mandate…
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    Extract Structured Data →
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-3 border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mt-3 border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
                {successMsg}
              </div>
            )}

            {extracted && !successMsg && (
              <div className="mt-4 space-y-3 border-2 border-stone-900 bg-white p-4">
                <div className="font-mono-tabular text-[10px] font-bold text-emerald-900 uppercase">
                  ✓ Mandate Extracted Successfully
                </div>

                <div className="grid gap-2 text-xs">
                  <div>
                    <span className="font-bold text-stone-900">Organization: </span>
                    <span className="font-mono-tabular">{extracted.orgName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-900">Role Title: </span>
                    <span className="font-bold text-stone-950">{extracted.title}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-900">Location: </span>
                    <span className="font-mono-tabular">{extracted.location}</span>
                  </div>
                  <div>
                    <span className="font-bold text-stone-900">Deadline: </span>
                    <span className="font-mono-tabular text-amber-900">
                      {extracted.deadline ? extracted.deadline : "Rolling Intake"}
                    </span>
                  </div>
                  {extracted.description && (
                    <div className="border-t border-stone-200 pt-2 text-[11px] text-stone-600 line-clamp-3">
                      {extracted.description}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
                  <button
                    type="button"
                    onClick={handleSaveToTracker}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-3.5 py-1.5 font-mono-tabular text-xs font-bold text-white uppercase hover:bg-stone-800 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Save to My Tracker (/tracker)
                  </button>
                  <a
                    href={`/submit?title=${encodeURIComponent(extracted.title)}&orgName=${encodeURIComponent(extracted.orgName)}&url=${encodeURIComponent(extracted.url)}`}
                    className="inline-flex items-center gap-1 border border-stone-900 bg-[#FBF9F4] px-3.5 py-1.5 font-mono-tabular text-xs font-bold text-stone-900 uppercase hover:bg-stone-900 hover:text-white"
                  >
                    Submit to Cohort Feed (/jobs) →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
