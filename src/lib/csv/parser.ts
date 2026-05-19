import Papa from "papaparse";
import type { RawFeedback } from "../ai/types";

export interface ParseResult {
  rows: RawFeedback[];
  invalid: number;
  total: number;
  errors: string[];
}

// Normalize a variety of date string formats to ISO `YYYY-MM-DD` so that
// downstream lexicographic comparisons work correctly.
function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // Already ISO (optionally with time component)
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = +iso[1], m = +iso[2], d = +iso[3];
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // M/D/Y or M-D-Y (US) — also catches D/M/Y if first part > 12 by swapping
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slash) {
    let a = +slash[1], b = +slash[2];
    let y = +slash[3];
    if (y < 100) y += 2000;
    // Default to US M/D/Y. If first > 12 (and second <= 12), treat as D/M/Y.
    let mm = a, dd = b;
    if (a > 12 && b <= 12) { mm = b; dd = a; }
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  // Fallback: let Date parse it
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

function coerceRow(raw: Record<string, string>, idx: number): RawFeedback | null {
  const id = raw.response_id?.trim();
  const nps = Number(raw.nps_score);
  const text = raw.feedback_text?.trim();
  const date = normalizeDate(raw.response_date ?? "");
  const loc = raw.member_location?.trim();
  if (!id || Number.isNaN(nps) || nps < 0 || nps > 10 || !text || !date || !loc) return null;
  return {
    response_id: id || `row-${idx}`,
    nps_score: nps,
    feedback_text: text,
    response_date: date,
    member_location: loc,
  };
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const rows: RawFeedback[] = [];
        let invalid = 0;
        results.data.forEach((r, i) => {
          const row = coerceRow(r, i);
          if (row) rows.push(row);
          else invalid += 1;
        });
        resolve({
          rows,
          invalid,
          total: results.data.length,
          errors: results.errors.map((e) => e.message),
        });
      },
      error: (err) => reject(err),
    });
  });
}
