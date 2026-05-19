import { TIME_RANGE_OPTIONS, type TimeRange } from "@/lib/timeFilter";
import { cn } from "@/lib/utils";

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export function TimeFilter({ value, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Time range"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-secondary/60"
    >
      {TIME_RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
