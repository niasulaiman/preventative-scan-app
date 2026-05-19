// Mock OpenAI service layer. The shape mirrors a real OpenAI-backed implementation.
// To swap in the real API:
//   1. Set OPENAI_API_KEY in your env (see README).
//   2. Replace `analyzeBatch` and `generateExecutiveBrief` bodies with real
//      `openai.chat.completions.create` calls using prompts from `./prompts.ts`.
//   3. Keep the return types stable — every consumer reads these.

import { analyzeFeedback } from "./categorizer";
import { categoryStats, regionStats, trendSeries } from "../analysis";
import type { AnalyzedFeedback, RawFeedback, Category, Sentiment } from "./types";

export interface ExecutiveBrief {
  headline: string;
  ai_summary: string;
  key_findings: string[];
  recommended_actions: string[];
  generated_at: string;
}

export interface AnalysisAggregate {
  total: number;
  avgNps: number;
  negativePct: number;
  topCategory: Category;
  highSeverityCount: number;
  byCategory: Record<Category, number>;
  bySentiment: Record<Sentiment, number>;
}

export async function analyzeBatch(rows: RawFeedback[]): Promise<AnalyzedFeedback[]> {
  return rows.map(analyzeFeedback);
}

export async function generateExecutiveBrief(
  analyzed: AnalyzedFeedback[],
  aggregate: AnalysisAggregate,
): Promise<ExecutiveBrief> {
  const cats = categoryStats(analyzed);
  const regions = regionStats(analyzed);
  const trend = trendSeries(analyzed);

  const topCat = cats[0];
  const secondCat = cats[1];
  const negPct = Math.round(aggregate.negativePct * 100);

  // Recent vs prior NPS
  let npsShift = "stable";
  if (trend.length >= 4) {
    const half = Math.floor(trend.length / 2);
    const recent = trend.slice(half).reduce((s, t) => s + t.nps, 0) / Math.max(1, trend.length - half);
    const prior = trend.slice(0, half).reduce((s, t) => s + t.nps, 0) / Math.max(1, half);
    const diff = recent - prior;
    if (Math.abs(diff) >= 0.3) npsShift = `${diff > 0 ? "+" : ""}${diff.toFixed(1)} pts vs prior period`;
  }

  const worstRegion = [...regions]
    .filter((r) => r.responses >= 5)
    .sort((a, b) => b.negativePct - a.negativePct)[0];

  const findings: string[] = [];
  findings.push(
    `NPS at ${aggregate.avgNps.toFixed(1)} (${npsShift}). ${negPct}% of ${aggregate.total.toLocaleString()} responses were negative.`,
  );
  if (topCat) {
    const trendStr = topCat.trendDelta > 0.05
      ? `up ${Math.round(topCat.trendDelta * 100)}% vs prior period`
      : topCat.trendDelta < -0.05
        ? `down ${Math.round(Math.abs(topCat.trendDelta) * 100)}%`
        : "flat";
    findings.push(
      `${topCat.category} is the top issue: ${topCat.count} responses (${Math.round(topCat.share * 100)}% of feedback), ${trendStr}.`,
    );
  }
  if (worstRegion) {
    findings.push(
      `${worstRegion.location} has the highest negative rate at ${Math.round(worstRegion.negativePct * 100)}% across ${worstRegion.responses} responses.`,
    );
  }
  if (secondCat && secondCat.trendDelta > 0.15) {
    findings.push(
      `${secondCat.category} complaints rising fast: +${Math.round(secondCat.trendDelta * 100)}% vs prior period (${secondCat.count} responses).`,
    );
  }

  const actions: string[] = [];
  if (topCat) {
    actions.push(`${topCat.category}: ${topCat.recommendedAction}`);
  }
  if (worstRegion) {
    actions.push(`Send a regional ops lead to review ${worstRegion.location} this week.`);
  }
  if (aggregate.highSeverityCount > 0) {
    actions.push(
      `Reach out to the ${aggregate.highSeverityCount} members flagged high-priority within 48 hours.`,
    );
  }

  // Trending keywords across the dataset, weighted toward negative feedback.
  const kwCounts = new Map<string, number>();
  for (const a of analyzed) {
    const weight = a.sentiment === "Negative" ? 2 : 1;
    for (const k of a.keywords) kwCounts.set(k, (kwCounts.get(k) ?? 0) + weight);
  }
  const trendingKeywords = Array.from(kwCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);

  // Pull short illustrative quotes tied to those keywords.
  const quoteFor = (kw: string): string | null => {
    const match = analyzed.find(
      (a) => a.sentiment === "Negative" && a.feedback_text?.toLowerCase().includes(kw),
    );
    if (!match) return null;
    const t = match.feedback_text.trim();
    return t.length > 110 ? t.slice(0, 107).trimEnd() + "…" : t;
  };

  const parts: string[] = [];
  parts.push(
    `Across ${aggregate.total.toLocaleString()} responses today, sentiment skews ${
      negPct >= 35 ? "notably negative" : negPct >= 20 ? "mixed" : "broadly positive"
    } with NPS at ${aggregate.avgNps.toFixed(1)}.`,
  );
  if (trendingKeywords.length) {
    parts.push(
      `Trending themes: ${trendingKeywords.join(", ")} — most often surfacing in feedback about ${topCat?.category ?? "operations"}${
        secondCat ? ` and ${secondCat.category}` : ""
      }.`,
    );
  }
  const sampleKw = trendingKeywords.find((k) => quoteFor(k));
  if (sampleKw) {
    parts.push(`Members are saying things like: "${quoteFor(sampleKw)}"`);
  }
  if (topCat && topCat.trendDelta > 0.1) {
    parts.push(
      `Volume around ${topCat.category} is up ${Math.round(topCat.trendDelta * 100)}% vs the prior period, suggesting this is an emerging — not background — concern.`,
    );
  }

  return {
    headline:
      topCat
        ? `${topCat.category} is driving ${Math.round(topCat.share * 100)}% of feedback. NPS ${aggregate.avgNps.toFixed(1)}.`
        : `NPS ${aggregate.avgNps.toFixed(1)} across ${aggregate.total.toLocaleString()} responses.`,
    ai_summary: parts.join(" "),
    key_findings: findings,
    recommended_actions: actions,
    generated_at: new Date().toISOString(),
  };
}
