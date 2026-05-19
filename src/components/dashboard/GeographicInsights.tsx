import { MapPin } from "lucide-react";
import { Badge } from "./StatusBadge";
import type { RegionStat } from "@/lib/analysis";

export function GeographicInsights({ regions }: { regions: RegionStat[] }) {
  const top = regions.slice(0, 10);
  const max = Math.max(...top.map((r) => r.responses), 1);
  return (
    <div className="panel-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Geographic insights</h3>
          <p className="text-sm text-muted-foreground">Operational hotspots by location</p>
        </div>
        <Badge variant="outline">{regions.length} regions</Badge>
      </div>
      <div className="space-y-2">
        {top.map((r) => {
          const hot = r.negativePct > 0.35 || r.avgNps < 6;
          return (
            <div key={r.location} className="panel p-3 flex items-center gap-3">
              <MapPin className={hot ? "size-4 text-destructive" : "size-4 text-muted-foreground"} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{r.location}</span>
                  <Badge variant="outline">{r.topCategory}</Badge>
                  {hot && <Badge variant="destructive">Hotspot</Badge>}
                </div>
                <div className="mt-1.5 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-info to-destructive"
                    style={{ width: `${(r.responses / max) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="font-semibold tabular-nums text-base">{r.avgNps.toFixed(1)}<span className="text-muted-foreground text-xs font-normal"> NPS</span></div>
                <div className="text-muted-foreground tabular-nums">{r.responses} resp · {Math.round(r.negativePct * 100)}% neg</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
