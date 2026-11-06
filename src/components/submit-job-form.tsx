"use client";

import { useState } from "react";
import { PlusCircle, Sparkles, Loader2, MessageSquareText } from "lucide-react";
import { EXPERIENCE, JOB_TYPES, SECTORS } from "@/lib/taxonomy";
import { submitJobAction } from "@/app/actions";
import { SubmitButton } from "@/components/loading-button";

export function SubmitJobForm({
  orgs,
  autoPublish,
}: {
  orgs: Array<{ id: string; name: string }>;
  autoPublish: boolean;
}) {
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [experience, setExperience] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sectors, setSectors] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  function applyExtracted(data: Record<string, unknown>) {
    if (typeof data.url === "string" && data.url && !url) setUrl(data.url);
    if (typeof data.title === "string" && data.title) setTitle(data.title);
    if (typeof data.location === "string" && data.location)
      setLocation(data.location);
    if (typeof data.type === "string" && data.type) setType(data.type);
    if (typeof data.experience === "string" && data.experience)
      setExperience(data.experience);
    if (typeof data.deadline === "string" && data.deadline)
      setDeadline(data.deadline);
    if (Array.isArray(data.sectors)) setSectors(data.sectors.map(String));
    if (typeof data.description === "string" && data.description)
      setDescription(data.description);
    if (typeof data.orgName === "string" && data.orgName) {
      const target = data.orgName.toLowerCase();
      const match = orgs.find(
        (o) =>
          o.name.toLowerCase().includes(target) ||
          target.includes(o.name.toLowerCase()),
      );
      if (match) {
        setOrgId(match.id);
        setOrgName("");
      } else {
        setOrgId("");
        setOrgName(data.orgName);
      }
    }
  }

  async function handleExtractFromUrl() {
    if (!url.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/extract-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error || "Could not extract JD from URL");
        return;
      }
      applyExtracted(data);
    } catch {
      setExtractError("Failed to reach URL");
    } finally {
      setExtracting(false);
    }
  }

  async function handleParseForwardText() {
    if (!rawText.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/extract-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error || "Could not parse text");
        return;
      }
      applyExtracted(data);
    } finally {
      setExtracting(false);
    }
  }

  function toggleSector(k: string) {
    setSectors((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  return (
    <form
      action={submitJobAction}
      className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6"
    >
      {/* Option A: Paste a URL */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <label className="block text-xs font-bold text-stone-900">
          Option A · Paste an Official Job URL (Auto-extracts Live JD)
        </label>
        <p className="mt-0.5 text-[11px] text-stone-600">
          Works with think-tank pages, Workday, Ashby, Greenhouse, Lever &amp;
          UN/World Bank links.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="url"
            name="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.povertyactionlab.org/careers/... or mailto:..."
            className="flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={handleExtractFromUrl}
            disabled={extracting || !url.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
          >
            {extracting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            )}
            Extract Actual JD from URL
          </button>
        </div>
        {extractError && (
          <p className="mt-2 text-xs font-medium text-rose-700">
            {extractError} — you can paste the text below instead.
          </p>
        )}
      </div>

      {/* Option B: Paste a WhatsApp / LinkedIn Forward */}
      <details className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-stone-900">
          <MessageSquareText className="h-4 w-4 text-amber-700" />
          Option B · Paste a WhatsApp Forward, LinkedIn Post, or Professor Email
        </summary>
        <p className="mt-1 text-[11px] text-stone-600">
          Paste the raw message from your cohort WhatsApp group or LinkedIn. We
          will extract the Role, Org, Location, Deadline, Application Link/Email,
          and Sectors in one click.
        </p>
        <textarea
          rows={4}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Example:\nHiring: Research Intern (Winter 2026)\nOrganization: Centre for Policy Research (CPR)\nLocation: New Delhi\nDeadline: 15 Dec 2026\nApply at: https://cprindia.org/intern-with-us/`}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs"
        />
        <button
          type="button"
          onClick={handleParseForwardText}
          disabled={extracting || !rawText.trim()}
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {extracting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          )}
          {extracting ? "Parsing Forward…" : "Parse WhatsApp / LinkedIn Forward"}
        </button>
      </details>

      <div>
        <label className="block text-xs font-semibold text-stone-700">
          Role Title *
        </label>
        <input
          type="text"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Research Associate – J-PAL South Asia"
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-stone-700">
            Existing Organization (from directory)
          </label>
          <select
            name="orgId"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
          >
            <option value="">— Or type a new organization on the right —</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700">
            Or Custom Organization Name
          </label>
          <input
            type="text"
            name="orgName"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="If not in the dropdown"
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700">
            Location
          </label>
          <input
            type="text"
            name="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="New Delhi / Bengaluru / Remote"
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700">
            Opportunity Type
          </label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
          >
            <option value="">Auto-detect</option>
            {Object.entries(JOB_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700">
            Experience Band
          </label>
          <select
            name="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs"
          >
            <option value="">Auto-detect</option>
            {Object.entries(EXPERIENCE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700">
            Application Deadline
          </label>
          <input
            type="date"
            name="deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700">
          Sectors (leave blank to auto-tag)
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {Object.entries(SECTORS).map(([k, v]) => (
            <label
              key={k}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs"
            >
              <input
                type="checkbox"
                name="sectors"
                value={k}
                checked={sectors.includes(k)}
                onChange={() => toggleSector(k)}
              />
              {v}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700">
          Extracted Job Description (JD) &amp; Requirements
        </label>
        <textarea
          name="description"
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Full JD text extracted from the URL or WhatsApp forward will appear here…"
          className="mt-1 w-full rounded-xl border border-stone-300 p-3 text-xs leading-relaxed"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-700">
          Your Contact / Submitter Email (Optional)
        </label>
        <input
          type="text"
          name="submitterContact"
          placeholder="e.g. partner@policyfirm.org or Phone/LinkedIn — for moderation follow-up"
          className="mt-1 w-full rounded-xl border border-stone-300 p-2.5 text-xs"
        />
        <p className="mt-1 text-[11px] text-stone-500">
          Recruiters &amp; partners: leave your contact if you want cohort applications routed to a specific inbox.
        </p>
      </div>

      <SubmitButton
        pendingText={autoPublish ? "Publishing…" : "Submitting…"}
        icon={<PlusCircle className="h-4 w-4" />}
        className="rounded-xl bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
      >
        {autoPublish ? "Publish Opening" : "Submit Opening to Cohort Review Desk"}
      </SubmitButton>
    </form>
  );
}
