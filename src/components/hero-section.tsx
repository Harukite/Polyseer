"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import ZoomTransition from "@/components/zoom-transition";
import Image from "next/image";
import { AuthModal } from "@/components/auth-modal";
import { EffortSelector } from "@/components/research/effort-selector";
import { DEFAULT_EFFORT, parseResearchEffort, type ResearchEffort } from "@/lib/research/effort";
import { isSelfHostedApp, startResearch } from "@/lib/research/client";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { isValidMarketUrl, detectPlatform } from "@/lib/tools/market-url-parser";

interface HeroSectionProps {
  onShowHowItWorks: () => void;
  marketUrl?: string;
  setMarketUrl?: (url: string) => void;
  /** Increment to submit the current market URL (used by the trending carousel). */
  submitSignal?: number;
}

const DRAFT_KEY = "polyseer_research_draft";
const EFFORT_KEY = "polyseer_research_effort";

function readDraft(): { url: string; effort: ResearchEffort } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: unknown; effort?: unknown };
    const effort = parseResearchEffort(parsed.effort);
    return typeof parsed.url === "string" && effort ? { url: parsed.url, effort } : null;
  } catch {
    return null;
  }
}

export default function HeroSection({ onShowHowItWorks, marketUrl, setMarketUrl, submitSignal }: HeroSectionProps) {
  const [url, setUrl] = useState("");
  const [effort, setEffort] = useState<ResearchEffort>(DEFAULT_EFFORT);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const lastSignal = useRef(submitSignal ?? 0);
  const resumedRef = useRef(false);

  // Sync with external URL prop
  useEffect(() => {
    if (marketUrl && marketUrl !== url) {
      setUrl(marketUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketUrl]);

  // Remember the chosen effort between visits.
  useEffect(() => {
    const saved = parseResearchEffort(localStorage.getItem(EFFORT_KEY) || undefined);
    if (saved) setEffort(saved);
  }, []);
  const changeEffort = (next: ResearchEffort) => {
    setEffort(next);
    try {
      localStorage.setItem(EFFORT_KEY, next);
    } catch {
      // Storage unavailable; the selection still applies for this visit.
    }
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setMarketUrl?.(newUrl);
    setError("");
  };

  const detectedPlatform = url ? detectPlatform(url) : null;

  const submit = useCallback(
    async (candidateUrl: string, chosenEffort: ResearchEffort) => {
      setError("");
      const trimmed = candidateUrl.trim();
      if (!trimmed) {
        setError("Paste a Polymarket or Kalshi market URL");
        return;
      }
      if (!isValidMarketUrl(trimmed)) {
        setError("That does not look like a Polymarket or Kalshi market URL");
        return;
      }
      if (!isSelfHostedApp && !user) {
        try {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ url: trimmed, effort: chosenEffort }));
        } catch {
          // Storage unavailable; the user can paste the URL again after sign-in.
        }
        setAuthOpen(true);
        return;
      }

      setSubmitting(true);
      try {
        import("@vercel/analytics").then(({ track }) => {
          track("Research Started", { platform: detectPlatform(trimmed) || "unknown", effort: chosenEffort });
        });
        const research = await startResearch(trimmed, chosenEffort);
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          // Ignore storage errors.
        }
        setDestination(`/research/${research.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "The research could not start. Please try again.");
        setSubmitting(false);
      }
    },
    [user]
  );

  // Submit when the trending carousel picks a market.
  useEffect(() => {
    if (submitSignal === undefined || submitSignal === lastSignal.current) return;
    lastSignal.current = submitSignal;
    if (marketUrl) void submit(marketUrl, effort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitSignal]);

  // Resume a draft saved before the sign-in redirect.
  useEffect(() => {
    if (resumedRef.current || isSelfHostedApp || !initialized || !user) return;
    const draft = readDraft();
    if (!draft) return;
    resumedRef.current = true;
    setUrl(draft.url);
    setMarketUrl?.(draft.url);
    setEffort(draft.effort);
    void submit(draft.url, draft.effort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit(url, effort);
  };

  const emailNote = !isSelfHostedApp && user?.email ? user.email : null;

  return (
    <section className="relative flex-shrink-0 flex items-center justify-center px-4 pt-24 md:pt-32 md:pb-6">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
          className="text-center space-y-8"
        >
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight font-[family-name:var(--font-space)]"
            >
              <span className="text-white drop-shadow-lg">See the future.</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
              className="flex justify-center"
            >
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-2xl border border-white/30 max-w-2xl">
                <p className="text-lg md:text-xl text-white/90 leading-relaxed text-center">
                  In hindsight, we all would&apos;ve bought Bitcoin.
                  <br className="hidden sm:block" />
                  Seer into the future, so you can retire off the next one.
                </p>
              </div>
            </motion.div>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1, ease: [0.215, 0.61, 0.355, 1] }}
            onSubmit={handleSubmit}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <div className="relative flex gap-2 transition-all duration-300">
              <motion.div
                className="relative"
                initial={{ width: "100%" }}
                animate={{ width: url ? "75%" : "100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Input
                  type="url"
                  placeholder="Paste Polymarket or Kalshi URL... Or click one of the trending markets below 👇"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className={`h-12 md:h-14 text-base px-4 md:px-6 bg-white/95 backdrop-blur-sm border-white/20 focus:bg-white focus:border-white/40 placeholder:text-neutral-500 w-full ${
                    error ? "border-red-500 animate-shake" : ""
                  }`}
                  disabled={submitting}
                  aria-invalid={Boolean(error)}
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 left-0 text-sm text-red-300 drop-shadow-md"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>

              <AnimatePresence>
                {url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: "15%" }}
                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitting}
                      aria-label="Start research"
                      className="h-12 md:h-14 w-full bg-black text-white hover:bg-black/90 transition-all font-medium"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        </span>
                      ) : detectedPlatform ? (
                        <span className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              detectedPlatform === "polymarket"
                                ? "https://www.google.com/s2/favicons?domain=polymarket.com&sz=32"
                                : "https://kalshi.com/logo192.png"
                            }
                            alt={detectedPlatform}
                            className="w-5 h-5 md:w-6 md:h-6 rounded-sm"
                          />
                          <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                        </span>
                      ) : (
                        <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
              className="relative z-20 pt-4"
            >
              <EffortSelector value={effort} onChange={changeEffort} disabled={submitting} />
              {emailNote && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/70 drop-shadow-md">
                  <Mail className="size-3.5" aria-hidden="true" />
                  We&apos;ll email {emailNote} when the research is ready.
                </p>
              )}
            </motion.div>

            {/* Powered by Valyu pill - below input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.3, ease: "easeOut" }}
              className="flex justify-center gap-2 mt-4"
            >
              <div className="relative flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                <span className="text-sm text-white/80 font-medium">Powered by</span>
                <a
                  href="https://valyu.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center hover:scale-105 transition-transform pt-0.5"
                >
                  <Image
                    src="/valyu.svg"
                    alt="Valyu"
                    width={80}
                    height={80}
                    className="h-4 w-auto opacity-80 hover:opacity-100 transition-opacity"
                  />
                </a>
              </div>
              <button
                type="button"
                onClick={onShowHowItWorks}
                className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30 text-sm text-white/80 font-medium hover:bg-white/30 transition-colors"
              >
                How it works
              </button>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>

      <ZoomTransition isActive={destination !== null} onComplete={() => destination && router.push(destination)} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </section>
  );
}
