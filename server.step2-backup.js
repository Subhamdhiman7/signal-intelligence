import http from 'node:http';
import { URL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT || 3001);
const REFRESH_MS = 60_000;
const DB_PATH = process.env.SIGNAL_DB || join(process.cwd(), 'data', 'signal.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    url TEXT NOT NULL,
    published_at INTEGER,
    ingested_at INTEGER NOT NULL,
    UNIQUE(source, external_id)
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
  CREATE INDEX IF NOT EXISTS idx_documents_source_time ON documents(source, published_at);
  CREATE INDEX IF NOT EXISTS idx_snapshots_signal_time ON signal_snapshots(signal_key, captured_at);
`);

const TOPICS = [
  { key:'AI', title:'AI Agents', category:'AI', description:'Autonomous systems are moving from isolated assistants toward connected workflows.', patterns:['Agentic workflows','Tool use','AI infrastructure'], terms:['ai agent','ai agents','agentic','agent framework','autonomous agent','llm agent','agentic workflow','mcp','model context protocol'] },
  { key:'Robotics', title:'Embodied AI', category:'ROBOTICS', description:'Intelligent machines are moving closer to real-world environments and physical work.', patterns:['Vision systems','Autonomous control','Edge compute'], terms:['robotics','humanoid','embodied ai','robot','autonomous robot','computer vision','robot arm','warehouse robot'] },
  { key:'Climate', title:'Grid Intelligence', category:'CLIMATE', description:'Energy systems are becoming more adaptive as distributed generation changes how grids operate.', patterns:['Distributed energy','Grid software','Storage'], terms:['grid intelligence','smart grid','energy storage','battery','renewable energy','distributed energy','grid software','virtual power plant'] },
  { key:'FinTech', title:'Programmable Finance', category:'FINTECH', description:'Financial infrastructure is becoming increasingly software-defined and composable.', patterns:['Embedded finance','APIs','Programmable payments'], terms:['fintech','embedded finance','payments api','programmable payments','stablecoin','financial api','embedded payments','open banking'] }
];

const normalize = (v='') => v.toLowerCase().replace(/[^a-z0-9+#.\s-]/g,' ');
const matches = (text, terms) => terms.reduce((n,t)=>n+(normalize(text).includes(normalize(t))?1:0),0);

async function fetchJson(url, options={}) {
  const r=await fetch(url,{...options,headers:{'User-Agent':'SIGNAL-Trend-Intelligence/2.0',Accept:'application/json',...(options.headers||{})},signal:AbortSignal.timeout(12000)});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function getHN(){
  const ids=await fetchJson('https://hacker-news.firebaseio.com/v0/newstories.json');
  const items=await Promise.all(ids.slice(0,100).map(async id=>{try{return await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)}catch{return null}}));
  return items.filter(x=>x?.type==='story'&&x.title).map(x=>({source:'Hacker News',externalId:String(x.id),title:x.title,text:`${x.title} ${x.url||''}`,publishedAt:(x.time||Date.now()/1000)*1000,url:x.url||`https://news.ycombinator.com/item?id=${x.id}`}));
}

async function getArxiv(){
  const q=encodeURIComponent('all:"artificial intelligence" OR all:robotics OR all:energy OR all:fintech');
  const r=await fetch(`https://export.arxiv.org/api/query?search_query=${q}&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending`,{headers:{'User-Agent':'SIGNAL-Trend-Intelligence/2.0'},signal:AbortSignal.timeout(12000)});
  if(!r.ok) throw new Error(`arXiv ${r.status}`);
  const xml=await r.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>m[1]).map(e=>({source:'arXiv',externalId:(e.match(/<id>([^<]+)/)||[,''])[1],title:(e.match(/<title>([\s\S]*?)<\/title>/)||[,''])[1].replace(/\s+/g,' ').trim(),text:`${(e.match(/<title>([\s\S]*?)<\/title>/)||[,''])[1]} ${(e.match(/<summary>([\s\S]*?)<\/summary>/)||[,''])[1]}`.replace(/\s+/g,' ').trim(),publishedAt:Date.parse((e.match(/<published>([^<]+)/)||[,''])[1])||Date.now(),url:(e.match(/<id>([^<]+)/)||[,''])[1]})).filter(x=>x.title&&x.externalId);
}

async function getGitHub(){
  const since=new Date(Date.now()-14*86400000).toISOString().slice(0,10);
  const q=encodeURIComponent(`created:>=${since} (agent OR robotics OR "smart grid" OR fintech OR stablecoin)`);
  const data=await fetchJson(`https://api.github.com/search/repositories?q=${q}&sort=updated&order=desc&per_page=50`,{headers:{Accept:'application/vnd.github+json'}});
  return (data.items||[]).map(x=>({source:'GitHub',externalId:String(x.id),title:x.full_name,text:`${x.name} ${x.description||''} ${(x.topics||[]).join(' ')}`,publishedAt:Date.parse(x.created_at)||Date.now(),url:x.html_url}));
}

function ingest(items){
  const stmt=db.prepare(`INSERT INTO documents(source,external_id,title,text,url,published_at,ingested_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source,external_id) DO UPDATE SET title=excluded.title,text=excluded.text,url=excluded.url,published_at=excluded.published_at`);
  const now=Date.now();
  for(const item of items) stmt.run(item.source,item.externalId,item.title,item.text,item.url,item.publishedAt||now,now);
}

function topicItems(topic){
  const rows=db.prepare(`SELECT source,title,text,url,published_at AS publishedAt,ingested_at AS ingestedAt FROM documents WHERE published_at >= ? ORDER BY published_at DESC LIMIT 1000`).all(Date.now()-14*86400000);
  return rows.filter(x=>matches(`${x.title} ${x.text}`,topic.terms)>0);
}

