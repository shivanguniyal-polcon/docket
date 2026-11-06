"use client";

import { useState } from "react";
import {
  FileText,
  Sparkles,
  CheckSquare,
  GraduationCap,
  Building2,
  MapPin,
  Clock,
  Layers,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Code2,
  Briefcase,
} from "lucide-react";
import {
  parseStructuredJobDescription,
  type ParsedJDSection,
} from "@/lib/parse-jd";
import { SubmitButton } from "@/components/loading-button";

interface StructuredJobDescriptionProps {
  jobId: string;
  description: string | null;
  officialUrl: string;
  refreshAction: (formData: FormData) => Promise<void>;
}

export function StructuredJobDescription({
  jobId,
  description,
  officialUrl,
  refreshAction,
}: StructuredJobDescriptionProps) {
  const [viewMode, setViewMode] = useState<"structured" | "raw">("structured");
  const [copied, setCopied] = useState(false);

  const parsed = parseStructuredJobDescription(description);
  const hasSections = parsed.sections.length > 0;
  const meta = parsed.metadata;

  async function handleCopy() {
    if (!description) return;
    try {
      // Build clean structured text for copying
      const lines: string[] = [];
      if (meta.experience) lines.push(`Experience: ${meta.experience}`);
      if (meta.education) lines.push(`Education: ${meta.education}`);
      if (meta.practice) lines.push(`Practice: ${meta.practice}`);
      if (meta.location) lines.push(`Location: ${meta.location}`);
      if (lines.length > 0) lines.push("");

      for (const sec of parsed.sections) {
        lines.push(`## ${sec.title}`);
        for (const p of sec.paragraphs) lines.push(p);
        for (const b of sec.bullets) lines.push(`• ${b}`);
        lines.push("");
      }

      const textToCopy = lines.length > 0 ? lines.join("\n") : description;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function getSectionIcon(type: ParsedJDSection["type"]) {
    switch (type) {
      case "responsibilities":
        return <CheckSquare className="h-4 w-4 text-emerald-800" />;
      case "qualifications":
        return <GraduationCap className="h-4 w-4 text-blue-800" />;
      case "skills":
        return <Sparkles className="h-4 w-4 text-amber-800" />;
      case "organization":
        return <Building2 className="h-4 w-4 text-purple-800" />;
      case "summary":
        return <FileText className="h-4 w-4 text-stone-800" />;
      default:
        return <Layers className="h-4 w-4 text-stone-600" />;
    }
  }

  return (
    <div className="mt-6 border-t border-stone-200 pt-5">
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif-editorial text-lg font-bold text-stone-950">
              Official Job Description
            </h2>
            <span className="font-mono-tabular rounded bg-amber-100/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-950 uppercase">
              Structured Intelligence
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-stone-500">
            Parsed and normalized from official posting URL • Stripped of cookie
            &amp; ATS boilerplate
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {description && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
                title="Copy clean structured summary for application or CV bullets"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" />
                    <span className="text-emerald-800">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-stone-500" />
                    <span>Copy Clean Summary</span>
                  </>
                )}
              </button>

              <div className="flex border border-stone-300 bg-white text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("structured")}
                  className={`px-2.5 py-1 font-semibold transition ${
                    viewMode === "structured"
                      ? "bg-stone-900 text-[#F6F3EC]"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                >
                  Structured
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("raw")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 font-semibold transition ${
                    viewMode === "raw"
                      ? "bg-stone-900 text-[#F6F3EC]"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                  title="View verbatim raw text as crawled"
                >
                  <Code2 className="h-3 w-3" />
                  Raw Source
                </button>
              </div>
            </>
          )}

          <form action={refreshAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <SubmitButton
              pendingText="Live-extracting…"
              icon={<RefreshCw className="h-3 w-3" />}
              className="border border-stone-900 bg-stone-900 px-3 py-1 text-xs font-semibold text-[#F6F3EC] transition hover:bg-stone-800"
            >
              Refresh JD
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* Main Content Area */}
      {!description ? (
        <div className="mt-4 border border-dashed border-stone-300 bg-stone-50/70 p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-stone-400" />
          <h3 className="mt-2 text-sm font-semibold text-stone-900">
            No Cached Job Description Available
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-stone-600">
            The full job description has not been pulled yet. Click &ldquo;Refresh
            JD&rdquo; above to live-extract the posting, or open the official
            mandate link below.
          </p>
          <div className="mt-4">
            <a
              href={officialUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-semibold text-[#F6F3EC] hover:bg-stone-800"
            >
              Open Official Posting URL
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : viewMode === "raw" ? (
        /* Raw Verbatim View */
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono-tabular">
            <span>VERBATIM CRAWL STREAM ({description.length} characters)</span>
            <a
              href={officialUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-stone-800 hover:underline"
            >
              Source URL
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <pre className="max-h-[600px] overflow-auto border border-stone-300 bg-[#FBF9F4] p-4 font-mono text-xs leading-relaxed text-stone-800 whitespace-pre-wrap select-text">
            {description}
          </pre>
        </div>
      ) : (
        /* Structured Intelligence View */
        <div className="mt-4 space-y-4">
          {/* Quick Telemetry Callout Pill Bar */}
          {(meta.experience ||
            meta.education ||
            meta.practice ||
            meta.location ||
            (meta.atsFields && Object.keys(meta.atsFields).length > 0)) && (
            <div className="flex flex-wrap items-center gap-2 border border-stone-300 bg-[#FBF9F4] p-3 text-xs">
              <span className="font-mono-tabular text-[10px] font-bold text-stone-500 uppercase tracking-wider mr-1">
                At a Glance:
              </span>

              {meta.experience && (
                <div className="inline-flex items-center gap-1.5 rounded-none border border-stone-300 bg-white px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5 text-amber-800" />
                  <span className="text-[11px] text-stone-600">Experience:</span>
                  <strong className="text-[11px] font-bold text-stone-900">
                    {meta.experience}
                  </strong>
                </div>
              )}

              {meta.education && (
                <div className="inline-flex items-center gap-1.5 rounded-none border border-stone-300 bg-white px-2.5 py-1">
                  <GraduationCap className="h-3.5 w-3.5 text-blue-800" />
                  <span className="text-[11px] text-stone-600">Education:</span>
                  <strong className="text-[11px] font-bold text-stone-900">
                    {meta.education}
                  </strong>
                </div>
              )}

              {meta.practice && (
                <div className="inline-flex items-center gap-1.5 rounded-none border border-stone-300 bg-white px-2.5 py-1">
                  <Briefcase className="h-3.5 w-3.5 text-purple-800" />
                  <span className="text-[11px] text-stone-600">Practice:</span>
                  <strong className="text-[11px] font-bold text-stone-900">
                    {meta.practice}
                  </strong>
                </div>
              )}

              {meta.location && (
                <div className="inline-flex items-center gap-1.5 rounded-none border border-stone-300 bg-white px-2.5 py-1">
                  <MapPin className="h-3.5 w-3.5 text-red-800" />
                  <span className="text-[11px] text-stone-600">Location:</span>
                  <strong className="text-[11px] font-bold text-stone-900">
                    {meta.location}
                  </strong>
                </div>
              )}

              {meta.atsFields?.["Management Level"] && (
                <div className="inline-flex items-center gap-1.5 rounded-none border border-stone-300 bg-white px-2.5 py-1">
                  <span className="text-[11px] text-stone-600">Level:</span>
                  <strong className="text-[11px] font-bold text-stone-900">
                    {meta.atsFields["Management Level"]}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Section Cards */}
          {hasSections ? (
            <div className="space-y-4">
              {parsed.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-none border border-stone-300 bg-white p-5 transition hover:border-stone-400"
                >
                  {/* Card Title */}
                  <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      {getSectionIcon(section.type)}
                      <h3 className="font-serif-editorial text-base font-bold text-stone-950">
                        {section.title}
                      </h3>
                    </div>
                    {section.bullets.length > 0 && (
                      <span className="font-mono-tabular text-[10px] text-stone-500">
                        {section.bullets.length}{" "}
                        {section.bullets.length === 1 ? "deliverable" : "items"}
                      </span>
                    )}
                  </div>

                  {/* Paragraphs */}
                  {section.paragraphs.length > 0 && (
                    <div className="mt-3 space-y-2 text-xs leading-relaxed text-stone-800">
                      {section.paragraphs.map((p, pIdx) => (
                        <p key={pIdx}>{p}</p>
                      ))}
                    </div>
                  )}

                  {/* Bullets */}
                  {section.bullets.length > 0 && (
                    <ul className="mt-3 space-y-2 text-xs leading-relaxed text-stone-800">
                      {section.bullets.map((b, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-900" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Fallback clean presentation */
            <div className="border border-stone-300 bg-white p-5">
              <p className="whitespace-pre-line text-xs leading-relaxed text-stone-800">
                {parsed.rawCleaned || description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
