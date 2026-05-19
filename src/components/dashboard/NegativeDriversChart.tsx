import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import type { NegativeDriversSeries } from "@/lib/negativeDrivers";

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
} as const;

// Muted, executive-friendly palette.
const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function NegativeDriversChart({ series }: { series: NegativeDriversSeries }) {
  return (
    <div className="panel-elevated p-5">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Top drivers of negative feedback</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share of detractor &amp; negative responses citing each category
          </p>
        </div>
      </div>

      {series.data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
          No negative feedback in this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series.data} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: number) => [`${v}%`, ""]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              iconSize={8}
            />
            {series.topCategories.map((cat, i) => (
              <Line
                key={cat}
                type="monotone"
                dataKey={cat}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={1.75}
                dot={false}
                strokeOpacity={0.85}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
