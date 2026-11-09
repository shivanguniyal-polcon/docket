"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Plus, Trash2, Sparkles, Filter } from "lucide-react";

interface SavedPreset {
  id: string;
  name: string;
  query: string;
}

const DEFAULT_PRESETS = [
  { label: "🎓 0–2 YOE & Internships", href: "/jobs?experience=0-2" },
  { label: "🏛️ Think Tanks", href: "/jobs?sector=governance" },
  { label: "🌿 Climate & Energy", href: "/jobs?sector=climate" },
  { label: "🔬 Academic & RAships", href: "/jobs?q=Research+Associate" },
  { label: "⚡ Fresh This Week", href: "/jobs?fresh=true" },
];

export function SavedFilterPresets() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentQueryString = searchParams.toString();
  const [customPresets, setCustomPresets] = useState<SavedPreset[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("docket_saved_filter_presets");
      if (stored) setCustomPresets(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  function saveCurrentFilter(e: React.FormEvent) {
    e.preventDefault();
    if (!newPresetName.trim() || !currentQueryString) return;

    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      query: currentQueryString,
    };

    const updated = [newPreset, ...customPresets].slice(0, 8);
    setCustomPresets(updated);
    localStorage.setItem("docket_saved_filter_presets", JSON.stringify(updated));
    setNewPresetName("");
    setIsSaving(false);
  }

  function deletePreset(id: string) {
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem("docket_saved_filter_presets", JSON.stringify(updated));
  }

  const hasActiveFilters = Boolean(currentQueryString);

  return (
    <div className="border border-stone-300 bg-[#EFECE4]/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 font-mono-tabular text-[10px] font-bold text-stone-700 uppercase">
            <Filter className="h-3 w-3" /> Quick Presets:
          </span>

          {DEFAULT_PRESETS.map((p) => {
            const isActive = `/jobs?${currentQueryString}` === p.href;
            return (
              <Link
                key={p.href}
                href={p.href}
                prefetch={false}
                className={`border px-2 py-0.5 font-mono-tabular text-[11px] font-semibold transition ${
                  isActive
                    ? "border-stone-900 bg-stone-900 text-[#F6F3EC]"
                    : "border-stone-400 bg-white text-stone-800 hover:border-stone-900 hover:bg-stone-900 hover:text-white"
                }`}
              >
                {p.label}
              </Link>
            );
          })}

          {customPresets.map((p) => {
            const isActive = currentQueryString === p.query;
            return (
              <div
                key={p.id}
                className={`inline-flex items-center border px-2 py-0.5 font-mono-tabular text-[11px] font-semibold ${
                  isActive
                    ? "border-amber-900 bg-amber-900 text-white"
                    : "border-amber-800/40 bg-amber-50 text-amber-950"
                }`}
              >
                <Link href={`/jobs?${p.query}`} prefetch={false} className="hover:underline">
                  ★ {p.name}
                </Link>
                <button
                  type="button"
                  onClick={() => deletePreset(p.id)}
                  className="ml-1.5 opacity-60 hover:opacity-100"
                  title="Remove saved preset"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            {!isSaving ? (
              <button
                type="button"
                onClick={() => setIsSaving(true)}
                className="inline-flex items-center gap-1 border border-stone-800 bg-white px-2 py-0.5 font-mono-tabular text-[10px] font-semibold text-stone-900 uppercase hover:bg-stone-900 hover:text-white"
              >
                <Bookmark className="h-2.5 w-2.5" />
                Save Active Filter
              </button>
            ) : (
              <form onSubmit={saveCurrentFilter} className="flex items-center gap-1">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name (e.g. Delhi Policy)"
                  className="border border-stone-400 bg-white px-2 py-0.5 text-xs font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newPresetName.trim()}
                  className="border border-stone-900 bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsSaving(false)}
                  className="px-1 text-xs text-stone-500 hover:text-stone-900"
                >
                  ✕
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
