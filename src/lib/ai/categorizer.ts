// Rule-based categorizer used by the mock AI layer. Real implementation
// would call OpenAI with the prompts in `prompts.ts` — see `mockOpenAI.ts`
// for the swap point.

import type { Category, RawFeedback, Sentiment, Severity, AnalyzedFeedback } from "./types";

const CATEGORY_LEXICON: Record<Category, string[]> = {
  Scheduling: ["schedul", "appointment", "book", "reschedul", "cancel", "calendar", "availab"],
  Communication: ["communic", "email", "text", "call back", "respond", "reply", "unclear", "confus"],
  "Facility Experience": ["facility", "clinic", "building", "parking", "clean", "lobby", "bathroom", "noisy"],
  "Wait Times": ["wait", "late", "delay", "long line", "queue", "hours", "took forever"],
  Billing: ["bill", "charge", "insur", "price", "cost", "invoice", "payment", "refund"],
  "MRI Experience": ["mri", "scan", "machine", "claustro", "contrast", "tube", "loud", "uncomfortable in"],
  "Results Delivery": ["result", "report", "diagnos", "follow up", "follow-up", "findings", "explanation"],
  "Staff Experience": ["staff", "nurse", "tech", "doctor", "technician", "radiolog", "front desk", "rude", "kind", "friendly"],
  "Technical Issues": ["portal", "app", "website", "login", "bug", "error", "broken", "glitch"],
  Other: [],
};

const NEG_WORDS = [
  "terrible", "awful", "horrible", "worst", "rude", "angry", "frustrat",
  "disappoint", "never again", "unacceptab", "scam", "dangerous", "unsafe",
  "incompet", "lied", "lawsuit", "complaint",
];
const POS_WORDS = [
  "great", "amazing", "excellent", "love", "fantastic", "wonderful", "smooth",
  "professional", "caring", "kind", "easy", "fast", "recommend", "best",
];
const CRITICAL_FLAGS = [
  "unsafe", "dangerous", "lawsuit", "lawyer", "harm", "injur", "wrong diagnos",
  "misdiagnos", "discriminat", "negligen", "emergency", "hipaa", "privacy breach",
];

function scoreLexicon(text: string, terms: string[]): number {
  let s = 0;
  for (const t of terms) if (text.includes(t)) s += 1;
  return s;
}

function detectCategories(text: string): { primary: Category; secondary: Category[] } {
  const scores = (Object.keys(CATEGORY_LEXICON) as Category[])
    .filter((c) => c !== "Other")
    .map((c) => ({ c, s: scoreLexicon(text, CATEGORY_LEXICON[c]) }))
    .sort((a, b) => b.s - a.s);

  const top = scores[0];
  const primary: Category = top && top.s > 0 ? top.c : "Other";
  const secondary = scores.filter((x) => x.s > 0 && x.c !== primary).slice(0, 2).map((x) => x.c);
  return { primary, secondary };
}

function detectSentiment(text: string, nps: number): Sentiment {
  const neg = scoreLexicon(text, NEG_WORDS);
  const pos = scoreLexicon(text, POS_WORDS);
  if (neg - pos >= 1 || nps <= 6) return "Negative";
  if (pos - neg >= 1 || nps >= 9) return "Positive";
  return "Neutral";
}

function detectSeverity(text: string, nps: number, sentiment: Sentiment): { severity: Severity; score: number; flagged: boolean } {
  const critical = scoreLexicon(text, CRITICAL_FLAGS);
  let score = 0;
  if (nps <= 3) score += 55;
  else if (nps <= 6) score += 35;
  else if (nps <= 8) score += 15;
  if (sentiment === "Negative") score += 25;
  if (sentiment === "Neutral") score += 8;
  score += scoreLexicon(text, NEG_WORDS) * 6;
  score += critical * 30;
  score = Math.min(100, score);

  let severity: Severity = "low";
  if (score >= 80 || critical > 0) severity = "critical";
  else if (score >= 55) severity = "high";
  else if (score >= 30) severity = "medium";

  const flagged = severity === "critical" || severity === "high";
  return { severity, score, flagged };
}

function extractKeywords(text: string): string[] {
  const stop = new Set([
    "the","a","an","and","or","but","if","then","to","of","in","on","for","with",
    "is","was","were","be","been","being","i","my","me","we","our","they","them","it",
    "this","that","at","as","by","from","have","had","has","not","no","so","just",
    "very","really","get","got","go","went","do","did","does","because","than","too",
  ]);
  const counts = new Map<string, number>();
  const words = text.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/);
  for (const w of words) {
    if (w.length < 4 || stop.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

function summarize(text: string, primary: Category, sentiment: Sentiment): string {
  const trimmed = text.length > 140 ? text.slice(0, 137).trimEnd() + "…" : text;
  return `${sentiment} signal about ${primary}: ${trimmed}`;
}

export function analyzeFeedback(raw: RawFeedback): AnalyzedFeedback {
  const text = (raw.feedback_text ?? "").toLowerCase();
  const { primary, secondary } = detectCategories(text);
  const sentiment = detectSentiment(text, raw.nps_score);
  const { severity, score, flagged } = detectSeverity(text, raw.nps_score, sentiment);
  const keywords = extractKeywords(raw.feedback_text ?? "");
  return {
    ...raw,
    category: primary,
    secondaryCategories: secondary,
    sentiment,
    severity,
    severityScore: score,
    keywords,
    flagged,
    summary: summarize(raw.feedback_text ?? "", primary, sentiment),
  };
}
