// Alerting engine — behavior adapts to the selected dashboard time filter.

import type { AnalyzedFeedback, Category } from "./ai/types";
import { categoryStats, trendSeries } from "./analysis";
import type { TimeRange } from "./timeFilter";

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

const ACTION_BY_CATEGORY: Partial<Record<Category, string>> = {
  Scheduling: "Add scheduling capacity in affected regions and audit reschedule policy.",
  Communication: "Roll out templated multi-channel updates across the member journey.",
  "Facility Experience": "Trigger facility audit and increase on-site host coverage at peak hours.",
  "Wait Times": "Reduce overbooking ratios and add live wait-time visibility for members.",
  Billing: "Run a billing reconciliation sweep and add proactive insurance status notifications.",
  "MRI Experience": "Refresh tech training on claustrophobia protocol and pre-scan walkthrough.",
  "Results Delivery": "Add SLA monitoring on results turnaround and proactive follow-up calls.",
  "Staff Experience": "Targeted coaching and shift-level NPS reviews at impacted sites.",
  "Technical Issues": "Spin up an incident bridge and ship portal stability fixes this sprint.",
};

function actionFor(c: Category): string {
  return ACTION_BY_CATEGORY[c] ?? "Tag for manual review and route to operations triage.";
}

/**
 * Build operational alerts that adapt to the selected time filter.
 *
 * - today  : spike detection vs recent historical average, min mention count
 * - 7d     : flat % threshold + week-over-week trend change
 * - 30d    : flat 5% threshold
 * - all    : no active operational alerts (historical view)
 *
 * `history` is the broader analyzed dataset used to compute baselines for
 * spike detection on the daily view.
 */
export function buildAlerts(
  current: AnalyzedFeedback[],
  range: TimeRange = "7d",
  history: AnalyzedFeedback[] = current,
): Alert[] {
  // All-time view is historical — no active operational alerts.
  if (range === "all") return [];

  const alerts: Alert[] = [];
  const total = current.length || 1;
  const cats = categoryStats(current);
  const trend = trendSeries(current);

  if (range === "today") {
    // Spike detection: compare today's category counts to the avg daily
    // count over the prior 14 days. Require a minimum mention count to
    // avoid alerting on noise.
    const MIN_MENTIONS = 3;
    const SPIKE_FACTOR = 2.0;
    const today = current[0]?.response_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const baselineDays = 14;

    const baselineEnd = today;
    const baselineStartDate = new Date(baselineEnd);
    if (isNaN(baselineStartDate.getTime())) return alerts;
    baselineStartDate.setDate(baselineStartDate.getDate() - baselineDays);
    const baselineStartISO = baselineStartDate.toISOString().slice(0, 10);

    const baseline = history.filter(
      (h) => h.response_date >= baselineStartISO && h.response_date < baselineEnd,
    );

    const byCatBaseline = new Map<Category, number>();
    for (const b of baseline) {
      byCatBaseline.set(b.category, (byCatBaseline.get(b.category) ?? 0) + 1);
    }

    for (const c of cats) {
      if (c.count < MIN_MENTIONS) continue;
      const baseAvg = (byCatBaseline.get(c.category) ?? 0) / baselineDays;
      if (baseAvg === 0) {
        if (c.count >= MIN_MENTIONS * 2) {
          alerts.push({
            id: `spike-${c.category}`,
            severity: "warning",
            title: `New issue cluster: ${c.category}`,
            description: `${c.count} mentions today with no comparable activity in the prior ${baselineDays} days.`,
            category: c.category,
            affectedSegment: c.topQuotes[0]?.member_location
              ? `Concentrated in ${c.topQuotes[0].member_location}`
              : "Multi-region",
            suggestedAction: actionFor(c.category),
            metric: c.count,
            trend: trend.slice(-8).map((t) => t.responses),
          });
        }
        continue;
      }
      const ratio = c.count / baseAvg;
      if (ratio >= SPIKE_FACTOR) {
        const sev: AlertSeverity = ratio >= 3 ? "critical" : "warning";
        alerts.push({
          id: `spike-${c.category}`,
          severity: sev,
          title: `${c.category} spike vs recent average`,
          description: `${c.count} mentions today vs a ${baselineDays}-day daily average of ${baseAvg.toFixed(1)} (${ratio.toFixed(1)}× normal).`,
          category: c.category,
          affectedSegment: c.topQuotes[0]?.member_location
            ? `Concentrated in ${c.topQuotes[0].member_location}`
            : "Multi-region",
          suggestedAction: actionFor(c.category),
          metric: ratio,
          trend: trend.slice(-8).map((t) => t.responses),
        });
      }
    }
  } else if (range === "7d") {
    // % threshold + week-over-week trend.
    for (const c of cats) {
      const share = c.share;
      const wow = c.trendDelta; // recent half vs prior half within window
      const breaches = share > 0.05;
      const trending = wow > 0.2;
      if (breaches || (share > 0.03 && trending)) {
        const sev: AlertSeverity =
          share > 0.15 || (share > 0.08 && trending) ? "critical" :
          share > 0.1 || trending ? "warning" : "info";
        alerts.push({
          id: `wow-${c.category}`,
          severity: sev,
          title: `${c.category} at ${Math.round(share * 100)}% of weekly responses`,
          description: `${c.count} responses this week. Week-over-week ${wow >= 0 ? "+" : ""}${Math.round(wow * 100)}%.`,
          category: c.category,
          affectedSegment: c.topQuotes[0]?.member_location
            ? `Concentrated in ${c.topQuotes[0].member_location}`
            : "Multi-region",
          suggestedAction: actionFor(c.category),
          metric: share,
          trend: trend.slice(-8).map((t) => t.responses),
        });
      }
    }
  } else if (range === "30d") {
    // Flat 5% threshold.
    for (const c of cats) {
      if (c.share > 0.05) {
        const sev: AlertSeverity =
          c.share > 0.15 ? "critical" : c.share > 0.1 ? "warning" : "info";
        alerts.push({
          id: `cat-${c.category}`,
          severity: sev,
          title: `${c.category} exceeds 5% of monthly responses`,
          description: `${Math.round(c.share * 100)}% of feedback (${c.count} responses) cite ${c.category}.`,
          category: c.category,
          affectedSegment: c.topQuotes[0]?.member_location
            ? `Concentrated in ${c.topQuotes[0].member_location}`
            : "Multi-region",
          suggestedAction: actionFor(c.category),
          metric: c.share,
          trend: trend.slice(-8).map((t) => t.responses),
        });
      }
    }
  }

  // High-severity surge is meaningful on weekly and monthly views.
  if (range === "7d" || range === "30d") {
    const hs = current.filter((a) => a.severity === "high" || a.severity === "critical").length;
    if (hs / total > 0.08) {
      alerts.push({
        id: "sev-surge",
        severity: "critical",
        title: "High-severity responses above safe threshold",
        description: `${hs} high-severity responses (${Math.round((hs / total) * 100)}% of total).`,
        affectedSegment: "Detractors + flagged members",
        suggestedAction: "Launch 24h outreach playbook to all flagged members.",
        metric: hs / total,
        trend: trend.map((t) => t.highSeverity),
      });
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 } as const;
    return order[a.severity] - order[b.severity];
  });
}
