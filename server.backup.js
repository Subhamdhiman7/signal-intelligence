import http from "node:http";
import { URL } from "node:url";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const PORT = Number(process.env.PORT || 3001);
const REFRESH_MS = 60_000;
const HISTORY_HOURS = 24;
const BUCKET_MINUTES = 60;
const DB_PATH = process.env.SIGNAL_DB || join(process.cwd(), "data", "signal.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at INTEGER,
    first_seen_at INTEGER,
    last_seen_at INTEGER,
    ingested_at INTEGER,
    UNIQUE(source, external_id)
  );

  CREATE TABLE IF NOT EXISTS ingestion_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    captured_at INTEGER NOT NULL,
    fetched_count INTEGER NOT NULL,
    new_count INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS signal_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_key TEXT NOT NULL,
    strength INTEGER NOT NULL,
    momentum REAL NOT NULL,
    matched_items INTEGER NOT NULL,
    source_count INTEGER NOT NULL,
    captured_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_documents_published ON documents(published_at);
  CREATE INDEX IF NOT EXISTS idx_documents_source_published ON documents(source, published_at);
  CREATE INDEX IF NOT EXISTS idx_snapshots_signal_time ON signal_snapshots(signal_key, captured_at);
`);

// Keep older SIGNAL databases compatible.
const documentColumns = new Set(
  db.prepare("PRAGMA table_info(documents)").all().map((row) => row.name)
);
if (!documentColumns.has("first_seen_at")) db.exec("ALTER TABLE documents ADD COLUMN first_seen_at INTEGER");
if (!documentColumns.has("last_seen_at")) db.exec("ALTER TABLE documents ADD COLUMN last_seen_at INTEGER");
if (!documentColumns.has("ingested_at")) db.exec("ALTER TABLE documents ADD COLUMN ingested_at INTEGER");

db.exec(`
  UPDATE documents
  SET first_seen_at = COALESCE(first_seen_at, ingested_at, published_at, strftime('%s','now') * 1000)
  WHERE first_seen_at IS NULL;
  UPDATE documents
  SET last_seen_at = COALESCE(last_seen_at, ingested_at, first_seen_at, published_at, strftime('%s','now') * 1000)
  WHERE last_seen_at IS NULL;
  UPDATE documents
  SET ingested_at = COALESCE(ingested_at, first_seen_at, published_at, strftime('%s','now') * 1000)
  WHERE ingested_at IS NULL;
`);

const TOPICS = [
  {
    key: "AI",
    title: "AI Agents",
    category: "AI",
    description: "Autonomous systems are moving from isolated assistants toward connected workflows.",
    patterns: ["Agentic workflows", "Tool use", "AI infrastructure"],
    terms: ["ai agent", "ai agents", "agentic", "agent framework", "autonomous agent", "llm agent", "agentic workflow", "mcp", "model context protocol"],
  },
  {
    key: "Robotics",
    title: "Embodied AI",
    category: "ROBOTICS",
    description: "Intelligent machines are moving closer to real-world environments and physical work.",
    patterns: ["Vision systems", "Autonomous control", "Edge compute"],
    terms: ["robotics", "humanoid", "embodied ai", "robot", "autonomous robot", "computer vision", "robot arm", "warehouse robot"],
  },
  {
    key: "Climate",
    title: "Grid Intelligence",
    category: "CLIMATE",
    description: "Energy systems are becoming more adaptive as distributed generation changes how grids operate.",
    patterns: ["Distributed energy", "Grid software", "Storage"],
    terms: ["grid intelligence", "smart grid", "energy storage", "battery", "renewable energy", "distributed energy", "grid software", "virtual power plant"],
  },
  {
    key: "FinTech",
    title: "Programmable Finance",
    category: "FINTECH",
    description: "Financial infrastructure is becoming increasingly software-defined and composable.",
    patterns: ["Embedded finance", "APIs", "Programmable payments"],
    terms: ["fintech", "embedded finance", "payments api", "programmable payments", "stablecoin", "financial api", "embedded payments", "open banking"],
  },
];

const SOURCES = ["Hacker News", "GitHub", "arXiv"];
const normalize = (value = "") => value.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ");
const matches = (text, terms) => terms.some((term) => normalize(text).includes(normalize(term)));

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "SIGNAL-Trend-Intelligence/5.0",
      Accept: "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function getHN() {
  const ids = await fetchJson("https://hacker-news.firebaseio.com/v0/newstories.json");
  const items = await Promise.all(
    ids.slice(0, 100).map(async (id) => {
      try {
        return await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      } catch {
        return null;
      }
    })
  );

  return items
    .filter((item) => item?.type === "story" && item.title)
    .map((item) => ({
      source: "Hacker News",
      externalId: String(item.id),
      title: item.title,
      text: `${item.title} ${item.url || ""}`,
      publishedAt: (item.time || Math.floor(Date.now() / 1000)) * 1000,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    }));
}

async function getArxiv() {
  const query = encodeURIComponent(
    'all:"artificial intelligence" OR all:robotics OR all:energy OR all:fintech'
  );
  const response = await fetch(
    `https://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending`,
    {
      headers: { "User-Agent": "SIGNAL-Trend-Intelligence/5.0" },
      signal: AbortSignal.timeout(12_000),
    }
  );
  if (!response.ok) throw new Error(`arXiv ${response.status}`);

  const xml = await response.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((match) => match[1])
    .map((entry) => {
      const title = (entry.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1]
        .replace(/\s+/g, " ")
        .trim();
      const summary = (entry.match(/<summary>([\s\S]*?)<\/summary>/) || [, ""])[1]
        .replace(/\s+/g, " ")
        .trim();
      const id = (entry.match(/<id>([^<]+)/) || [, ""])[1];
      const publishedAt = Date.parse((entry.match(/<published>([^<]+)/) || [, ""])[1]);
      return {
        source: "arXiv",
        externalId: id,
        title,
        text: `${title} ${summary}`,
        publishedAt: publishedAt || Date.now(),
        url: id,
      };
    })
    .filter((item) => item.title && item.externalId);
}

