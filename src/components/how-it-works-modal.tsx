"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Scale, CheckCircle2 } from "lucide-react";

interface HowItWorksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HowItWorksModal({ open, onOpenChange }: HowItWorksModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">How Polyseer works</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">1. Paste a market, pick a depth</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Polyseer reads the live market: question, prices, close date, and resolution rules.
                  The effort slider sets how long the research runs, from about five minutes to two hours.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Scale className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">2. A research agent weighs both sides</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Valyu DeepResearch searches news, primary sources, data releases, and related markets.
                  It finds a base rate, gathers evidence for and against, and maps the catalysts before resolution.
                  You can watch every step live.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">3. Get a probability, a side, and the receipts</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  A calibrated probability against the market price, which side has edge, the evidence ranked
                  by weight, a full PDF report, and a CSV of every factor. Research runs in the background and
                  emails you when it is done.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Important:</span> Not financial advice. For research only.
              Markets are risky and forecasts can be wrong. Always do your own research.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
