"use client";

import { useState } from "react";
import { Search, Globe, Sparkles, ExternalLink, Check, Loader2, ArrowRight } from "lucide-react";
import { PRESET_SEARCH_DORKS, type DiscoveredWebJob } from "@/lib/web-search";

export function AdminWebSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoveredWebJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [importedUrls, setImportedUrls] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(qToRun?: string) {
    const q = (qToRun ?? query).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    if (qToRun) setQuery(qToRun);

    try {
      const res = await fetch(`/api/admin/web-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search request failed");
      setResults(data.results || []);
      if ((data.results || []).length === 0) {
        setError("No new unlinked opportunities found for this query. Try a broader search or another preset.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport(url: string, autoPublish: boolean) {
    setImportingUrl(url);
    try {
      const res = await fetch("/api/admin/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, autoPublish }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportedUrls((prev) => new Set(prev).add(url));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import job");
    } finally {
      setImportingUrl(null);
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-600">
            <Globe className="h-4 w-4 text-emerald-700" />
            Live Web &amp; Noticeboard Discovery Engine
          </div>
          <h2 className="mt-1 text-base font-bold text-stone-900">
            Search Open Web, Keka HR Portals &amp; Noticeboards
          </h2>
          <p className="text-xs text-stone-500">
            Discovers unlinked PDFs, university fellowship circulars, and Keka/DevNetJobs postings that do not have direct ATS APIs.
          </p>
        </div>
      </div>

      {/* Preset Dork Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-stone-500">Quick Dorks:</span>
        {PRESET_SEARCH_DORKS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => handleSearch(d.query)}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 transition-colors hover:border-stone-900 hover:bg-stone-900 hover:text-white disabled:opacity-50"
            title={d.description}
          >
            <Sparkles className="h-3 w-3 text-amber-600" />
            {d.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="mt-3 flex gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. site:keka.com "Public Policy" India OR "Research Associate" NIPFP'
            className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2 pl-9 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:outline-hidden"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 font-mono-tabular text-xs font-semibold text-[#F6F3EC] uppercase transition-colors hover:bg-stone-800 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5" />
              Search Web
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {error}
        </div>
      )}

      {/* Discovered Results Table */}
      {results.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>Discovered Opportunities ({results.length})</span>
            <span className="text-[11px] text-stone-400">Click &ldquo;Import &amp; Extract&rdquo; to parse JD and add to Docket</span>
          </div>

          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-stone-50/30">
            {results.map((r, i) => {
              const isImported = importedUrls.has(r.url) || r.alreadyInDocket;
              const isImporting = importingUrl === r.url;

              return (
                <div key={i} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.matchedOrgName ? (
                        <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          {r.matchedOrgName}
                        </span>
                      ) : (
                        <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-700 uppercase">
                          Web Discovery
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-stone-400">
                        {r.source === "devnet_noticeboard" ? "DevNetJobs" : r.source === "google_serp" ? "Google SERP" : "Web SERP"}
                      </span>
                    </div>

                    <div className="mt-1 font-bold text-stone-900 text-sm">
                      {r.title}
                    </div>

                    {r.snippet && (
                      <p className="mt-1 line-clamp-2 text-xs text-stone-600">
                        {r.snippet}
                      </p>
                    )}

                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 hover:underline"
                    >
                      {r.url.slice(0, 70)}…
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isImported ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        <Check className="h-3.5 w-3.5" />
                        In Docket
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleImport(r.url, false)}
                          disabled={isImporting}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-100 disabled:opacity-50"
                        >
                          {isImporting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="h-3 w-3" />
                          )}
                          Queue
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImport(r.url, true)}
                          disabled={isImporting}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-800 bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-900 disabled:opacity-50"
                        >
                          {isImporting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Publish
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