async function getGitHub() {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const query = encodeURIComponent(
    `created:>=${since} (agent OR robotics OR "smart grid" OR fintech OR stablecoin)`
  );
  const data = await fetchJson(
    `https://api.github.com/search/repositories?q=${query}&sort=created&order=desc&per_page=100`,
    { headers: { Accept: "application/vnd.github+json" } }
  );

  return (data.items || []).map((item) => ({
    source: "GitHub",
    externalId: String(item.id),
    title: item.full_name,
    text: `${item.name} ${item.description || ""} ${(item.topics || []).join(" ")}`,
    publishedAt: Date.parse(item.created_at) || Date.now(),
    url: item.html_url,
  }));
}

function ingest(items, capturedAt) {
  const select = db.prepare("SELECT id FROM documents WHERE source=? AND external_id=?");
  const insert = db.prepare(`
    INSERT INTO documents(source, external_id, title, text, url, published_at, first_seen_at, last_seen_at, ingested_at)
    VALUES(?,?,?,?,?,?,?,?,?)
  `);
  const update = db.prepare(`
    UPDATE documents
    SET title=?, text=?, url=?, published_at=?, last_seen_at=?, ingested_at=?
    WHERE source=? AND external_id=?
  `);
  const counts = Object.fromEntries(SOURCES.map((source) => [source, { fetched: 0, new: 0 }]));

  for (const item of items) {
    counts[item.source] ??= { fetched: 0, new: 0 };
    counts[item.source].fetched += 1;
    const publishedAt = Number.isFinite(item.publishedAt) ? item.publishedAt : capturedAt;
    const existing = select.get(item.source, item.externalId);

    if (existing) {
      update.run(item.title, item.text, item.url, publishedAt, capturedAt, capturedAt, item.source, item.externalId);
    } else {
      insert.run(item.source, item.externalId, item.title, item.text, item.url, publishedAt, capturedAt, capturedAt, capturedAt);
      counts[item.source].new += 1;
    }
  }

  const run = db.prepare(
    "INSERT INTO ingestion_runs(source,captured_at,fetched_count,new_count) VALUES(?,?,?,?)"
  );
  for (const source of SOURCES) run.run(source, capturedAt, counts[source].fetched, counts[source].new);
  return counts;
}

function topicDocuments(topic, since, until = Date.now()) {
  const rows = db
    .prepare(`
      SELECT source, title, text, url,
             published_at AS publishedAt,
             first_seen_at AS firstSeenAt,
             last_seen_at AS lastSeenAt
      FROM documents
      WHERE published_at >= ? AND published_at < ?
      ORDER BY published_at ASC
    `)
    .all(since, until);

  return rows.filter((row) => matches(`${row.title} ${row.text}`, topic.terms));
}

function bucketStart(timestamp) {
  const bucketMs = BUCKET_MINUTES * 60_000;
  return Math.floor(timestamp / bucketMs) * bucketMs;
}

function makeActivityHistory(topic, now) {
  const bucketMs = BUCKET_MINUTES * 60_000;
  const start = bucketStart(now - HISTORY_HOURS * 60 * 60_000);
  const end = bucketStart(now) + bucketMs;
  const docs = topicDocuments(topic, start, end);
  const buckets = [];

  for (let timestamp = start; timestamp < end; timestamp += bucketMs) {
    const bucketDocs = docs.filter(
      (doc) => doc.publishedAt >= timestamp && doc.publishedAt < timestamp + bucketMs
    );
    buckets.push({
      capturedAt: Math.min(timestamp + bucketMs, now),
      count: bucketDocs.length,
      sourceCount: new Set(bucketDocs.map((doc) => doc.source)).size,
    });
  }

  const maxCount = Math.max(0, ...buckets.map((bucket) => bucket.count));

  return buckets.map((bucket) => ({
    ...bucket,
    // The chart is a normalized view of REAL event volume for this topic.
    // Zero means no matching source activity in that bucket.
    intensity:
      maxCount === 0
        ? 0
        : Math.round((Math.log1p(bucket.count) / Math.log1p(maxCount)) * 100),
  }));
}

