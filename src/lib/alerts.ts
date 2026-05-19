// Alerting engine — threshold rules + lightweight anomaly detection.

import type { AnalyzedFeedback, Category } from "./ai/types";
import { categoryStats, trendSeries } from "./analysis";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  category?: Category;
  affectedSegment: string;
  suggestedAction: string;
  metric: number;
  trend: number[]; // sparkline points
}

export function buildAlerts(analyzed: AnalyzedFeedback[]): Alert[] {
  const alerts: Alert[] = [];
  const total = analyzed.length || 1;
  const cats = categoryStats(analyzed);
  const trend = trendSeries(analyzed);

  // Rule 1: category share > 5%
  for (const c of cats) {
    if (c.share > 0.05) {
      const sev: AlertSeverity =
        c.share > 0.15 ? "critical" : c.share > 0.1 ? "warning" : "info";
      alerts.push({
        id: `cat-${c.category}`,
        severity: sev,
        title: `${c.category} exceeds 5% of responses`,
        description: `${Math.round(c.share * 100)}% of feedback (${c.count} responses) cite ${c.category}. Trend ${c.trendDelta >= 0 ? "+" : ""}${Math.round(c.trendDelta * 100)}% vs prior period.`,
        category: c.category,
        affectedSegment: c.topQuotes[0]?.member_location
          ? `Concentrated in ${c.topQuotes[0].member_location}`
          : "Multi-region",
        suggestedAction: c.recommendedAction,
        metric: c.share,
        trend: trend.slice(-8).map((t) => t.responses),
      });
    }
  }

  // Rule 2: negative sentiment spike (recent half > prior half by >25%)
  if (trend.length >= 4) {
    const half = Math.floor(trend.length / 2);
    const recent = trend.slice(half).reduce((s, t) => s + t.negative, 0);
    const prior = trend.slice(0, half).reduce((s, t) => s + t.negative, 0);
    if (prior > 0 && (recent - prior) / prior > 0.25) {
      alerts.push({
        id: "sent-spike",
        severity: "warning",
        title: "Negative sentiment is spiking",
        description: `Negative responses up ${Math.round(((recent - prior) / prior) * 100)}% in the recent period. ${recent} negatives vs ${prior} prior.`,
        affectedSegment: "All segments",
        suggestedAction: "Open an incident review and notify operations leadership.",
        metric: (recent - prior) / prior,
        trend: trend.map((t) => t.negative),
      });
    }
  }

  // Rule 3: high-severity surge
  const hs = analyzed.filter((a) => a.severity === "high" || a.severity === "critical").length;
  if (hs / total > 0.08) {
    alerts.push({
      id: "sev-surge",
      severity: "critical",
      title: "High-severity responses above safe threshold",
      description: `${hs} high-severity responses (${Math.round((hs / total) * 100)}% of total). Trust and retention risk.`,
      affectedSegment: "Detractors + flagged members",
      suggestedAction: "Launch 24h outreach playbook to all flagged members.",
      metric: hs / total,
      trend: trend.map((t) => t.highSeverity),
    });
  }

  // Rule 4: anomaly — sudden bucket spike in any category
  if (trend.length >= 5) {
    const last = trend[trend.length - 1];
    const avg = trend.slice(0, -1).reduce((s, t) => s + t.responses, 0) / (trend.length - 1);
    if (last.responses > avg * 1.6 && last.responses > 8) {
      alerts.push({
        id: "anomaly-volume",
        severity: "warning",
        title: "Volume anomaly detected",
        description: `Latest bucket received ${last.responses} responses vs avg ${avg.toFixed(1)} — investigate upstream event.`,
        affectedSegment: "Recent member cohort",
        suggestedAction: "Cross-reference with recent ops events (releases, schedule changes).",
        metric: last.responses / avg,
        trend: trend.map((t) => t.responses),
      });
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const;
    return order[a.severity] - order[b.severity];
  });
}
