import { useState } from "react";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import type { Alert } from "@/lib/alerts";
import { cn } from "@/lib/utils";

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const criticals = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="panel">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-muted/40 transition rounded-[inherit]"
      >
        <div className="flex items-center gap-3">
          {alerts.length === 0 ? (
            <span className="size-1.5 rounded-full bg-success" />
          ) : (
            <span className={cn("size-1.5 rounded-full", criticals > 0 ? "bg-destructive" : "bg-warning")} />
          )}
          <span className="text-sm font-medium text-foreground">
            {alerts.length === 0 ? "All systems healthy" : `${alerts.length} active ${alerts.length === 1 ? "alert" : "alerts"}`}
          </span>
          {criticals > 0 && (
            <span className="text-xs text-destructive font-medium">{criticals} critical</span>
          )}
        </div>
        {alerts.length > 0 && (
          <ChevronDown className={cn("size-4 text-muted-foreground transition", open && "rotate-180")} />
        )}
      </button>
      {open && alerts.length > 0 && (
        <div className="px-5 pb-4 pt-1 space-y-2 border-t border-border">
          {alerts.map((a) => <AlertRow key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}

function AlertRow({ a }: { a: Alert }) {
  const Icon = a.severity === "info" ? Info : AlertTriangle;
  const color =
    a.severity === "critical" ? "text-destructive" :
    a.severity === "warning" ? "text-warning" : "text-info";
  return (
    <div className="py-3 flex gap-3">
      <Icon className={cn("size-4 shrink-0 mt-0.5", color)} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{a.title}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
        <div className="text-xs text-muted-foreground mt-1">
          <span className="text-foreground">Action: </span>{a.suggestedAction}
        </div>
      </div>
    </div>
  );
}
