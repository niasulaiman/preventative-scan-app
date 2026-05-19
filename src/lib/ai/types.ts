// Core types shared across the AI analysis pipeline.

export const CATEGORIES = [
  "Scheduling",
  "Communication",
  "Facility Experience",
  "Wait Times",
  "Billing",
  "MRI Experience",
  "Results Delivery",
  "Staff Experience",
  "Technical Issues",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Sentiment = "Positive" | "Neutral" | "Negative";
export type Severity = "low" | "medium" | "high" | "critical";

export interface RawFeedback {
  response_id: string;
  nps_score: number;
  feedback_text: string;
  response_date: string; // ISO
  member_location: string;
}

export interface AnalyzedFeedback extends RawFeedback {
  category: Category;
  secondaryCategories: Category[];
  sentiment: Sentiment;
  severity: Severity;
  severityScore: number; // 0-100
  keywords: string[];
  flagged: boolean;
  summary: string;
}
