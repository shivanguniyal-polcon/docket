import Link from "next/link";
import { ArrowLeft, Compass, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <div className="border-2 border-stone-900 bg-[#FBF9F4] p-8 sm:p-12">
        <div className="font-mono-tabular text-[11px] font-bold tracking-widest text-amber-900 uppercase">
          404 · MANDATE OR PAGE NOT LOCATED
        </div>
        <h1 className="font-serif-editorial mt-2 text-3xl font-normal tracking-tight text-stone-950 sm:text-5xl">
          This record is no longer active in the ledger.
        </h1>
        <p className="mt-3 text-xs leading-relaxed text-stone-600 sm:text-sm">
          The requested mandate may have closed its application window, been filled,
          or been moved during the weekly institutional crawl.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-semibold tracking-wider text-[#F6F3EC] uppercase hover:bg-stone-800"
          >
            <Search className="h-3.5 w-3.5" />
            Browse Verified Mandates →
          </Link>
          <Link
            href="/orgs"
            className="inline-flex items-center gap-1.5 border border-stone-400 bg-white px-4 py-2 text-xs font-semibold tracking-wider text-stone-800 uppercase hover:border-stone-900"
          >
            <Compass className="h-3.5 w-3.5" />
            Employer Atlas (58 Orgs)
          </Link>
        </div>
      </div>
    </div>
  );
}
