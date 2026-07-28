/* eslint-disable */
// @ts-nocheck
import React from 'react';

// Base skeleton pulse animation
const pulse = "animate-pulse bg-slate-800/60 rounded";

/** Generic skeleton block */
function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`${pulse} ${className}`} />;
}

/** App-level loading skeleton (replaces full-screen spinner) */
export function AppSkeleton() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col">
      {/* Header skeleton */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="h-2.5 w-32" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-8 w-32 rounded-full" />
            <SkeletonBlock className="h-8 w-8 rounded-xl" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-5">
        {/* Sidebar skeleton */}
        <aside className="w-full md:w-52 shrink-0 space-y-2">
          <SkeletonBlock className="h-3 w-16 mb-3" />
          {[1,2,3,4,5,6].map(i => (
            <SkeletonBlock key={i} className="h-10 w-full rounded-xl" />
          ))}
        </aside>

        {/* Main content skeleton */}
        <main className="flex-1 min-w-0 space-y-4">
          <SkeletonBlock className="h-8 w-48 rounded-lg" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <SkeletonBlock key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Page-level skeleton for lazy-loaded views */
export function PageSkeleton() {
  return (
    <div className="space-y-4 p-1">
      {/* Title area */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-7 w-48 rounded-lg" />
        <SkeletonBlock className="h-9 w-28 rounded-xl" />
      </div>

      {/* Filter bar */}
      <SkeletonBlock className="h-12 w-full rounded-xl" />

      {/* Content cards */}
      <div className="space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-3/5" />
              <SkeletonBlock className="h-6 w-20 rounded-lg" />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table skeleton for admin reports, user list */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-7 w-40 rounded-lg" />
        <SkeletonBlock className="h-9 w-32 rounded-xl" />
      </div>

      {/* Table header */}
      <div className="flex gap-4 p-3 border-b border-slate-800/60">
        {[1,2,3,4,5].map(i => (
          <SkeletonBlock key={i} className="h-3.5 flex-1" />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 p-3 border-b border-slate-800/30">
          {[1,2,3,4,5].map(j => (
            <SkeletonBlock key={j} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Calendar/matrix skeleton */
export function CalendarSkeleton() {
  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-7 w-48 rounded-lg" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-9 rounded-xl" />
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
          <SkeletonBlock className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <SkeletonBlock key={`h${i}`} className="h-8 rounded-lg" />
        ))}
        {Array.from({ length: 35 }, (_, i) => (
          <SkeletonBlock key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default { AppSkeleton, PageSkeleton, TableSkeleton, CalendarSkeleton };
