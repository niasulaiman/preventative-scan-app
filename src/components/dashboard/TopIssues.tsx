import { ArrowDownRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CategoryStat } from "@/lib/analysis";

function priorityLabel(s: CategoryStat): { label: "High" | "Medium" | "Low"; cls: string } {
  if (s.avgSeverity >= 55 || s.share >= 0.18) return { label: "High", cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (s.avgSeverity >= 30 || s.share >= 0.10) return { label: "Medium", cls: "bg-warning/15 text-warning-foreground border-warning/30" };
  return { label: "Low", cls: "bg-muted text-muted-foreground border-border" };
}

export function TopIssues({ stats }: { stats: CategoryStat[] }) {
  const top = stats.slice(0, 5);
  return (
    <div className="panel-elevated p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Top operational issues</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ranked by volume and recent trend</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{stats.length} categories</span>
      </div>
      <div className="divide-y divide-border -mx-1">
        {top.map((s, i) => <IssueRow key={s.category} stat={s} rank={i + 1} />)}
      </div>
    </div>
  );
}

function IssueRow({ stat, rank }: { stat: CategoryStat; rank: number }) {
  const [open, setOpen] = useState(false);
  const trendUp = stat.trendDelta > 0.05;
  const trendDown = stat.trendDelta < -0.05;
  const priority = priorityLabel(stat);

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="w-full px-1 py-3 flex items-center gap-4 text-left hover:bg-muted/40 rounded transition">
        <span className="text-xs text-muted-foreground tabular-nums w-4">{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground truncate">{stat.category}</span>
            <span className={cn("text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border", priority.cls)}>
              {priority.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="text-right tabular-nums">
            <div className="font-medium text-foreground">{stat.count}</div>
            <div className="text-muted-foreground">{(stat.share * 100).toFixed(0)}%</div>
          </div>
          <div className={cn(
            "flex items-center gap-0.5 tabular-nums w-12 justify-end",
            trendUp ? "text-destructive" : trendDown ? "text-success" : "text-muted-foreground",
          )}>
            {trendUp ? <ArrowUpRight className="size-3" /> : trendDown ? <ArrowDownRight className="size-3" /> : null}
            {Math.abs(stat.trendDelta * 100).toFixed(0)}%
          </div>
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition", open && "rotate-180")} />
        </div>
      </button>
      {open && (
        <div className="px-6 pb-4 space-y-3">
          {stat.topQuotes.length > 0 && (
            <div className="space-y-2">
              {stat.topQuotes.slice(0, 2).map((q) => (
                <blockquote key={q.response_id} className="text-sm border-l-2 border-border pl-3 text-muted-foreground">
                  "{q.feedback_text}"
                  <div className="text-xs mt-1 text-muted-foreground/70">NPS {q.nps_score} · {q.member_location}</div>
                </blockquote>
              ))}
            </div>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">Recommended: </span>
            <span className="text-foreground">{stat.recommendedAction}</span>
          </div>
        </div>
      )}
    </div>
  );
}
