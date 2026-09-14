"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { downloadDeliverable } from "@/lib/research/client";
import type { ResearchDeliverable } from "@/lib/research/task";
import { cn } from "@/lib/utils";

const META: Record<string, { label: string; icon: typeof FileText; blurb: string }> = {
  pdf: { label: "Full report (PDF)", icon: FileText, blurb: "Evidence, base rates, catalysts, and cited sources." },
  csv: { label: "Factors (CSV)", icon: FileSpreadsheet, blurb: "Every event and factor with direction, weight, date, and source." },
  xlsx: { label: "Spreadsheet (XLSX)", icon: FileSpreadsheet, blurb: "Tabular data from the research." },
  docx: { label: "Document (DOCX)", icon: FileText, blurb: "Written report." },
  pptx: { label: "Slides (PPTX)", icon: FileText, blurb: "Summary presentation." },
};

function slug(value: string | undefined): string {
  return (value || "forecast").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "forecast";
}

export function ResearchDeliverables({
  taskId,
  deliverables,
  question,
}: {
  taskId: string;
  deliverables: ResearchDeliverable[];
  question?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = deliverables.filter((d) => d.status === "completed");
  if (ready.length === 0) return null;

  const download = async (deliverable: ResearchDeliverable) => {
    setBusy(deliverable.id);
    setError(null);
    try {
      await downloadDeliverable(taskId, deliverable.id, `polyseer-${slug(question)}.${deliverable.type}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download this file.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-label="Downloads"
      className="rounded-2xl border border-white/20 bg-black/45 p-4 text-white shadow-xl backdrop-blur-md sm:p-5"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Downloads</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {ready.map((deliverable) => {
          const meta = META[deliverable.type] || { label: deliverable.title, icon: FileText, blurb: deliverable.description || "" };
          const Icon = meta.icon;
          const loading = busy === deliverable.id;
          return (
            <button
              key={deliverable.id}
              type="button"
              onClick={() => download(deliverable)}
              disabled={loading}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3 text-left transition-colors hover:bg-white/15 disabled:opacity-60"
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10" aria-hidden="true">
                {loading ? <LoaderCircle className="size-5 animate-spin" /> : <Icon className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{meta.label}</span>
                <span className="block truncate text-xs text-white/55">
                  {deliverable.rowCount ? `${deliverable.rowCount} rows. ` : ""}
                  {meta.blurb}
                </span>
              </span>
              <Download className="size-4 shrink-0 text-white/50" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </section>
  );
}
