# SIGNAL — Decisions

## Why this ingestion strategy

The first implementation used direct browser polling. That made the UI a dashboard over snapshots and made meaningful momentum/history impossible. Version 4 moves ingestion server-side and stores observations in SQLite. Hacker News, GitHub and arXiv are public machine-readable sources that fit the prototype's time limit without scraping.

## Time-limit tradeoff

I chose a heuristic signal model instead of building a full semantic clustering/embedding pipeline first. With a real week, I would add embeddings, entity extraction, clustering, source-specific normalization and PostgreSQL/pgvector so relationships are semantic rather than keyword-based.

## Where AI was used

AI assistance was used for architecture exploration, implementation scaffolding and UI/data-flow iteration. The final data flow, source handling, persistence model, SSE transport, scoring logic and visual treatment were reviewed and adjusted manually. No generated number is presented as real historical data.
