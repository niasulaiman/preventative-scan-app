# PreventativeScan — AI Operations Dashboard

A production-style internal AI operations monitoring platform for a fictional preventive MRI screening company. Ingests member NPS feedback at scale, routes it through an AI analysis pipeline, and surfaces the root causes pulling NPS down during hypergrowth.

> Context: PreventativeScan scaled from 1,000 → 20,000 MRI scans / month in 6 months. NPS dropped from 85 → 72. This dashboard helps operations teams intervene **before** issues scale.

## ✨ Features

- **CSV ingestion** — drag & drop with validation, invalid-row handling, success state
- **AI analysis pipeline** — categorizes feedback into 10 operational themes, detects sentiment, scores severity, flags critical signals, extracts keywords
- **Executive summary** — total responses, avg NPS, % negative, top issue, high-severity count, composite **operational risk score**
- **Top issues** — ranked by frequency × severity, with member quotes and recommended actions
- **Trend analysis** — NPS, sentiment, complaint categories, high-severity alerts over time (Recharts)
- **Geographic insights** — hotspot detection by region with NPS and negative-sentiment breakdown
- **Member feedback explorer** — searchable, multi-filter table (date, category, severity, sentiment, NPS bucket)
- **Alerting** — threshold-based (>5% category share, sentiment spikes, severity surges) + anomaly detection with sparklines
- **AI executive briefing** — daily summary, root-cause hypotheses, urgent risks, recommended actions, predicted escalations

## 🧱 Tech stack

- **React 19 + TypeScript**
- **TanStack Start** (Vite 7, file-based routing)
- **Tailwind CSS v4** (semantic design tokens in `src/styles.css`)
- **Recharts** for visualizations
- **Papaparse** for CSV ingestion
- **lucide-react** for icons

## 🚀 Getting started

```bash
bun install
bun run dev
```

Open `http://localhost:5173`. The dashboard boots with a synthetic 500-row dataset so you can see every panel populated.

## 📂 Project structure

```
src/
├── routes/
│   ├── __root.tsx                 # Root shell (head, providers)
│   └── index.tsx                  # Main dashboard page
├── components/
│   ├── dashboard/
│   │   ├── DashboardHeader.tsx
│   │   ├── ExecutiveSummary.tsx   # 6 KPI cards
│   │   ├── MetricCard.tsx
│   │   ├── TopIssues.tsx          # Drill-down issue cards
│   │   ├── TrendCharts.tsx        # NPS / sentiment / severity / category charts
│   │   ├── GeographicInsights.tsx
│   │   ├── FeedbackExplorer.tsx   # Filterable table
│   │   ├── AlertsPanel.tsx
│   │   ├── AIInsightsPanel.tsx    # Executive briefing
│   │   ├── CSVUploader.tsx
│   │   └── StatusBadge.tsx
│   └── ui/                        # shadcn primitives
└── lib/
    ├── ai/
    │   ├── types.ts               # Category / Sentiment / Severity / Analyzed types
    │   ├── prompts.ts             # Example AI prompts (used by real OpenAI swap)
    │   ├── categorizer.ts         # Rule-based mock categorizer
    │   └── mockOpenAI.ts          # 🔌 Service layer — swap for real OpenAI here
    ├── csv/parser.ts              # Papaparse + row validation
    ├── analysis.ts                # Aggregations, trend series, region stats, risk score
    ├── alerts.ts                  # Threshold + anomaly alerting
    └── sampleData.ts              # Synthetic dataset generator
```

## 🤖 Swapping the mock AI layer for real OpenAI

Every consumer reads from two functions in `src/lib/ai/mockOpenAI.ts`:

```ts
analyzeBatch(rows: RawFeedback[]): Promise<AnalyzedFeedback[]>
generateExecutiveBrief(analyzed, aggregate): Promise<ExecutiveBrief>
```

To go live:

1. Add your key to a `.env` file at the project root:
   ```
   OPENAI_API_KEY=sk-...
   ```
2. Move OpenAI calls **server-side** (TanStack Start server function or `/api/*` route) — never expose the key to the browser.
3. Replace the body of `analyzeBatch` with a real `openai.chat.completions.create` call using `SYSTEM_PROMPT` + `CATEGORIZATION_PROMPT` from `src/lib/ai/prompts.ts`. Return the same `AnalyzedFeedback[]` shape — every component is wired to it.
4. Replace `generateExecutiveBrief` with a call using `EXECUTIVE_BRIEF_PROMPT`, returning the same `ExecutiveBrief` shape.

Suggested model: `gpt-4o-mini` for `analyzeBatch` (batched), `gpt-4o` for `generateExecutiveBrief`.

### Example prompts

See `src/lib/ai/prompts.ts`. They cover:
- `SYSTEM_PROMPT` — analyst role + JSON-only output contract
- `CATEGORIZATION_PROMPT` — per-row classification with full schema
- `EXECUTIVE_BRIEF_PROMPT` — aggregate → executive briefing

## 📄 CSV format

```
response_id,nps_score,feedback_text,response_date,member_location
r_1001,4,"Wait time was over 90 minutes...",2025-04-12,"Austin, TX"
```

Click **Sample CSV** in the uploader to download a generated 500-row file you can re-import.

## 🛣️ Roadmap / bonus ideas

- PDF export of dashboard summary
- Email digest preview
- AI issue clustering (k-means over embeddings)
- Executive briefing mode (presentation view)
- Real-time alerting webhook integration

## 📜 License

MIT
