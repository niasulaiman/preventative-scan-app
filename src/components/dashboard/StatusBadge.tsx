import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "outline";
  className?: string;
}

export function Badge({ children, variant = "default", className }: Props) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
      variant === "default" && "bg-secondary text-secondary-foreground",
      variant === "success" && "bg-success/15 text-success border border-success/20",
      variant === "warning" && "bg-warning/15 text-warning border border-warning/20",
      variant === "destructive" && "bg-destructive/15 text-destructive border border-destructive/25",
      variant === "info" && "bg-info/15 text-info border border-info/20",
      variant === "outline" && "border border-border text-muted-foreground",
      className,
    )}>
      {children}
    </span>
  );
}
