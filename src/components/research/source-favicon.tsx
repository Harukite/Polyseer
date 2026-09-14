"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceFavicon({ url, size = 16, className }: { url: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const host = sourceHost(url);
  if (failed || !host) {
    return <Globe className={cn("shrink-0 text-white/50", className)} style={{ width: size, height: size }} aria-hidden="true" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-sm", className)}
      style={{ width: size, height: size }}
    />
  );
}
