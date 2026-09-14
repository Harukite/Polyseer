import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResearchHistoryList } from "@/components/research/research-history";

export const metadata: Metadata = {
  title: "Research history | Polyseer",
  robots: { index: false, follow: false },
};

export default function HistoryPage() {
  return (
    <div className="relative min-h-screen px-4 pb-24 pt-24 sm:px-6 md:pt-28">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 text-white">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
              <ArrowLeft className="size-4" aria-hidden="true" /> New forecast
            </Link>
            <h1 className="mt-2 text-2xl font-semibold font-[family-name:var(--font-space)]">Research history</h1>
            <p className="mt-1 text-sm text-white/65">
              Every forecast run from this account. Running research keeps updating here.
            </p>
          </div>
        </div>
        <ResearchHistoryList />
      </div>
    </div>
  );
}
