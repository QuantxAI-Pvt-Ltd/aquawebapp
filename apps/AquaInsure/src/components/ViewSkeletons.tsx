import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 p-4 space-y-4 font-sans">
      {/* Header Banner Skeleton */}
      <div className="h-44 rounded-3xl bg-teal-900/10 p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32 bg-stone-300/40" />
          <Skeleton className="h-7 w-20 rounded-lg bg-stone-300/40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 bg-stone-300/40" />
          <Skeleton className="h-7 w-48 bg-stone-300/40" />
        </div>
      </div>

      {/* Stats Summary Pills */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl bg-stone-200/80" />
        <Skeleton className="h-20 rounded-2xl bg-stone-200/80" />
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Skeleton className="h-32 rounded-2xl bg-stone-200/80" />
        <Skeleton className="h-32 rounded-2xl bg-stone-200/80" />
        <Skeleton className="h-32 rounded-2xl bg-stone-200/80" />
        <Skeleton className="h-32 rounded-2xl bg-stone-200/80" />
      </div>
    </div>
  );
}

export function PondGridSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 p-4 space-y-4 font-sans">
      {/* Header */}
      <div className="h-24 rounded-3xl bg-teal-900/10 p-5 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 bg-stone-300/40" />
          <Skeleton className="h-6 w-40 bg-stone-300/40" />
        </div>
        <Skeleton className="h-8 w-8 rounded-xl bg-stone-300/40" />
      </div>

      {/* Pond selector chips */}
      <div className="flex gap-2 overflow-hidden py-1">
        <Skeleton className="h-16 w-36 rounded-2xl shrink-0 bg-stone-200/80" />
        <Skeleton className="h-16 w-36 rounded-2xl shrink-0 bg-stone-200/80" />
        <Skeleton className="h-16 w-36 rounded-2xl shrink-0 bg-stone-200/80" />
      </div>

      {/* Day Grid skeleton */}
      <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm space-y-3">
        <Skeleton className="h-4 w-32 bg-stone-200/80" />
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: 40 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg bg-stone-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 p-4 space-y-4 font-sans">
      {/* Header Banner */}
      <div className="h-28 rounded-3xl bg-teal-900/10 p-5 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-8 rounded-xl bg-stone-300/40" />
          <Skeleton className="h-6 w-36 bg-stone-300/40" />
          <Skeleton className="h-6 w-16 rounded-lg bg-stone-300/40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-2 flex-1 rounded-full bg-stone-300/40" />
          <Skeleton className="h-2 flex-1 rounded-full bg-stone-300/40" />
          <Skeleton className="h-2 flex-1 rounded-full bg-stone-300/40" />
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm space-y-4">
        <Skeleton className="h-4 w-28 bg-stone-200/80" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl bg-stone-100" />
          <Skeleton className="h-12 w-full rounded-xl bg-stone-100" />
          <Skeleton className="h-12 w-full rounded-xl bg-stone-100" />
          <Skeleton className="h-12 w-full rounded-xl bg-stone-100" />
        </div>
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-12 flex-1 rounded-xl bg-stone-200/80" />
          <Skeleton className="h-12 flex-1 rounded-xl bg-teal-700/30" />
        </div>
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 p-4 space-y-4 font-sans">
      {/* Header */}
      <div className="h-24 rounded-3xl bg-teal-900/10 p-5 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 bg-stone-300/40" />
          <Skeleton className="h-6 w-36 bg-stone-300/40" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg bg-stone-300/40" />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-xl bg-stone-200/80" />
        <Skeleton className="h-9 w-24 rounded-xl bg-stone-200/80" />
        <Skeleton className="h-9 w-24 rounded-xl bg-stone-200/80" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl bg-white border border-stone-100 shadow-sm" />
        <Skeleton className="h-24 rounded-2xl bg-white border border-stone-100 shadow-sm" />
      </div>

      {/* Big Chart Skeleton */}
      <Skeleton className="h-64 rounded-2xl bg-white border border-stone-100 shadow-sm" />
    </div>
  );
}

export function PolicyCardSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-stone-50 p-4 space-y-4 font-sans">
      {/* Header */}
      <div className="h-24 rounded-3xl bg-teal-900/10 p-5 flex justify-between items-center">
        <Skeleton className="h-6 w-36 bg-stone-300/40" />
        <Skeleton className="h-7 w-20 rounded-lg bg-stone-300/40" />
      </div>

      {/* Policy Card Skeletons */}
      <div className="space-y-3">
        <Skeleton className="h-36 rounded-2xl bg-white border border-stone-100 shadow-sm" />
        <Skeleton className="h-36 rounded-2xl bg-white border border-stone-100 shadow-sm" />
        <Skeleton className="h-36 rounded-2xl bg-white border border-stone-100 shadow-sm" />
      </div>
    </div>
  );
}
