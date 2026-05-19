import { MetricCard } from "./MetricCard";
import type { AnalysisAggregate } from "@/lib/ai/mockOpenAI";

interface Props {
  current: AnalysisAggregate;
  previous?: AnalysisAggregate;
}

export function ExecutiveSummary({ current, previous }: Props) {
  const npsDelta = previous ? current.avgNps - previous.avgNps : undefined;
  const negDelta = previous ? (current.negativePct - previous.negativePct) * 100 : undefined;
  const highSevPct = current.total ? (current.highSeverityCount / current.total) * 100 : 0;
  const prevHighSevPct = previous && previous.total ? (previous.highSeverityCount / previous.total) * 100 : undefined;
  const highSevDelta = prevHighSevPct != null ? highSevPct - prevHighSevPct : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Responses"
        value={current.total.toLocaleString()}
        hint="In window"
      />
      <MetricCard
        label="Average NPS"
        value={current.avgNps.toFixed(1)}
        delta={npsDelta}
        hint="vs prior period"
      />
      <MetricCard
        label="Negative sentiment"
        value={`${Math.round(current.negativePct * 100)}%`}
        delta={negDelta}
        deltaSuffix="pp"
        invertDelta
        hint="vs prior period"
      />
      <MetricCard
        label="High-priority issues"
        value={`${highSevPct.toFixed(1)}%`}
        delta={highSevDelta}
        deltaSuffix="pp"
        invertDelta
        hint={`${current.highSeverityCount} responses`}
      />
    </div>
  );
}