function calculate(topic, now) {
  const day = topicDocuments(topic, now - 24 * 60 * 60_000, now + 1);
  const history = makeActivityHistory(topic, now);

  const recent3Start = now - 3 * 60 * 60_000;
  const previous3Start = now - 6 * 60 * 60_000;
  const recent3 = day.filter((doc) => doc.publishedAt >= recent3Start);
  const previous3 = day.filter(
    (doc) => doc.publishedAt >= previous3Start && doc.publishedAt < recent3Start
  );
  const recent6 = day.filter((doc) => doc.publishedAt >= now - 6 * 60 * 60_000);
  const recentSources = new Set(recent6.map((doc) => doc.source));

  let momentum = null;
  if (previous3.length > 0) {
    const raw = ((recent3.length + 2) / (previous3.length + 2) - 1) * 100;
    momentum = Math.round(Math.max(-35, Math.min(35, raw)));
  }

  const activeBuckets = history.slice(-6).filter((bucket) => bucket.count > 0).length;
  const activityScore = Math.min(45, 10 * Math.log1p(day.length));
  const recencyScore = Math.min(25, 25 * (recent6.length / Math.max(1, day.length)));
  const diversityScore = Math.min(20, recentSources.size * (20 / 3));
  const consistencyScore = (activeBuckets / 6) * 10;
  const strength = Math.round(
    Math.max(0, Math.min(95, activityScore + recencyScore + diversityScore + consistencyScore))
  );

  const status =
    momentum !== null && momentum >= 15 && strength >= 55
      ? "Accelerating"
      : strength >= 50
        ? "Emerging"
        : "Building";

  const sourceNames = SOURCES.map((source) => {
    const sourceDocs = day.filter((doc) => doc.source === source);
    const latest = sourceDocs[sourceDocs.length - 1];
    return {
      name: source,
      count: sourceDocs.length,
      latestAt: latest?.publishedAt || null,
    };
  });

  const latest = day
    .slice(-8)
    .reverse()
    .map((doc) => ({
      source: doc.source,
      title: doc.title,
      url: doc.url,
      publishedAt: doc.publishedAt,
    }));

  return {
    ...topic,
    strength,
    momentum,
    momentumLabel: momentum === null ? "—" : `${momentum >= 0 ? "+" : ""}${momentum}%`,
    momentumBasis: momentum === null ? "building baseline" : "vs previous 3h",
    status,
    history,
    matchedCount: day.length,
    currentCount: recent3.length,
    sourceCount: recentSources.size,
    sourceNames,
    lastUpdated: now,
    latest,
  };
}

let state = {
  signals: [],
  sourceStatus: {},
  generatedAt: 0,
  error: null,
  ingestion: {},
};

const clients = new Set();
let refreshPromise = null;

function refresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const capturedAt = Date.now();
    const results = await Promise.allSettled([getHN(), getArxiv(), getGitHub()]);
    const items = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

    const ingestion = items.length ? ingest(items, capturedAt) : {};
    const signals = TOPICS.map((topic) => calculate(topic, capturedAt));

    const sourceStatus = {
      "Hacker News": results[0].status === "fulfilled",
      arXiv: results[1].status === "fulfilled",
      GitHub: results[2].status === "fulfilled",
    };

    const failedSources = Object.entries(sourceStatus)
      .filter(([, ok]) => !ok)
      .map(([source]) => source);

    state = {
      signals,
      sourceStatus,
      generatedAt: capturedAt,
      error:
        items.length === 0
          ? "Live sources unavailable; showing stored observations"
          : failedSources.length
            ? `Partial source outage: ${failedSources.join(", ")}`
            : null,
      ingestion,
    };

    broadcast();
    return state;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast() {
  for (const client of clients) send(client, "signals", state);
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      db: DB_PATH,
      clients: clients.size,
      lastUpdated: state.generatedAt,
    });
    return;
  }

  if (url.pathname === "/api/signals") {
    try {
      if (!state.generatedAt) await refresh();
      json(res, 200, {
        mode: "live-public-data",
        refreshAfterMs: REFRESH_MS,
        history: `${HISTORY_HOURS}h / ${BUCKET_MINUTES}m buckets`,
        ...state,
      });
    } catch (error) {
      json(res, 502, {
        error: "Signal calculation failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (url.pathname === "/api/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    clients.add(res);
    send(res, "connected", { ok: true, generatedAt: state.generatedAt });
    if (state.generatedAt) send(res, "signals", state);

    const heartbeat = setInterval(() => send(res, "heartbeat", { at: Date.now() }), 20_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`SIGNAL API → http://localhost:${PORT}`);
  refresh().catch((error) => console.error("Initial refresh failed:", error.message));
  setInterval(() => refresh().catch((error) => console.error("Refresh failed:", error.message)), REFRESH_MS);
});

function shutdown() {
  for (const client of clients) client.end();
  server.close(() => db.close());
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
