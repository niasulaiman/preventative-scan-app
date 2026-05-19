import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES, type AnalyzedFeedback, type Sentiment } from "@/lib/ai/types";
import { Badge } from "./StatusBadge";
import { npsBucket } from "@/lib/analysis";

interface Props {
  data: AnalyzedFeedback[];
}

type NpsFilter = "all" | "Detractor" | "Passive" | "Promoter";

export function FeedbackExplorer({ data }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sev, setSev] = useState<string>("all");
  const [sent, setSent] = useState<Sentiment | "all">("all");
  const [nps, setNps] = useState<NpsFilter>("all");

  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (q && !d.feedback_text.toLowerCase().includes(q.toLowerCase()) && !d.member_location.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat !== "all" && d.category !== cat) return false;
      if (sev !== "all" && d.severity !== sev) return false;
      if (sent !== "all" && d.sentiment !== sent) return false;
      if (nps !== "all" && npsBucket(d.nps_score) !== nps) return false;
      return true;
    });
  }, [data, q, cat, sev, sent, nps]);

  return (
    <div className="panel-elevated p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Member feedback explorer</h3>
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums">{filtered.length.toLocaleString()}</span> of {data.length.toLocaleString()} responses
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <div className="col-span-2 md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search text or location…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-input border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <Select value={cat} onChange={setCat} label="Category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={sev} onChange={setSev} label="Severity">
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </Select>
        <Select value={sent} onChange={(v) => setSent(v as Sentiment | "all")} label="Sentiment">
          <option value="all">All sentiment</option>
          <option value="Positive">Positive</option>
          <option value="Neutral">Neutral</option>
          <option value="Negative">Negative</option>
        </Select>
        <Select value={nps} onChange={(v) => setNps(v as NpsFilter)} label="NPS">
          <option value="all">All NPS</option>
          <option value="Promoter">Promoters (9-10)</option>
          <option value="Passive">Passives (7-8)</option>
          <option value="Detractor">Detractors (0-6)</option>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 sticky top-0 backdrop-blur z-10">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">NPS</th>
                <th className="px-3 py-2 font-medium">Sentiment</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium min-w-[300px]">Feedback</th>
                <th className="px-3 py-2 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((r) => (
                <tr key={r.response_id} className="border-t border-border/60 hover:bg-accent/30">
                  <td className="px-3 py-2 text-muted-foreground tabular-nums whitespace-nowrap">{r.response_date}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">{r.nps_score}</td>
                  <td className="px-3 py-2">
                    <Badge variant={r.sentiment === "Positive" ? "success" : r.sentiment === "Negative" ? "destructive" : "outline"}>
                      {r.sentiment}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.category}</td>
                  <td className="px-3 py-2">
                    <Badge variant={r.severity === "critical" ? "destructive" : r.severity === "high" ? "warning" : "outline"}>
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-foreground/90 max-w-[400px]">
                    <div className="line-clamp-2">{r.feedback_text}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{r.member_location}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No matching responses</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border bg-secondary/30">
            Showing first 200 results — refine filters to narrow.
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-sm rounded-md bg-input border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
    >
      {children}
    </select>
  );
}
