import { Activity } from "lucide-react";

interface Props {
  totalResponses: number;
  alertCount: number;
}

export function DashboardHeader({ totalResponses, alertCount }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="px-6 py-3 flex items-center justify-between gap-4 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-primary flex items-center justify-center">
            <Activity className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-[15px] tracking-tight">PreventativeScan</span>
            <span className="text-xs text-muted-foreground">Operations</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="tabular-nums">{totalResponses.toLocaleString()} responses</span>
          <span className="hidden sm:inline">·</span>
          <span className={alertCount > 0 ? "text-destructive font-medium" : ""}>
            {alertCount} {alertCount === 1 ? "alert" : "alerts"}
          </span>
        </div>
      </div>
    </header>
  );
}
