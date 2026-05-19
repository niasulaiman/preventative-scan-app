import { MetricCard } from "./MetricCard";
import type { AnalysisAggregate } from "@/lib/ai/mockOpenAI";

interface Props {
  current: AnalysisAggregate;
  previous?: AnalysisAggregate;
  compareLabel?: string;
}

export function ExecutiveSummary({ current, previous, compareLabel = "vs prior period" }: Props) {
  const npsDelta = previous && previous.total ? current.avgNps - previous.avgNps : undefined;
  const negDelta = previous && previous.total ? (current.negativePct - previous.negativePct) * 100 : undefined;
  const highSevPct = current.total ? (current.highSeverityCount / current.total) * 100 : 0;
  const prevHighSevPct = previous && previous.total ? (previous.highSeverityCount / previous.total) * 100 : undefined;
  const highSevDelta = prevHighSevPct != null ? highSevPct - prevHighSevPct : undefined;
  const respDelta = previous && previous.total ? current.total - previous.total : undefined;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Responses"
        value={current.total.toLocaleString()}
        delta={respDelta}
        hint={compareLabel}
      />
      <MetricCard
        label="Average NPS"
        value={current.avgNps.toFixed(1)}
        delta={npsDelta}
        hint={compareLabel}
      />
      <MetricCard
        label="Negative sentiment"
        value={`${Math.round(current.negativePct * 100)}%`}
        delta={negDelta}
        deltaSuffix="pp"
        invertDelta
        hint={compareLabel}
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
