// Centralized time-range filtering for the dashboard.
// All panels derive from a single filtered dataset; we also compute a
// previous-period slice of equal length for comparison indicators.

import type { AnalyzedFeedback, RawFeedback } from "./ai/types";

export type TimeRange = "today" | "7d" | "30d" | "all";

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; compareLabel: string; summaryTitle: string }[] = [
  { value: "today", label: "Today", compareLabel: "vs yesterday", summaryTitle: "Daily summary" },
  { value: "7d", label: "Last 7 days", compareLabel: "vs previous week", summaryTitle: "Weekly summary" },
  { value: "30d", label: "Last 30 days", compareLabel: "vs previous month", summaryTitle: "Monthly summary" },
  { value: "all", label: "All time", compareLabel: "vs prior period", summaryTitle: "Summary of all dates" },
];

export function compareLabelFor(range: TimeRange): string {
  return TIME_RANGE_OPTIONS.find((o) => o.value === range)?.compareLabel ?? "vs prior period";
}

export function summaryTitleFor(range: TimeRange): string {
  return TIME_RANGE_OPTIONS.find((o) => o.value === range)?.summaryTitle ?? "Summary";
}

// Window length in days for a given range. `all` is handled separately.
function windowDays(range: TimeRange): number | null {
  switch (range) {
    case "today": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "all": return null;
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Returns the current and previous-period [startISO, endISO) windows for a
 * given range. End is exclusive. For `all` we split the dataset in half by
 * date to provide a comparison baseline.
 */
export function rangeWindows<T extends { response_date: string }>(
  data: T[],
  range: TimeRange,
  now: Date = new Date(),
): { current: [string, string]; previous: [string, string] | null } {
  const today = startOfDay(now);
  const days = windowDays(range);

  if (days != null) {
    const curEnd = new Date(today);
    curEnd.setDate(curEnd.getDate() + 1); // include today fully
    const curStart = new Date(curEnd);
    curStart.setDate(curStart.getDate() - days);
    const prevEnd = new Date(curStart);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days);
    return {
      current: [iso(curStart), iso(curEnd)],
      previous: [iso(prevStart), iso(prevEnd)],
    };
  }

  // All time → split dataset in half by date for comparison
  if (!data.length) {
    return { current: ["", "9999-12-31"], previous: null };
  }
  const sorted = [...data].map((d) => d.response_date).sort();
  const mid = sorted[Math.floor(sorted.length / 2)];
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  // Use [first, end-of-last+1) as current; previous is the same idea but the
  // dashboard's existing "split halves" behavior is handled in filterByRange.
  return {
    current: [first, bumpDay(last)],
    previous: [first, mid],
  };
}

function iso(d: Date): string { return d.toISOString().slice(0, 10); }
function bumpDay(s: string): string {
  const d = new Date(s);
  d.setDate(d.getDate() + 1);
  return iso(d);
}

export function filterByRange<T extends { response_date: string }>(
  data: T[],
  range: TimeRange,
  now: Date = new Date(),
): { current: T[]; previous: T[] } {
  if (range === "all") {
    // Current = all data; previous = first half (chronological) for comparison
    const sorted = [...data].sort((a, b) => a.response_date.localeCompare(b.response_date));
    const mid = Math.floor(sorted.length / 2);
    return {
      current: data,
      previous: sorted.slice(0, mid),
    };
  }
  const { current, previous } = rangeWindows(data, range, now);
  const inRange = (d: T, w: [string, string]) =>
    d.response_date >= w[0] && d.response_date < w[1];
  return {
    current: data.filter((d) => inRange(d, current)),
    previous: previous ? data.filter((d) => inRange(d, previous)) : [],
  };
}

// Re-export for convenience
export type { RawFeedback, AnalyzedFeedback };
