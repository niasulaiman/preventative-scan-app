import { useCallback, useState } from "react";
import { Upload, FileCheck2, AlertTriangle, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseCSV, type ParseResult } from "@/lib/csv/parser";
import { downloadSampleCSV } from "@/lib/sampleData";
import type { RawFeedback } from "@/lib/ai/types";

interface Props {
  onParsed: (rows: RawFeedback[], meta: ParseResult) => void;
}

export function CSVUploader({ onParsed }: Props) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const res = await parseCSV(file);
      setResult(res);
      onParsed(res.rows, res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse CSV");
    } finally {
      setBusy(false);
    }
  }, [onParsed]);

  return (
    <div className="panel-elevated p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Ingest feedback</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Drop a CSV with columns: <code className="text-foreground">response_id, nps_score, feedback_text, response_date, member_location</code>
          </p>
        </div>
        <button
          onClick={downloadSampleCSV}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <Download className="size-3.5" /> Sample CSV
        </button>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "block border border-dashed rounded-lg p-8 text-center cursor-pointer transition",
          "hover:border-primary/50 hover:bg-accent/40",
          drag && "border-primary bg-primary/5 glow-primary",
        )}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="flex flex-col items-center gap-2">
          {busy ? (
            <Loader2 className="size-8 text-primary animate-spin" />
          ) : (
            <Upload className="size-8 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">
            {busy ? "Analyzing…" : "Drag & drop CSV or click to browse"}
          </div>
          <div className="text-xs text-muted-foreground">Max 20MB · Invalid rows are skipped automatically</div>
        </div>
      </label>

      {result && (
        <div className="mt-4 panel p-4 flex items-start gap-3">
          <FileCheck2 className="size-5 text-success mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-medium">Ingestion complete</div>
            <div className="text-muted-foreground mt-1">
              Parsed <span className="text-foreground font-medium tabular-nums">{result.rows.length.toLocaleString()}</span> valid responses
              {result.invalid > 0 && (
                <> · <span className="text-warning">{result.invalid} invalid rows skipped</span></>
              )}
              {" "}of {result.total.toLocaleString()} total.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 panel p-4 flex items-start gap-3 border-destructive/40">
          <AlertTriangle className="size-5 text-destructive mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-destructive">Ingestion failed</div>
            <div className="text-muted-foreground mt-1">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
