import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDot,
  Crosshair,
  Database,
  Menu,
  Network,
  Orbit,
  Radar,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";

const signals = {
  AI: {
    category: "AI",
    title: "AI Agents",
    description: "Autonomous systems are moving from isolated assistants toward connected workflows.",
    status: "Emerging",
    strength: 82,
    momentum: "+18%",
    color: "mint",
    patterns: ["Agentic workflows", "Tool use", "Edge AI"],
  },
  Robotics: {
    category: "ROBOTICS",
    title: "Embodied AI",
    description: "Intelligent machines are moving closer to real-world environments and physical work.",
    status: "Building",
    strength: 74,
    momentum: "+11%",
    color: "lime",
    patterns: ["Vision systems", "Autonomous control", "Edge compute"],
  },
  Climate: {
    category: "CLIMATE",
    title: "Grid Intelligence",
    description: "Energy systems are becoming more adaptive as distributed generation changes how grids operate.",
    status: "Accelerating",
    strength: 68,
    momentum: "+14%",
    color: "blue",
    patterns: ["Distributed energy", "Grid software", "Storage"],
  },
  FinTech: {
    category: "FINTECH",
    title: "Programmable Finance",
    description: "Financial infrastructure is becoming increasingly software-defined and composable.",
    status: "Emerging",
    strength: 71,
    momentum: "+13%",
    color: "violet",
    patterns: ["Embedded finance", "APIs", "Programmable payments"],
  },
};

const processSteps = [
  { number: "01", title: "Observe", description: "Collect signals from information streams and identify meaningful changes.", icon: Radar },
  { number: "02", title: "Connect", description: "Map relationships between topics, technologies, and emerging patterns.", icon: Network },
  { number: "03", title: "Surface", description: "Present the strongest signals clearly so you can decide what matters.", icon: Target },
];

const principles = [
  { index: "01", title: "Context", description: "Understand why a signal matters, not just that it exists.", icon: Database },
  { index: "02", title: "Momentum", description: "See where patterns are gaining attention and becoming connected.", icon: Activity },
  { index: "03", title: "Clarity", description: "Move from endless feeds to a focused view of what deserves attention.", icon: Crosshair },
];

const heroNodes = [
  { label: "Agentic\nWorkflows", x: 23, y: 26, cls: "node-one" },
  { label: "Memory &\nLong Context", x: 78, y: 19, cls: "node-two" },
  { label: "Tool Use\nAcceleration", x: 15, y: 60, cls: "node-three" },
  { label: "Model\nOrchestration", x: 84, y: 55, cls: "node-four" },
  { label: "Edge AI\nInfrastructure", x: 28, y: 82, cls: "node-five" },
  { label: "Autonomous\nSystems", x: 72, y: 83, cls: "node-six" },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function useReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: options.threshold ?? 0.12, rootMargin: options.rootMargin ?? "0px 0px -50px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);
  return [ref, visible];
}

