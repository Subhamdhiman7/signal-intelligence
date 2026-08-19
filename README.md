# SIGNAL — Real-Time Public-Signal Explorer
https://signal-intelligence-sgwb.onrender.com/

SIGNAL is a Part 2 frontend concept for an intelligence product that turns public information streams into transparent, time-based signal activity.

## Real-time processing

The Explorer uses three public sources:

- Hacker News
- GitHub
- arXiv

The Node API refreshes them every 60 seconds and stores unique source documents in SQLite. Each document retains its source timestamp and ingestion timestamps.

The chart is **not** a repeated signal-strength snapshot. It is built from the actual publication/creation timestamps of matched source documents:

```text
source documents
      ↓
 topic matching
      ↓
 10-minute time buckets
      ↓
 actual event count per bucket
      ↓
 activity chart + source evidence
      ↓
 signal strength + conservative momentum
```

### Momentum rule

Momentum compares the current 3-hour matched-event count with the previous 3-hour count. A percentage is only shown when the previous window has at least two observations. Otherwise SIGNAL displays `— / building baseline` rather than claiming growth from a zero baseline.

Momentum is capped at ±35% to prevent sparse public-source snapshots from producing misleading extreme percentages.

### Signal strength

Strength is heuristic and transparent. It combines recent volume, recency, source diversity, and consistency across recent buckets. It is capped below 100 so the UI does not imply false certainty.

### Chart

The chart displays the last 24 ten-minute buckets (roughly four hours) from the stored 24-hour activity window. The line/area uses normalized visual intensity, while hover shows the **raw number of matched items** in that bucket.

## Run locally

Requires Node.js 22+ because the API uses Node's built-in `node:sqlite`.

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`
API: `http://localhost:3001/api/health`

## Environment

Optional:

```text
PORT=3001
SIGNAL_DB=./data/signal.db
```

No API key is required by the current public-source implementation.
