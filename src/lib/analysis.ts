// Aggregate analytics over a set of analyzed feedback rows.

import { CATEGORIES, type AnalyzedFeedback, type Category, type Sentiment } from "./ai/types";
import type { AnalysisAggregate } from "./ai/mockOpenAI";

export interface TrendPoint {
  date: string;
  nps: number;
  responses: number;
  negative: number;
  positive: number;
  neutral: number;
  highSeverity: number;
}

export interface CategoryStat {
  category: Category;
  count: number;
  share: number;
  avgSeverity: number;
  trendDelta: number; // pct change vs prior period
  topQuotes: AnalyzedFeedback[];
  recommendedAction: string;
}

export interface RegionStat {
  location: string;
  responses: number;
  avgNps: number;
  negativePct: number;
  highSeverity: number;
  topCategory: Category;
}

const ACTION_BY_CATEGORY: Record<Category, string> = {
  Scheduling: "Add scheduling capacity in affected regions and audit reschedule policy.",
  Communication: "Roll out templated multi-channel updates across the member journey.",
  "Facility Experience": "Trigger facility audit and increase on-site host coverage at peak hours.",
  "Wait Times": "Reduce overbooking ratios and add live wait-time visibility for members.",
  Billing: "Run a billing reconciliation sweep and add proactive insurance status notifications.",
  "MRI Experience": "Refresh tech training on claustrophobia protocol and pre-scan walkthrough.",
  "Results Delivery": "Add SLA monitoring on results turnaround and proactive follow-up calls.",
  "Staff Experience": "Targeted coaching and shift-level NPS reviews at impacted sites.",
  "Technical Issues": "Spin up an incident bridge and ship portal stability fixes this sprint.",
  Other: "Tag for manual review and route to operations triage.",
};

export function aggregate(analyzed: AnalyzedFeedback[]): AnalysisAggregate {
  const total = analyzed.length || 1;
  const avgNps = analyzed.reduce((s, a) => s + a.nps_score, 0) / total;
  const bySentiment: Record<Sentiment, number> = { Positive: 0, Neutral: 0, Negative: 0 };
  const byCategory: Record<Category, number> = Object.fromEntries(
    CATEGORIES.map((c) => [c, 0]),
  ) as Record<Category, number>;
  let highSeverity = 0;
  for (const a of analyzed) {
    bySentiment[a.sentiment] += 1;
    byCategory[a.category] += 1;
    if (a.severity === "high" || a.severity === "critical") highSeverity += 1;
  }
  const topCategory = (Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other") as Category;
  return {
    total: analyzed.length,
    avgNps,
    negativePct: bySentiment.Negative / total,
    topCategory,
    highSeverityCount: highSeverity,
    byCategory,
    bySentiment,
  };
}

export function categoryStats(analyzed: AnalyzedFeedback[]): CategoryStat[] {
  const total = analyzed.length || 1;
  const groups = new Map<Category, AnalyzedFeedback[]>();
  for (const a of analyzed) {
    if (!groups.has(a.category)) groups.set(a.category, []);
    groups.get(a.category)!.push(a);
  }
  // Trend delta: compare recent half vs prior half by date.
  const sorted = [...analyzed].sort((a, b) => a.response_date.localeCompare(b.response_date));
  const mid = sorted[Math.floor(sorted.length / 2)]?.response_date ?? "";

  return Array.from(groups.entries())
    .map(([category, items]): CategoryStat => {
      const recent = items.filter((i) => i.response_date >= mid).length;
      const prior = items.length - recent;
      const trendDelta = prior === 0 ? (recent > 0 ? 1 : 0) : (recent - prior) / prior;
      const avgSeverity = items.reduce((s, i) => s + i.severityScore, 0) / (items.length || 1);
      const topQuotes = items
        .filter((i) => i.sentiment === "Negative")
        .sort((a, b) => b.severityScore - a.severityScore)
        .slice(0, 3);
      return {
        category,
        count: items.length,
        share: items.length / total,
        avgSeverity,
        trendDelta,
        topQuotes,
        recommendedAction: ACTION_BY_CATEGORY[category],
      };
    })
    .sort((a, b) => b.count * b.avgSeverity - a.count * a.avgSeverity);
}

export function trendSeries(analyzed: AnalyzedFeedback[], bucketDays = 3): TrendPoint[] {
  if (!analyzed.length) return [];
  const sorted = [...analyzed].sort((a, b) => a.response_date.localeCompare(b.response_date));
  const buckets = new Map<string, AnalyzedFeedback[]>();
  const start = new Date(sorted[0].response_date);
  for (const a of sorted) {
    const d = new Date(a.response_date);
    const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const bucketIdx = Math.floor(diff / bucketDays);
    const bd = new Date(start);
    bd.setDate(bd.getDate() + bucketIdx * bucketDays);
    const key = bd.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(a);
  }
  return Array.from(buckets.entries())
    .map(([date, items]) => ({
      date,
      nps: items.reduce((s, i) => s + i.nps_score, 0) / items.length,
      responses: items.length,
      negative: items.filter((i) => i.sentiment === "Negative").length,
      positive: items.filter((i) => i.sentiment === "Positive").length,
      neutral: items.filter((i) => i.sentiment === "Neutral").length,
      highSeverity: items.filter((i) => i.severity === "high" || i.severity === "critical").length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function regionStats(analyzed: AnalyzedFeedback[]): RegionStat[] {
  const groups = new Map<string, AnalyzedFeedback[]>();
  for (const a of analyzed) {
    if (!groups.has(a.member_location)) groups.set(a.member_location, []);
    groups.get(a.member_location)!.push(a);
  }
  return Array.from(groups.entries())
    .map(([location, items]): RegionStat => {
      const byCat = new Map<Category, number>();
      for (const i of items) byCat.set(i.category, (byCat.get(i.category) ?? 0) + 1);
      const topCategory = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";
      return {
        location,
        responses: items.length,
        avgNps: items.reduce((s, i) => s + i.nps_score, 0) / items.length,
        negativePct: items.filter((i) => i.sentiment === "Negative").length / items.length,
        highSeverity: items.filter((i) => i.severity === "high" || i.severity === "critical").length,
        topCategory,
      };
    })
    .sort((a, b) => b.responses - a.responses);
}

// Composite operational risk score 0-100
export function operationalRiskScore(a: AnalysisAggregate): number {
  const npsPenalty = Math.max(0, (80 - a.avgNps * 10)); // 0..80 ish
  const negPenalty = a.negativePct * 100;
  const sevPenalty = Math.min(40, (a.highSeverityCount / Math.max(1, a.total)) * 400);
  return Math.min(100, Math.round(npsPenalty * 0.4 + negPenalty * 0.4 + sevPenalty * 0.4));
}

export function npsBucket(score: number): "Detractor" | "Passive" | "Promoter" {
  if (score <= 6) return "Detractor";
  if (score <= 8) return "Passive";
  return "Promoter";
}
