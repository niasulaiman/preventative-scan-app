import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaSuffix?: string;
  hint?: string;
  invertDelta?: boolean;
}

export function MetricCard({ label, value, delta, deltaSuffix = "", hint, invertDelta }: Props) {
  const dirGood = delta == null ? null : invertDelta ? delta < 0 : delta > 0;
  const dirColor =
    dirGood == null ? "text-muted-foreground" : dirGood ? "text-success" : "text-destructive";
  const ToneIcon = delta == null ? null : (invertDelta ? delta < 0 : delta > 0) ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="panel p-4 flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
      <div className="flex items-center gap-2 text-xs">
        {delta != null && ToneIcon && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", dirColor)}>
            <ToneIcon className="size-3" />
            {Math.abs(delta).toFixed(1)}{deltaSuffix}
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
