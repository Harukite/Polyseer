"use client";

/**
 * Dark looping video behind the research and history pages, with a soft
 * overlay so the glass cards stay readable.
 */
export function ResearchBackdrop() {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover">
        <source src="/analysis.webm" type="video/webm" />
      </video>
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
