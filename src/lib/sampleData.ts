// Sample dataset generator — gives the dashboard a populated state on first
// load. Replaced when the user uploads a real CSV.

import type { RawFeedback } from "./ai/types";

const LOCATIONS = [
  "Austin, TX", "Dallas, TX", "Houston, TX",
  "Los Angeles, CA", "San Francisco, CA", "San Diego, CA",
  "New York, NY", "Brooklyn, NY",
  "Chicago, IL", "Miami, FL", "Atlanta, GA", "Seattle, WA",
  "Denver, CO", "Phoenix, AZ", "Boston, MA",
];

const TEMPLATES: { text: string; nps: [number, number]; weight: number }[] = [
  { text: "Scheduling took weeks and they rescheduled my appointment twice with almost no notice. Very frustrating experience.", nps: [1, 4], weight: 3 },
  { text: "I waited over 90 minutes past my appointment time in the lobby. The wait times are unacceptable.", nps: [2, 5], weight: 3 },
  { text: "The MRI tech was rude and dismissive when I told her I was claustrophobic. Felt unsafe and unheard.", nps: [0, 3], weight: 2 },
  { text: "I still have not received my results after 14 days. No one returns my calls or emails.", nps: [1, 4], weight: 3 },
  { text: "Billing charged me twice and insurance was never filed correctly. Spent hours on the phone.", nps: [2, 5], weight: 2 },
  { text: "The portal is broken. I cannot log in to see my report and the app keeps crashing.", nps: [3, 6], weight: 2 },
  { text: "Front desk staff were friendly and the facility was very clean. MRI machine was loud but tech was kind.", nps: [7, 8], weight: 2 },
  { text: "Absolutely fantastic experience from booking to results. The team was professional and caring. Highly recommend.", nps: [9, 10], weight: 4 },
  { text: "Smooth and easy. Got my full body scan done in under an hour and results came in two days.", nps: [9, 10], weight: 3 },
  { text: "Communication around prep instructions was unclear. I had to call three times to confirm what to do.", nps: [4, 6], weight: 2 },
  { text: "Parking was a nightmare and the lobby was overcrowded. Facility experience needs work.", nps: [4, 6], weight: 2 },
  { text: "Results were delivered quickly but the explanation in the report was confusing and I could not get a follow up.", nps: [5, 7], weight: 2 },
  { text: "Felt the radiologist rushed through reviewing my scan. Worried something was missed — this is dangerous.", nps: [0, 3], weight: 1 },
  { text: "Great staff, terrible billing department. Mixed feelings overall.", nps: [6, 7], weight: 2 },
  { text: "Wait time was reasonable, MRI was quick, and the tech walked me through every step. Loved it.", nps: [8, 10], weight: 3 },
];

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Seeded-ish randomness so repeated visits produce similar shapes
let seed = 42;
function srand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
function spick<T>(arr: readonly T[]): T { return arr[Math.floor(srand() * arr.length)]; }
function srandRange(min: number, max: number) { return Math.floor(srand() * (max - min + 1)) + min; }

export function generateSampleFeedback(n = 480): RawFeedback[] {
  const out: RawFeedback[] = [];
  const weighted = TEMPLATES.flatMap((t) => Array(t.weight).fill(t));
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const t = weighted[Math.floor(srand() * weighted.length)];
    const nps = srandRange(t.nps[0], t.nps[1]);
    // Skew dates over last 60 days, with more recent traffic
    const daysAgo = Math.floor(Math.pow(srand(), 1.4) * 60);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    out.push({
      response_id: `r_${1000 + i}`,
      nps_score: nps,
      feedback_text: t.text,
      response_date: d.toISOString().slice(0, 10),
      member_location: spick(LOCATIONS),
    });
  }
  return out;
}

export function downloadSampleCSV() {
  const rows = generateSampleFeedback(500);
  const header = "response_id,nps_score,feedback_text,response_date,member_location";
  const body = rows.map((r) =>
    [r.response_id, r.nps_score, JSON.stringify(r.feedback_text), r.response_date, JSON.stringify(r.member_location)].join(","),
  ).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "preventativescan_member_feedback.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// silence unused warnings for helpers kept for future variants
void pick; void rand;