function sourceStats(topic, items){
  return ['Hacker News','GitHub','arXiv'].map(source=>{
    const sourceItems=items.filter(x=>x.source===source);
    return {name:source,count:sourceItems.length,latestAt:sourceItems[0]?.publishedAt||null};
  });
}

function signalScore(topic){
  const now=Date.now();
  const items=topicItems(topic);
  const windows=[6,24,72];
  const counts=windows.map(hours=>items.filter(x=>x.publishedAt>=now-hours*3600000).length);
  const current=counts[0];
  const previous6=items.filter(x=>x.publishedAt>=now-12*3600000&&x.publishedAt<now-6*3600000).length;
  const day=counts[1];
  const previousDay=items.filter(x=>x.publishedAt>=now-48*3600000&&x.publishedAt<now-24*3600000).length;
  const sourceCount=new Set(items.map(x=>x.source)).size;
  const velocity=previous6>0 ? ((current-previous6)/previous6)*100 : current>0 ? Math.min(100,current*10) : 0;
  const dayGrowth=previousDay>0 ? ((day-previousDay)/previousDay)*100 : day>0 ? Math.min(100,day*5) : 0;
  const novelty=Math.min(25, new Set(items.slice(0,60).map(x=>x.title.toLowerCase())).size / Math.max(1,items.length) * 25);
  const activityScore = Math.round(5 * Math.sqrt(current));
  const sourceDiversity = sourceCount * 7;
  const strength = Math.max(0, Math.min(99, Math.round(22 + activityScore + sourceDiversity + novelty * 0.45)));
  const rawMomentum = (velocity * 0.65) + (dayGrowth * 0.35);
  const momentum = Math.round(Math.max(-50, Math.min(50, rawMomentum)));
  const status=strength>=78?'Accelerating':strength>=50?'Emerging':'Building';

  const snapshots=db.prepare(`SELECT strength,momentum,matched_items AS matchedItems,source_count AS sourceCount,captured_at AS capturedAt FROM signal_snapshots WHERE signal_key=? ORDER BY captured_at DESC LIMIT 30`).all(topic.key).reverse();
  const history=snapshots.map(x=>({strength:x.strength,momentum:x.momentum,matchedItems:x.matchedItems,capturedAt:x.capturedAt}));
  if(!history.length || history[history.length-1].capturedAt < now-15000){
    history.push({strength,momentum,matchedItems:items.length,sourceCount,capturedAt:now});
  }
  const recent=history.slice(-30);
  const min=Math.min(...recent.map(x=>x.strength),0);
  const max=Math.max(...recent.map(x=>x.strength),100);
  const range=Math.max(12,max-min);
  const points=recent.map((p,i)=>{
    const x=4+(i/Math.max(1,recent.length-1))*92;
    const y=49-((p.strength-min)/range)*38;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const sourceNames=sourceStats(topic,items);
  const latest=items.slice(0,5).map(x=>({source:x.source,title:x.title,url:x.url,publishedAt:x.publishedAt}));
  return {...topic,strength,momentum,momentumLabel:`${momentum>=0?'+':''}${momentum}%`,status,points,history,matchedCount:items.length,currentCount:current,sourceCount,sourceNames,lastUpdated:now,latest};
}

function persistSnapshots(signals){
  const now=Date.now();
  const stmt=db.prepare(`INSERT INTO signal_snapshots(signal_key,strength,momentum,matched_items,source_count,captured_at) VALUES(?,?,?,?,?,?)`);
  for(const s of signals) stmt.run(s.key,s.strength,s.momentum,s.matchedCount,s.sourceCount,now);
  db.exec(`DELETE FROM signal_snapshots WHERE captured_at < ${now-7*86400000}`);
}

let state={signals:[],sourceStatus:{},generatedAt:0,error:null};
let clients=new Set();
let refreshing=false;

async function refresh(){
  if(refreshing) return state;
  refreshing=true;
  const results=await Promise.allSettled([getHN(),getArxiv(),getGitHub()]);
  const items=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  if(items.length) ingest(items);
  const signals=TOPICS.map(signalScore);
  persistSnapshots(signals);
  state={signals,sourceStatus:{'Hacker News':results[0].status==='fulfilled','arXiv':results[1].status==='fulfilled',GitHub:results[2].status==='fulfilled'},generatedAt:Date.now(),error:items.length?'': 'No live source returned data'};
  broadcast();
  refreshing=false;
  return state;
}

function send(res,event,data){res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);}
function broadcast(){for(const client of clients){send(client,'signals',state);}}

function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}

http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(url.pathname==='/api/health'){json(res,200,{ok:true,db:DB_PATH,clients:clients.size,lastUpdated:state.generatedAt});return;}
  if(url.pathname==='/api/signals'){
    try{if(!state.generatedAt) await refresh();json(res,200,{mode:'live-public-data',refreshAfterMs:REFRESH_MS,...state});}
    catch(e){json(res,502,{error:'Live sources unavailable',detail:e.message});}
    return;
  }
  if(url.pathname==='/api/stream'){
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','Access-Control-Allow-Origin':'*'});
    clients.add(res);send(res,'connected',{ok:true,generatedAt:state.generatedAt});if(state.generatedAt)send(res,'signals',state);
    const heartbeat=setInterval(()=>send(res,'heartbeat',{at:Date.now()}),20000);
    req.on('close',()=>{clearInterval(heartbeat);clients.delete(res);});
    return;
  }
  json(res,404,{error:'Not found'});
}).listen(PORT,()=>{
  console.log(`SIGNAL API → http://localhost:${PORT}`);
  refresh().catch(err=>console.error('Initial refresh failed:',err.message));
  setInterval(()=>refresh().catch(err=>console.error('Refresh failed:',err.message)),REFRESH_MS);
});
