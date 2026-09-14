"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, RotateCcw, Zap } from "lucide-react";
import { DEFAULT_EFFORT, researchEfforts, type ResearchEffort } from "@/lib/research/effort";
import { cn } from "@/lib/utils";

interface EffortSelectorProps {
  value: ResearchEffort;
  onChange: (value: ResearchEffort) => void;
  disabled?: boolean;
  className?: string;
}

const STOPS = researchEfforts.length - 1;

export function EffortSelector({ value, onChange, disabled = false, className }: EffortSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const level = Math.max(0, researchEfforts.findIndex((effort) => effort.value === value));
  const selected = researchEfforts[level];
  const fill = `${(level / STOPS) * 100}%`;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  const select = (index: number) => {
    const next = researchEfforts[index];
    if (next && next.value !== value) onChange(next.value);
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "relative w-full rounded-2xl border border-white/20 bg-black/55 text-white shadow-xl backdrop-blur-md",
        menuOpen && "z-30",
        disabled && "opacity-60",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="flex size-8 items-center justify-center text-white/70" aria-hidden="true">
          <Zap className="size-[18px]" />
        </span>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          className="group flex flex-col items-center rounded-lg px-3 py-1 text-center outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          <span className="flex items-center gap-1 text-[22px] font-medium leading-tight text-sky-400">
            {selected.label}
            <ChevronRight className="size-5 transition-transform group-aria-expanded:rotate-90" />
          </span>
          <span className="text-sm text-white/60 tabular-nums">
            {selected.estimate} · {selected.credits}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_EFFORT)}
          disabled={disabled || value === DEFAULT_EFFORT}
          aria-label="Reset research effort"
          className="flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <RotateCcw className="size-[18px]" />
        </button>
      </div>

      <div className="relative mx-4 mb-4 mt-4 h-11">
        <div className="absolute inset-x-3 top-1/2 h-9 -translate-y-1/2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <motion.span
            className="block h-full rounded-full bg-sky-500"
            initial={false}
            animate={{ width: fill }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-[26px] top-1/2 flex -translate-y-1/2 justify-between" aria-hidden="true">
          {researchEfforts.map((effort, index) => (
            <span
              key={effort.value}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                index <= level ? "bg-white/70" : "bg-white/30"
              )}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={STOPS}
          step={1}
          value={level}
          disabled={disabled}
          onChange={(event) => select(Number(event.target.value))}
          aria-label="Research effort"
          aria-valuetext={`${selected.label} effort, ${selected.estimate}`}
          className={cn(
            "relative z-10 h-11 w-full cursor-pointer appearance-none bg-transparent outline-none",
            "[&::-webkit-slider-runnable-track]:h-11 [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:size-11 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-95",
            "[&::-moz-range-track]:h-11 [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:size-11 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
            "focus-visible:ring-2 focus-visible:ring-sky-400/60 rounded-full"
          )}
        />
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.ul
            role="listbox"
            aria-label="Research effort"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-3 right-3 top-[68px] z-30 overflow-hidden rounded-xl border border-white/15 bg-neutral-950/95 p-1 shadow-2xl backdrop-blur-xl"
          >
            {researchEfforts.map((effort, index) => {
              const active = index === level;
              return (
                <li key={effort.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      select(index);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/10",
                      active && "bg-white/10"
                    )}
                  >
                    <span className="flex w-4 shrink-0 justify-center pt-1">
                      {active && <Check className="size-4 text-sky-400" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn("text-sm font-medium", active ? "text-sky-400" : "text-white")}>
                          {effort.label}
                        </span>
                        <span className="text-xs text-white/50 tabular-nums">
                          {effort.estimate} · {effort.credits}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-white/60">
                        {effort.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
