"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Ban, Link2, LoaderCircle, TriangleAlert } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { Button } from "@/components/ui/button";
import { cancelResearch, fetchResearch, isSelfHostedApp, ResearchApiError } from "@/lib/research/client";
import { ACTIVE_STATUSES, type ResearchTask } from "@/lib/research/task";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { getPlatformName } from "@/lib/tools/market-url-parser";
import { ForecastDetails } from "./forecast-details";
import { ForecastVerdict } from "./forecast-verdict";
import { ResearchActivity } from "./research-activity";
import { ResearchBackdrop } from "./research-backdrop";
import { ResearchDeliverables } from "./research-deliverables";
import { ResearchProgress, type ResearchConnection } from "./research-progress";
import { ResearchSources } from "./research-sources";

const MIN_DELAY = 4_000;
const MAX_DELAY = 20_000;
const HIDDEN_DELAY = 30_000;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen px-4 pb-24 pt-24 sm:px-6 md:pt-28">
      <ResearchBackdrop />
      <div className="relative z-10 mx-auto w-full max-w-4xl">{children}</div>
    </div>
  );
}

function Notice({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-black/55 p-6 text-white shadow-xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="mt-1 text-sm text-white/70">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ResearchView({ id }: { id: string }) {
  const [task, setTask] = useState<ResearchTask | null>(null);
  const [error, setError] = useState<ResearchApiError | Error | null>(null);
  const [connection, setConnection] = useState<ResearchConnection>("live");
  const [authOpen, setAuthOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState(false);
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const pollsRef = useRef(0);
  const failuresRef = useRef(0);
  const hasTaskRef = useRef(false);

  const active = task ? ACTIVE_STATUSES.has(task.status) : true;
  const needsSignIn = !isSelfHostedApp && initialized && !user && error instanceof ResearchApiError && error.isAuth;

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    const controller = new AbortController();

    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(poll, document.hidden ? Math.max(delay, HIDDEN_DELAY) : delay);
    };

    const poll = async () => {
      if (cancelled) return;
      try {
        const next = await fetchResearch(id, controller.signal);
        if (cancelled) return;
        pollsRef.current += 1;
        failuresRef.current = 0;
        hasTaskRef.current = true;
        setTask(next);
        setError(null);
        setConnection("live");
        if (ACTIVE_STATUSES.has(next.status)) {
          schedule(Math.min(MAX_DELAY, MIN_DELAY + Math.floor(pollsRef.current / 4) * 4_000));
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        const apiError = err instanceof ResearchApiError ? err : null;
        if (apiError && (apiError.isAuth || apiError.status === 404 || apiError.status === 400)) {
          setError(apiError);
          return;
        }
        failuresRef.current += 1;
        setConnection("reconnecting");
        if (!hasTaskRef.current && failuresRef.current >= 3) {
          setError(err instanceof Error ? err : new Error("Could not load this research."));
        }
        schedule(Math.min(30_000, 6_000 * failuresRef.current));
      }
    };

    const resume = () => {
      if (!document.hidden) {
        window.clearTimeout(timer);
        void poll();
      }
    };

    void poll();
    document.addEventListener("visibilitychange", resume);
    return () => {
      cancelled = true;
      controller.abort(new DOMException("Research view closed", "AbortError"));
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    };
    // Re-run when the user signs in so the first poll can succeed with a token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable; the URL bar still has the link.
    }
  }, []);

  const cancel = useCallback(async () => {
    if (!task) return;
    setCancelling(true);
    try {
      setTask(await cancelResearch(task.id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Could not cancel this research."));
    } finally {
      setCancelling(false);
    }
  }, [task]);

  if (needsSignIn) {
    return (
      <Shell>
        <Notice icon={<TriangleAlert className="size-5 text-amber-300" />} title="Sign in to view this forecast">
          <p>This research belongs to a Valyu account. Sign in to see its progress and result.</p>
          <Button onClick={() => setAuthOpen(true)} className="mt-4 bg-white text-black hover:bg-white/90">
            Sign in with Valyu
          </Button>
        </Notice>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </Shell>
    );
  }

  if (error && !task) {
    const notFound = error instanceof ResearchApiError && error.status === 404;
    return (
      <Shell>
        <Notice
          icon={<TriangleAlert className="size-5 text-rose-300" />}
          title={notFound ? "Research not found" : "Could not load this research"}
        >
          <p>{notFound ? "This link does not match any of your forecasts." : error.message}</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-sky-200">
            <ArrowLeft className="size-4" aria-hidden="true" /> Start a new forecast
          </Link>
        </Notice>
      </Shell>
    );
  }

  if (!task) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-3 py-24 text-white/70">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          Loading research
        </div>
      </Shell>
    );
  }

  const question = task.forecast?.question || task.market.question || task.title || "Market forecast";
  const platformName = task.market.platform ? getPlatformName(task.market.platform) : undefined;

  return (
    <Shell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> New forecast
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyLink}
            className="h-8 gap-1.5 border border-white/20 bg-black/40 text-white backdrop-blur-md hover:bg-black/60 hover:text-white"
          >
            <Link2 className="size-4" aria-hidden="true" />
            {copied ? "Copied" : "Copy link"}
          </Button>
          {active && task.status !== "queued" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={cancel}
              disabled={cancelling}
              className="h-8 gap-1.5 border border-white/20 bg-black/40 text-white backdrop-blur-md hover:bg-rose-500/40 hover:text-white"
            >
              <Ban className="size-4" aria-hidden="true" />
              {cancelling ? "Cancelling" : "Cancel"}
            </Button>
          )}
        </div>
      </div>

      {!task.forecast && (
        <div className="mb-4 text-white">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">
            {platformName ? `${platformName} market` : "Market"}
          </p>
          <h1 className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">{question}</h1>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0">
        <AnimatePresence mode="popLayout">
          {active && (
            <motion.div key="progress" layout exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <ResearchProgress task={task} connection={connection} />
            </motion.div>
          )}
        </AnimatePresence>

        {task.status === "failed" && (
          <Notice icon={<TriangleAlert className="size-5 text-rose-300" />} title="This research failed">
            <p>{task.error || "Something went wrong during research. You were not charged for an incomplete task."}</p>
          </Notice>
        )}
        {task.status === "cancelled" && (
          <Notice icon={<Ban className="size-5 text-white/70" />} title="Research cancelled">
            <p>This forecast was stopped before it finished.</p>
          </Notice>
        )}
        {task.status === "completed" && !task.forecast && (
          <Notice icon={<TriangleAlert className="size-5 text-amber-300" />} title="Forecast unavailable">
            <p>The research finished but did not return a readable forecast. Downloads and sources are below.</p>
          </Notice>
        )}

        {task.forecast && (
          <ForecastVerdict forecast={task.forecast} marketUrl={task.market.marketUrl} platform={task.market.platform} />
        )}

        <ResearchDeliverables taskId={task.id} deliverables={task.deliverables} question={question} />

        {task.forecast && <ForecastDetails forecast={task.forecast} />}

        <ResearchActivity steps={task.activity} live={active && task.status !== "queued"} defaultOpen={active} />

        <ResearchSources sources={task.sources} />
      </div>
    </Shell>
  );
}