function Reveal({ children, className = "", delay = 0 }) {
  const [ref, visible] = useReveal();
  return <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`} style={{ "--reveal-delay": `${delay}ms` }}>{children}</div>;
}

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark"><Zap size={16} strokeWidth={2.4} /></span>
      <span>SIGNAL</span>
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const go = (id) => { setOpen(false); scrollToId(id); };
  return (
    <header className={`navbar ${open ? "menu-open" : ""}`}>
      <div className="nav-inner">
        <button className="brand-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Go to top"><Logo /></button>
        <nav className="nav-pills" aria-label="Primary navigation">
          <button className="active" onClick={() => go("explorer")}>Explorer</button>
          <button onClick={() => go("process")}>Method</button>
          <button onClick={() => go("difference")}>Principles</button>
          <button onClick={() => go("about")}>About</button>
        </nav>
        <div className="nav-actions">
          <div className="live-model"><span className="pulse-dot" /><div><b>Live model</b><small>• Active</small></div><div className="mini-wave"><i/><i/><i/><i/><i/><i/></div></div>
          <button className="nav-cta" onClick={() => go("explorer")}>Explore signals <ArrowRight size={15} /></button>
        </div>
        <button className="mobile-menu-button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={19}/> : <Menu size={19}/>}</button>
      </div>
      <div className={`mobile-menu ${open ? "is-open" : ""}`}>
        <button onClick={() => go("explorer")}>Explorer <ArrowUpRight size={15}/></button>
        <button onClick={() => go("process")}>Method <ArrowUpRight size={15}/></button>
        <button onClick={() => go("difference")}>Principles <ArrowUpRight size={15}/></button>
        <button onClick={() => go("about")}>About <ArrowUpRight size={15}/></button>
      </div>
    </header>
  );
}

function HeroField() {
  const ref = useRef(null);
  const frame = useRef(0);
  const [focused, setFocused] = useState(null);
  const [tick, setTick] = useState(82);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((v) => (v >= 85 ? 82 : v + 1)), 2400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const move = (event) => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current.getBoundingClientRect();
    const x = (event.clientX - r.left) / r.width - 0.5;
    const y = (event.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.style.setProperty("--mx", `${x * 10}px`);
      ref.current.style.setProperty("--my", `${y * 8}px`);
    });
  };

  return (
    <div ref={ref} className="hero-field" onPointerMove={move} onPointerLeave={() => { ref.current?.style.setProperty("--mx", "0px"); ref.current?.style.setProperty("--my", "0px"); }}>
      <div className="field-stars" aria-hidden="true" />
      <div className="field-orbit orbit-a" /><div className="field-orbit orbit-b" /><div className="field-orbit orbit-c" />
      <div className="field-header"><span><Activity size={12}/> LIVE SIGNAL MAP</span><small>Updated just now</small></div>
      <div className="field-network" aria-label="Illustrative AI signal map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="network-lines" aria-hidden="true">
          <path d="M23 26 L50 43 L78 19 M15 60 L50 43 L84 55 M28 82 L50 43 L72 83 M23 26 L15 60 L28 82 M78 19 L84 55 L72 83" />
          <path className="network-secondary" d="M23 26 L78 19 M15 60 L84 55 M28 82 L72 83" />
        </svg>
        {heroNodes.map((node, index) => (
          <button key={node.label} className={`hero-node ${node.cls} ${focused === index ? "focused" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setFocused(focused === index ? null : index)} aria-label={`Focus ${node.label.replace("\n", " ")}`}>
            <span className="node-core" />
            <span className="node-label">{node.label.split("\n").map((line) => <span key={line}>{line}</span>)}</span>
          </button>
        ))}
        <div className="field-center" style={{ "--score": `${tick}` }}>
          <div className="center-rings"><span/><span/><span/></div>
          <strong>{tick}</strong>
          <small>SIGNAL STRENGTH</small>
          <b>STRONG</b>
        </div>
        <div className="momentum-scale"><span>MOMENTUM</span><div><b>High</b><i/><b>Emerging</b><i className="active"/><b>Low</b></div></div>
      </div>
      <div className="field-footer"><span><CircleDot size={12}/> AI Agents</span><small>Autonomous systems moving toward connected workflows</small></div>
      <div className="field-corner field-corner-top">SIGNAL / 01 — 08</div>
      <div className="field-corner field-corner-bottom">DEMO VISUALIZATION</div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero section-shell">
      <div className="hero-main">
        <Reveal className="hero-copy">
          <div className="eyebrow-row"><span className="eyebrow-dot"/> AI-POWERED SIGNAL INTELLIGENCE <span className="eyebrow-rule"/></div>
          <h1><span>See what's</span><span>changing.</span><em>Before it</em><em>becomes</em><em>obvious.</em></h1>
          <p>Signal turns scattered information into emerging patterns, meaningful connections, and clear signals you can act on.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => scrollToId("explorer")}>Explore signals <ArrowRight size={17}/></button>
            <button className="secondary-button" onClick={() => scrollToId("process")}><span className="play-ring">▶</span> See how it works</button>
          </div>
          <div className="hero-source-note"><span>PUBLIC DATA PIPELINE</span><b>Signal map is illustrative; Explorer uses live public sources.</b></div>
        </Reveal>
        <Reveal delay={120} className="hero-visual-wrap"><HeroField /></Reveal>
      </div>
      <Reveal delay={220} className="trust-row">
        <span className="trust-label">BUILT AROUND SIGNALS FROM</span>
        <div className="source-pills"><span>ARTICLES</span><span>RESEARCH</span><span>CODE</span><span>COMPANIES</span><span>JOBS</span><span>PATENTS</span></div>
      </Reveal>
      <DemoMetrics />
    </section>
  );
}

