import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { ExecutiveBrief, AnalysisAggregate } from "@/lib/ai/mockOpenAI";
import { generateExecutiveBrief } from "@/lib/ai/mockOpenAI";
import type { AnalyzedFeedback } from "@/lib/ai/types";

interface Props {
  analyzed: AnalyzedFeedback[];
  aggregate: AnalysisAggregate;
}

export function AIInsightsPanel({ analyzed, aggregate }: Props) {
  const [brief, setBrief] = useState<ExecutiveBrief | null>(null);
  const [loading, setLoading] = useState(false);

  const regen = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 250));
    const b = await generateExecutiveBrief(analyzed, aggregate);
    setBrief(b);
    setLoading(false);
  };

  useEffect(() => { regen(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [aggregate.total]);

  return (
    <div className="panel-elevated p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Daily summary</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {brief ? `Updated ${new Date(brief.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "—"}
          </p>
        </div>
        <button
          onClick={regen}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </button>
      </div>

      {!brief ? (
        <div className="h-24 flex items-center text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin mr-2" /> Generating…
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">AI summary</h3>
            <p className="text-sm text-foreground leading-relaxed">{brief.ai_summary}</p>
          </div>
          <Section title="Key findings" items={brief.key_findings} />
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-foreground flex gap-2">
            <span className="text-muted-foreground tabular-nums shrink-0">{i + 1}.</span>
            <span className="leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
