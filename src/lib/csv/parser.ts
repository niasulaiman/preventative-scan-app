import Papa from "papaparse";
import type { RawFeedback } from "../ai/types";

export interface ParseResult {
  rows: RawFeedback[];
  invalid: number;
  total: number;
  errors: string[];
}

function coerceRow(raw: Record<string, string>, idx: number): RawFeedback | null {
  const id = raw.response_id?.trim();
  const nps = Number(raw.nps_score);
  const text = raw.feedback_text?.trim();
  const date = raw.response_date?.trim();
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