function DemoMetrics() {
  const metrics = [
    [Activity, "SIGNALS MONITORED", "LIVE", "Ingestion stream"],
    [Network, "SOURCES CONNECTED", "3", "Live adapters"],
    [Sparkles, "PATTERNS DETECTED", "LIVE", "Computed from sources"],
    [Orbit, "MOMENTUM ALERTS", "LIVE", "Derived from activity"],
    [Crosshair, "SIGNAL CONFIDENCE", "HEURISTIC", "Model score"],
  ];
  return <div className="demo-metrics">{metrics.map(([Icon, label, value, note]) => <div className="metric" key={label}><span className="metric-icon"><Icon size={17}/></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></div>)}</div>;
}

function Problem() {
  const bars = useMemo(() => Array.from({ length: 34 }, (_, i) => 18 + ((i * 31) % 72)), []);
  return (
    <section className="problem section-shell section-border">
      <div className="section-number">01</div>
      <div className="problem-grid">
        <Reveal><div className="display-heading"><span>THE</span><span>INTERNET</span><span>IS <em>LOUD.</em></span></div></Reveal>
        <Reveal delay={100} className="problem-reveal"><div className="problem-copy"><div className="accent-rule"/><h3>Finding information isn't the problem.</h3><p>The hard part is recognizing what connects, what is changing, and what deserves attention before everyone else sees it.</p><div className="noise-meter"><div className="noise-meter-top"><span>INFORMATION STREAMS</span><span>ENDLESS</span></div><div className="noise-bars">{bars.map((height, i) => <span key={i} style={{ "--bar": `${height}%` }}/>)}</div><div className="noise-meter-bottom"><span/> Signal exists inside the noise.</div></div></div></Reveal>
      </div>
    </section>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function relativeTime(timestamp) {
  if (!timestamp) return "No recent match";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function buildSmoothPath(history) {
  if (history.length < 2) return "";
  const coords = history.map((point, index) => ({
    x: 4 + (index / Math.max(1, history.length - 1)) * 92,
    y: 50 - (Math.max(0, Math.min(100, point.intensity ?? 0)) / 100) * 44,
  }));

  let path = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const current = coords[i];
    const next = coords[i + 1];
    const previous = coords[i - 1] || current;
    const afterNext = coords[i + 2] || next;
    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (afterNext.x - current.x) / 6;
    const cp2y = next.y - (afterNext.y - current.y) / 6;
    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return path;
}

function SignalChart({ signal }) {
  const [hovered, setHovered] = useState(null);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const rawHistory = signal.history?.length ? signal.history : [];
  const history = rawHistory.slice(-24);
  const latest = history[history.length - 1];
  const first = history[0];
  const path = buildSmoothPath(history);
  const areaPath = path ? `${path} L 96 54 L 4 54 Z` : "";
  const span = first && latest ? latest.capturedAt - first.capturedAt : 0;
  const spanLabel = span < 60_000 ? "building baseline" : span < 3_600_000 ? `${Math.max(1, Math.round(span / 60_000))}m window` : `${Math.round(span / 3_600_000)}h window`;
  const chartPoints = history.map((point, index) => ({
    ...point,
    x: 4 + (index / Math.max(1, history.length - 1)) * 92,
    y: 50 - (Math.max(0, Math.min(100, point.intensity ?? 0)) / 100) * 44,
  }));
  const sourceStatus = signal.sourceNames || [];
  const hasBaseline = history.length >= 2;

  return (
    <div className={`chart chart-${signal.color}`}>
      <div className="chart-topline">
        <div>
          <span>OBSERVED ACTIVITY</span>
          <small>{hasBaseline ? `${spanLabel} · ${history.length} × 10m buckets` : "Collecting live observations"}</small>
        </div>
        <div className="chart-current">
          <strong>{signal.momentumLabel || "—"}</strong>
          <small>{latest ? `${latest.count || 0} items in latest bucket · ${signal.momentumBasis || "observed activity"}` : "Waiting for data"}</small>
        </div>
      </div>

      <div className="chart-plot" onMouseLeave={() => setHovered(null)}>
        <div className="chart-y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div className="chart-grid-lines"><i/><i/><i/><i/><i/></div>
        {history.length > 0 && (
          <div className="chart-bars" aria-hidden="true">
            {chartPoints.map((point, index) => <i key={`bar-${point.capturedAt}-${index}`} style={{ height: `${point.intensity}%` }} />)}
          </div>
        )}
        {history.length === 0 ? (
          <div className="chart-empty"><span className="chart-empty-dot"/><p>Waiting for the first live observation</p></div>
        ) : (
          <svg className="chart-svg" viewBox="0 0 100 55" preserveAspectRatio="none" aria-label={`${signal.title} observed activity over time`}>
            <defs>
              <linearGradient id={`chart-fill-${signal.category.toLowerCase()}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity=".24" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill={`url(#chart-fill-${signal.category.toLowerCase()})`} />}
            {path && <path className="chart-line" d={path} fill="none" stroke="currentColor" strokeWidth="0.72" vectorEffect="non-scaling-stroke" />}
            {chartPoints.map((point, index) => (
              <circle
                key={`${point.capturedAt}-${index}`}
                className={`chart-point ${hovered === index ? "is-hovered" : ""}`}
                cx={point.x}
                cy={point.y}
                r={hovered === index || index === chartPoints.length - 1 ? 1.35 : .8}
                fill="currentColor"
                onMouseEnter={() => setHovered(index)}
              />
            ))}
          </svg>
        )}
        {hovered !== null && chartPoints[hovered] && (
          <div className="chart-tooltip" style={{ left: `${Math.min(82, Math.max(10, chartPoints[hovered].x))}%` }}>
            <strong>{chartPoints[hovered].count} {chartPoints[hovered].count === 1 ? "item" : "items"}</strong>
            <span>{formatTime(chartPoints[hovered].capturedAt)}</span>
          </div>
        )}
      </div>

      <div className="chart-axis">
        <span>{first ? formatTime(first.capturedAt) : "—"}</span>
        {history.length > 2 && <span>{formatTime(history[Math.floor(history.length / 2)].capturedAt)}</span>}
        <span>NOW</span>
      </div>

      <div className="chart-sources">
        <div className="source-panel-head">
          <span>SOURCE ACTIVITY</span>
          <small>{signal.sourceCount || 0}/3 contributing</small>
        </div>
        <div className="source-cards">
          {sourceStatus.map((source) => (
            <button
              type="button"
              className={`source-card ${source.count ? "has-data" : ""} ${sourceFilter === source.name ? "selected" : ""}`}
              key={source.name}
              onClick={() => setSourceFilter(sourceFilter === source.name ? "ALL" : source.name)}
              aria-pressed={sourceFilter === source.name}
            >
              <span className="source-card-top"><span className="source-dot"/><strong>{source.name}</strong><small>{source.count ? "ACTIVE" : "QUIET"}</small></span>
              <b>{source.count}</b>
              <span>{relativeTime(source.latestAt)}</span>
            </button>
          ))}
        </div>
      </div>

      {signal.latest?.length > 0 && (
        <div className="latest-evidence">
          <div className="source-panel-head"><span>RECENT EVIDENCE</span><small>CLICK TO OPEN SOURCE</small></div>
          <div className="evidence-row">
            {signal.latest.filter((item) => sourceFilter === "ALL" || item.source === sourceFilter).slice(0, 3).map((item) => (
              <a key={`${item.source}-${item.url}`} href={item.url} target="_blank" rel="noreferrer">
                <span>{item.source}</span>
                <strong>{item.title}</strong>
                <ArrowUpRight size={12}/>
              </a>
            ))}
            {signal.latest.filter((item) => sourceFilter === "ALL" || item.source === sourceFilter).length === 0 && (
              <div className="evidence-empty">No recent evidence from this source.</div>
            )}
          </div>
        </div>
      )}

      <div className="chart-footnote"><span><i/> Actual source activity · 10-minute buckets</span><span>{lastUpdatedLabel(signal.lastUpdated)}</span></div>
    </div>
  );
}

function lastUpdatedLabel(timestamp) {
  if (!timestamp) return "Waiting for live source";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  return `Updated ${Math.round(seconds / 60)}m ago`;
}

function SignalExplorer() {
  const [active, setActive] = useState("AI");
  const [liveSignals, setLiveSignals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let source;
    const load = async () => {
      try {
        const response = await fetch("/api/signals", { cache: "no-store" });
        if (!response.ok) throw new Error("Live source request failed");
        const payload = await response.json();
        const next = Object.fromEntries(payload.signals.map((item) => [item.key, item]));
        setLiveSignals(next); setLastUpdated(payload.generatedAt); setError(""); setLoading(false);
      } catch { setError("Live sources unavailable"); setLoading(false); }
    };
    load();
    source = new EventSource("/api/stream");
    source.addEventListener("signals", (event) => {
      const payload = JSON.parse(event.data);
      const next = Object.fromEntries(payload.signals.map((item) => [item.key, item]));
      setLiveSignals(next); setLastUpdated(payload.generatedAt); setError(payload.error || ""); setLoading(false);
    });
    source.addEventListener("error", () => setError((current) => current || "Reconnecting to live stream"));
    return () => source?.close();
  }, []);

  const signal = liveSignals[active] || {
    ...signals[active],
    status: "Unavailable",
    strength: null,
    momentumLabel: "—",
    matchedCount: null,
    history: [],
    sourceNames: [],
    latest: [],
    lastUpdated: null,
  };

  return (
    <section id="explorer" className="explorer section-shell">
      <div className="section-number">02</div>
      <div className="section-heading-row">
        <div><div className="eyebrow">LIVE EXPLORATION</div><h2>Signal Explorer</h2></div>
        <div className="explorer-live-meta"><span className="live-dot"/><span>{loading ? "CONNECTING" : error ? "RECONNECTING" : "LIVE PUBLIC DATA"}</span><small>{lastUpdated ? `Updated ${formatTime(lastUpdated)}` : "Starting stream"}</small></div>
      </div>
      <div className="explorer-card">
        <div className="explorer-tabs">{Object.keys(signals).map((key) => <button key={key} className={`${active === key ? "active" : ""} ${signals[key].color}`} onClick={() => setActive(key)}>{key}</button>)}</div>
        <div className="explorer-content">
          <div className="signal-details">
            <div className="demo-badge live-data-label"><span/>{error ? error : "LIVE INGESTION"}<time>{lastUpdated ? ` · ${formatTime(lastUpdated)}` : ""}</time></div>
            <div className={`signal-category ${signal.color}`}>{signal.category}</div><h3>{signal.title}</h3><p>{signal.description}</p>
            <div className="signal-stats">
              <div><span>STATUS</span><strong>{signal.status}</strong></div>
              <div><span>SIGNAL STRENGTH</span><strong className={signal.color}>{signal.strength == null ? "—" : `${signal.strength}%`}</strong></div>
              <div><span>MOMENTUM</span><strong className={signal.color}>{signal.momentumLabel || "—"}</strong></div>
              <div><span>OBSERVED / 24H</span><strong>{signal.matchedCount ?? "—"}</strong></div>
            </div>
            <div className="connected-patterns"><span>CONNECTED PATTERNS</span><ul>{signal.patterns.map((pattern) => <li key={pattern}><Check size={14}/>{pattern}</li>)}</ul></div>
            <div className="explorer-note"><CircleDot size={12}/><span>Scores are heuristic and derived from observed public-source activity.</span></div>
          </div>
          <SignalChart signal={signal}/>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const [active, setActive] = useState(0);
  const step = processSteps[active];
  const Icon = step.icon;
  return <section id="process" className="process section-shell section-border"><div className="section-number">03</div><Reveal><div className="section-heading-row process-heading"><div><div className="eyebrow">THE METHOD</div><h2>How Signal works</h2></div><p>Three deliberate steps turn fragmented<br/>information into something useful.</p></div></Reveal><div className="process-layout"><div className="process-list">{processSteps.map((item, index) => { const ItemIcon = item.icon; return <Reveal key={item.number} delay={index * 80}><button className={`process-card ${active === index ? "active" : ""}`} onClick={() => setActive(index)}><span className="process-number">{item.number}</span><span className="process-icon"><ItemIcon size={17}/></span><div><h3>{item.title}</h3><p>{item.description}</p></div><ChevronRight size={16}/></button></Reveal>; })}</div><Reveal delay={140} className="process-stage"><div className="stage-panel"><div className="stage-orbits"><span/><span/><span/><i/><i/><i/></div><div className="stage-core"><Icon size={19}/><strong>{step.number}</strong><small>{step.title}</small></div><div className="stage-status"><span/> LIVE MODEL</div><div className="stage-label">{active === 0 ? "Detect movement" : active === 1 ? "Map relationships" : "Surface signal"}</div></div></Reveal></div></section>;
}

function Difference() {
  return <section id="difference" className="difference section-shell section-border"><div className="section-number">04</div><div className="difference-grid"><Reveal><div><div className="eyebrow">THE SIGNAL PRINCIPLE</div><h2>Less<br/>information.<span>More<br/>signal.</span></h2><div className="principle-path"><span>NOISE</span><i/><span>CONTEXT</span><i/><span>ACTION</span></div></div></Reveal><div className="principles">{principles.map((item, index) => { const Icon = item.icon; return <Reveal key={item.title} delay={index * 90}><article className="principle"><span className="principle-index">{item.index}</span><span className="principle-icon"><Icon size={17}/></span><div><h3>{item.title}</h3><p>{item.description}</p></div><ArrowUpRight size={14}/></article></Reveal>; })}</div></div></section>;
}

function About() {
  return <section id="about" className="about section-shell"><Reveal><div className="about-card"><div className="about-orb"/><div><div className="eyebrow">A PRODUCT CONCEPT</div><h2>From fragmented information<br/><span>to focused intelligence.</span></h2></div><p>SIGNAL is a frontend concept for an intelligence platform that could ingest public or licensed sources, detect changing patterns, connect related topics, and surface emerging signals. The Explorer ingests public sources continuously and stores observations locally; signal scoring is heuristic and transparent.</p><button className="secondary-button" onClick={() => scrollToId("explorer")}>Inspect the demo <ArrowRight size={16}/></button></div></Reveal></section>;
}

function Footer() {
  return <footer className="footer section-shell"><div className="footer-brand"><Logo/><p>See what's changing.</p></div><div className="footer-center"><span><Crosshair size={12}/> DEMO PRODUCT</span><span><Orbit size={12}/> VISUAL INTELLIGENCE</span><span><Database size={12}/> DATA-READY CONCEPT</span></div><div className="footer-meta"><span>ACYDON FRONTEND CHALLENGE</span><span>PART 2 / HOME PAGE</span></div></footer>;
}

function App() {
  return <div className="app"><div className="page-noise"/><div className="ambient ambient-one"/><div className="ambient ambient-two"/><Navbar/><main><Hero/><Problem/><SignalExplorer/><Process/><Difference/><About/></main><Footer/><div className="scroll-progress"/></div>;
}

export default App;
