import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from "recharts";
import type { TrendPoint } from "@/lib/analysis";

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
} as const;

export function TrendCharts({ trend }: { trend: TrendPoint[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartPanel title="NPS trend" subtitle="Average score over time">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trend} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="npsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 10]} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="nps" stroke="var(--color-primary)" strokeWidth={2} fill="url(#npsFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Negative responses" subtitle="Detractor volume per period">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trend} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="negative" stroke="var(--color-destructive)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="panel-elevated p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
