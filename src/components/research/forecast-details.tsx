"use client";

import ReactMarkdown from "react-markdown";
import { ArrowDown, ArrowUp, CalendarClock, HelpCircle, ShieldAlert } from "lucide-react";
import type { ForecastEvidence, ForecastOutput } from "@/lib/research/schema";
import { cn } from "@/lib/utils";
import { SourceFavicon, sourceHost } from "./source-favicon";

const pct = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : "n/a";

function Panel({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-white/20 bg-black/45 p-4 text-white shadow-xl backdrop-blur-md sm:p-5", className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/70">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EvidenceItem({ item }: { item: ForecastEvidence }) {
  const forYes = item.direction === "for";
  const weight = Math.max(1, Math.min(5, Math.round(item.weight || 1)));
  return (
    <li className="flex gap-3 rounded-xl bg-white/5 p-3">
      <span
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
          forYes ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
        )}
        aria-label={forYes ? "Supports YES" : "Supports NO"}
      >
        {forYes ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-white/90">{item.claim}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
          <span className="flex items-center gap-1" aria-label={`Weight ${weight} of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={cn("size-1.5 rounded-full", i < weight ? (forYes ? "bg-emerald-300" : "bg-rose-300") : "bg-white/20")}
              />
            ))}
          </span>
          {item.date && <span>{item.date}</span>}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white/70 hover:text-white"
            >
              <SourceFavicon url={item.source_url} size={12} />
              <span className="truncate">{item.source_title || sourceHost(item.source_url)}</span>
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function ForecastDetails({ forecast }: { forecast: ForecastOutput }) {
  const evidence = [...forecast.key_evidence].sort((a, b) => (b.weight || 0) - (a.weight || 0));
  const forYes = evidence.filter((item) => item.direction === "for");
  const forNo = evidence.filter((item) => item.direction !== "for");

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Evidence for YES" icon={<ArrowUp className="size-4 text-emerald-300" aria-hidden="true" />}>
          {forYes.length ? (
            <ul className="grid gap-2">{forYes.map((item, i) => <EvidenceItem key={i} item={item} />)}</ul>
          ) : (
            <p className="text-sm text-white/55">No material evidence found for YES.</p>
          )}
        </Panel>
        <Panel title="Evidence for NO" icon={<ArrowDown className="size-4 text-rose-300" aria-hidden="true" />}>
          {forNo.length ? (
            <ul className="grid gap-2">{forNo.map((item, i) => <EvidenceItem key={i} item={item} />)}</ul>
          ) : (
            <p className="text-sm text-white/55">No material evidence found for NO.</p>
          )}
        </Panel>
      </div>

      {forecast.outcomes && forecast.outcomes.length > 1 && (
        <Panel title="Outcome probabilities">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-white/50">
              <tr>
                <th className="pb-2 font-medium">Outcome</th>
                <th className="pb-2 text-right font-medium">Market</th>
                <th className="pb-2 text-right font-medium">Polyseer</th>
              </tr>
            </thead>
            <tbody>
              {forecast.outcomes.map((outcome) => (
                <tr key={outcome.outcome} className="border-t border-white/10">
                  <td className="py-2 pr-3 text-white/90">{outcome.outcome}</td>
                  <td className="py-2 text-right tabular-nums text-white/60">{pct(outcome.market_probability)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{pct(outcome.probability)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {forecast.base_rate && (
          <Panel title="Base rate">
            <p className="text-2xl font-semibold tabular-nums">{pct(forecast.base_rate.value)}</p>
            <p className="mt-1 text-sm text-white/75">{forecast.base_rate.reference_class}</p>
            {forecast.base_rate.note && <p className="mt-2 text-sm text-white/55">{forecast.base_rate.note}</p>}
          </Panel>
        )}
        <Panel title="Resolution criteria">
          <p className="text-sm leading-relaxed text-white/80">{forecast.resolution_criteria}</p>
        </Panel>
      </div>

      {forecast.catalysts && forecast.catalysts.length > 0 && (
        <Panel title="Catalysts before resolution" icon={<CalendarClock className="size-4" aria-hidden="true" />}>
          <ul className="grid gap-2">
            {forecast.catalysts.map((catalyst, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-white/5 p-3 text-sm">
                <span className="w-24 shrink-0 text-xs text-white/50 tabular-nums">{catalyst.date || "Date TBC"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-white/90">{catalyst.event}</span>
                  <span className="mt-0.5 block text-xs text-white/55">{catalyst.expected_impact}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {forecast.what_would_change_mind && forecast.what_would_change_mind.length > 0 && (
          <Panel title="What would change this forecast" icon={<HelpCircle className="size-4" aria-hidden="true" />}>
            <ul className="grid gap-1.5 text-sm text-white/80">
              {forecast.what_would_change_mind.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-white/50" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {forecast.risks && forecast.risks.length > 0 && (
          <Panel title="Risks" icon={<ShieldAlert className="size-4 text-amber-300" aria-hidden="true" />}>
            <ul className="grid gap-1.5 text-sm text-white/80">
              {forecast.risks.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-amber-300/70" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <Panel title="Rationale">
        <div className="prose prose-sm prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-a:text-sky-300 prose-a:no-underline hover:prose-a:underline prose-li:marker:text-white/40">
          <ReactMarkdown
            components={{
              a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            }}
          >
            {forecast.rationale}
          </ReactMarkdown>
        </div>
      </Panel>
    </div>
  );
}
