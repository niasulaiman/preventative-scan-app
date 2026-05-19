// Top drivers of negative feedback over time.
// Considers only detractors (NPS 0–6) OR negatively-flagged sentiment.

import type { AnalyzedFeedback, Category } from "./ai/types";
import type { TimeRange } from "./timeFilter";

export interface NegativeDriverPoint {
  date: string;
  // Each top category's share of negatives in this bucket, expressed 0–100.
  [category: string]: number | string;
}

export interface NegativeDriversSeries {
  data: NegativeDriverPoint[];
  topCategories: Category[];
}

function bucketDaysFor(range: TimeRange): number {
  switch (range) {
    case "today": return 1;
    case "7d": return 1;
    case "30d": return 3;
    case "all": return 7;
  }
}

function bucketKey(date: string, start: Date, days: number): string {
  const d = new Date(date);
  const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const idx = Math.floor(diff / days);
  const bd = new Date(start);
  bd.setDate(bd.getDate() + idx * days);
  return bd.toISOString().slice(0, 10);
}

export function negativeDriversSeries(
  data: AnalyzedFeedback[],
  range: TimeRange,
): NegativeDriversSeries {
  const negatives = data.filter(
    (d) => d.nps_score <= 6 || d.sentiment === "Negative",
  );
  if (!negatives.length) return { data: [], topCategories: [] };

  // Top 5 categories across the whole filtered window.
  const totals = new Map<Category, number>();
  for (const n of negatives) totals.set(n.category, (totals.get(n.category) ?? 0) + 1);
  const topCategories = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  const sorted = [...negatives].sort((a, b) =>
    a.response_date.localeCompare(b.response_date),
  );
  const start = new Date(sorted[0].response_date);
  const days = bucketDaysFor(range);

  // bucket -> total negatives + per-top-category count
  const buckets = new Map<string, { total: number; byCat: Map<Category, number> }>();
  for (const n of negatives) {
    const key = bucketKey(n.response_date, start, days);
    if (!buckets.has(key)) buckets.set(key, { total: 0, byCat: new Map() });
    const b = buckets.get(key)!;
    b.total += 1;
    if (topCategories.includes(n.category)) {
      b.byCat.set(n.category, (b.byCat.get(n.category) ?? 0) + 1);
    }
  }

  const result: NegativeDriverPoint[] = Array.from(buckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, b]) => {
      const point: NegativeDriverPoint = { date };
      for (const c of topCategories) {
        const count = b.byCat.get(c) ?? 0;
        point[c] = b.total > 0 ? Math.round((count / b.total) * 1000) / 10 : 0;
      }
      return point;
    });

  return { data: result, topCategories };
}
