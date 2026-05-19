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
import { analyzeBatch, type AnalysisAggregate } from "@/lib/ai/mockOpenAI";
import { aggregate, categoryStats, trendSeries } from "@/lib/analysis";
import { buildAlerts } from "@/lib/alerts";
import { generateSampleFeedback } from "@/lib/sampleData";
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

  const { agg, prevAgg, alerts, cats, trend, latestDayAnalyzed, latestDayAgg } = useMemo(() => {
    const sorted = [...analyzed].sort((a, b) => a.response_date.localeCompare(b.response_date));
    const mid = Math.floor(sorted.length / 2);
    const recent = sorted.slice(mid);
    const prior = sorted.slice(0, mid);
    const agg: AnalysisAggregate = aggregate(recent.length ? recent : analyzed);
    const prevAgg: AnalysisAggregate | undefined = prior.length ? aggregate(prior) : undefined;
    const latestDate = sorted[sorted.length - 1]?.response_date ?? "";
    const latestDayAnalyzed = sorted.filter((a) => a.response_date === latestDate);
    return {
      agg,
      prevAgg,
      alerts: buildAlerts(analyzed),
      cats: categoryStats(analyzed),
      trend: trendSeries(analyzed, 3),
      latestDayAnalyzed,
      latestDayAgg: aggregate(latestDayAnalyzed),
    };
  }, [analyzed]);

  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader totalResponses={analyzed.length} alertCount={alerts.length} />

      <main className="px-6 py-8 max-w-[1400px] mx-auto space-y-6">
        {/* Compact operational summary header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-muted-foreground min-h-[1rem]">{today}</div>
            <h1 className="text-xl font-semibold tracking-tight mt-1">Operations overview</h1>
          </div>
          <button
            onClick={() => setShowUpload((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-md border border-border hover:bg-muted"
          >
            {showUpload ? "Hide upload" : "Import CSV"}
          </button>
        </div>

        {showUpload && <CSVUploader onParsed={(rows) => { setRaw(rows); setShowUpload(false); }} />}

        {/* Daily summary — top of page */}
        <AIInsightsPanel analyzed={latestDayAnalyzed} aggregate={latestDayAgg} />

        {/* KPI overview */}
        <ExecutiveSummary current={agg} previous={prevAgg} />

        {/* Top issues */}
        <TopIssues stats={cats} />

        {/* Trends */}
        <TrendCharts trend={trend} />

        {/* Feedback explorer */}
        <FeedbackExplorer data={analyzed} />

        {/* Alerts — collapsed */}
        <AlertsPanel alerts={alerts} />

        <footer className="text-xs text-muted-foreground pt-2 pb-8">
          Data refreshed automatically. CSV imports replace the current dataset.
        </footer>
      </main>
    </div>
  );
}
