import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { TopIssues } from "@/components/dashboard/TopIssues";
import { TrendCharts } from "@/components/dashboard/TrendCharts";
import { FeedbackExplorer } from "@/components/dashboard/FeedbackExplorer";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel";
import { CSVUploader } from "@/components/dashboard/CSVUploader";
import { TimeFilter } from "@/components/dashboard/TimeFilter";
import { analyzeBatch, type AnalysisAggregate } from "@/lib/ai/mockOpenAI";
import { aggregate, categoryStats, trendSeries } from "@/lib/analysis";
import { buildAlerts } from "@/lib/alerts";
import { generateSampleFeedback } from "@/lib/sampleData";
import { compareLabelFor, filterByRange, type TimeRange } from "@/lib/timeFilter";
import type { AnalyzedFeedback, RawFeedback } from "@/lib/ai/types";

export const Route = createFileRoute("/")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "PreventativeScan — Operations" },
      { name: "description", content: "Member feedback and operations monitoring for preventive MRI screening." },
    ],
  }),
});

function DashboardPage() {
  const [raw, setRaw] = useState<RawFeedback[] | null>(null);
  const [analyzed, setAnalyzed] = useState<AnalyzedFeedback[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [range, setRange] = useState<TimeRange>("7d");

  useEffect(() => {
    setRaw(generateSampleFeedback(520));
  }, []);

  useEffect(() => {
    if (!raw) return;
    let cancelled = false;
    analyzeBatch(raw).then((res) => {
      if (!cancelled) setAnalyzed(res);
    });
    return () => { cancelled = true; };
  }, [raw]);

  // Single source of truth: filter the analyzed dataset by the selected range,
  // then derive every downstream analytic from `current` (with `previous` used
  // only for comparison indicators).
  const { current, previous, agg, prevAgg, cats, trend, alerts } = useMemo(() => {
    const { current, previous } = filterByRange(analyzed, range);
    const agg: AnalysisAggregate = aggregate(current);
    const prevAgg: AnalysisAggregate | undefined = previous.length ? aggregate(previous) : undefined;
    return {
      current,
      previous,
      agg,
      prevAgg,
      cats: categoryStats(current),
      trend: trendSeries(current, range === "today" ? 1 : range === "7d" ? 1 : 3),
      alerts: buildAlerts(current),
    };
  }, [analyzed, range]);

  const compareLabel = compareLabelFor(range);

  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader totalResponses={current.length} alertCount={alerts.length} />

      <main className="px-6 py-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header row with time filter */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground min-h-[1rem]">{today}</div>
            <h1 className="text-xl font-semibold tracking-tight mt-1">Operations overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <TimeFilter value={range} onChange={setRange} />
            <button
              onClick={() => setShowUpload((s) => !s)}
              className="text-xs text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-md border border-border hover:bg-muted"
            >
              {showUpload ? "Hide upload" : "Import CSV"}
            </button>
          </div>
        </div>

        {showUpload && <CSVUploader onParsed={(rows) => { setRaw(rows); setShowUpload(false); }} />}

        {/* Smooth transitions as the filter changes — fade the analytics block */}
        <div
          key={range}
          className="space-y-6 animate-in fade-in duration-300"
        >
          {/* AI summary — regenerates per filtered slice */}
          <AIInsightsPanel analyzed={current} aggregate={agg} />

          {/* KPI overview */}
          <ExecutiveSummary current={agg} previous={prevAgg} compareLabel={compareLabel} />

          {/* Top issues */}
          <TopIssues stats={cats} />

          {/* Trends */}
          <TrendCharts trend={trend} />

          {/* Feedback explorer — operates on the same filtered dataset */}
          <FeedbackExplorer data={current} />

          {/* Alerts */}
          <AlertsPanel alerts={alerts} />
        </div>

        <footer className="text-xs text-muted-foreground pt-2 pb-8">
          Showing {current.length.toLocaleString()} responses · {compareLabel}. CSV imports replace the current dataset.
        </footer>
      </main>
    </div>
  );
}
