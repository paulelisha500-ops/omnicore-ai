/* ============================================================================
   Live retrieval from public, CORS-enabled APIs — no keys, no proxy, called
   straight from the browser. Only the search text leaves the device.

     Wikipedia            (en / ar)            orientation, general knowledge
     US Federal Register  federalregister.gov  official US rules & notices
     GOV.UK               gov.uk               official UK guidance
     EU Open Data Portal  data.europa.eu       official EU datasets
   ============================================================================ */

const TIMEOUT = 12_000;

async function getJSON(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

const clean = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();

export async function wikipedia(query, { lang = "en", limit = 4, sentences = 4 } = {}) {
  const host = lang === "ar" ? "ar.wikipedia.org" : "en.wikipedia.org";
  const u = new URL(`https://${host}/w/api.php`);
  Object.entries({
    action: "query", generator: "search", gsrsearch: query, gsrlimit: String(limit),
    prop: "extracts|info", exintro: "1", explaintext: "1", exsentences: String(sentences),
    inprop: "url", format: "json", origin: "*",
  }).forEach(([k, v]) => u.searchParams.set(k, v));
  const data = await getJSON(u);
  const pages = Object.values(data?.query?.pages || {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages.map((p) => ({
    title: p.title, snippet: clean(p.extract).slice(0, 900), url: p.fullurl,
    source: "Wikipedia", official: false,
  })).filter((r) => r.snippet);
}

export async function federalRegister(query, { limit = 5 } = {}) {
  const u = new URL("https://www.federalregister.gov/api/v1/documents.json");
  u.searchParams.set("conditions[term]", query);
  u.searchParams.set("per_page", String(limit));
  u.searchParams.set("order", "relevance");
  ["title", "abstract", "html_url", "agencies", "publication_date", "type"].forEach((f) => u.searchParams.append("fields[]", f));
  const data = await getJSON(u);
  return (data?.results || []).map((d) => ({
    title: clean(d.title), snippet: clean(d.abstract).slice(0, 700), url: d.html_url,
    source: (d.agencies || []).map((a) => a.name).filter(Boolean).slice(0, 2).join(", ") || "Federal Register",
    date: d.publication_date, type: d.type, official: true,
  }));
}

export async function govUk(query, { limit = 5 } = {}) {
  const u = new URL("https://www.gov.uk/api/search.json");
  u.searchParams.set("q", query);
  u.searchParams.set("count", String(limit));
  const data = await getJSON(u);
  return (data?.results || []).map((d) => ({
    title: clean(d.title), snippet: clean(d.description).slice(0, 600),
    url: d.link?.startsWith("http") ? d.link : `https://www.gov.uk${d.link}`,
    source: (d.organisations || []).map((o) => o.title).filter(Boolean).slice(0, 2).join(", ") || "GOV.UK",
    date: d.public_timestamp?.slice(0, 10), official: true,
  }));
}

export async function euOpenData(query, { limit = 4 } = {}) {
  const u = new URL("https://data.europa.eu/api/hub/search/search");
  u.searchParams.set("q", query);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("filter", "dataset");
  const data = await getJSON(u);
  const pick = (o) => (o && (o.en || Object.values(o)[0])) || "";
  return (data?.result?.results || []).map((d) => ({
    title: clean(pick(d.title)), snippet: clean(pick(d.description)).slice(0, 500),
    url: `https://data.europa.eu/data/datasets/${d.id}?locale=en`,
    source: clean(d.catalog?.title ? pick(d.catalog.title) : "EU Open Data Portal") || "EU Open Data Portal",
    official: true,
  })).filter((r) => r.title);
}

/* Turn a conversational question into a search query: expand common
   abbreviations and drop filler words. "What is the corporate tax rate in the
   UAE?" → "corporate tax rate United Arab Emirates", which is what actually
   finds the right article. */
const ABBR = {
  uae: "United Arab Emirates", ksa: "Saudi Arabia", usa: "United States", us: "United States", uk: "United Kingdom",
  eu: "European Union", gcc: "Gulf Cooperation Council", un: "United Nations", who: null, wto: "World Trade Organization",
  imf: "International Monetary Fund", gdp: "gross domestic product", vat: "value added tax", ceo: "chief executive officer",
};
const STOP = new Set(("what whats is are was were the a an of in on for to and or how does do did which who whom why when where can could " +
  "should would i me my we our you your please tell about explain with it its this that there be been as at by from into than then " +
  "current currently today now give show find know much many any some list define meaning " +
  "ما ماذا هو هي هل في من على عن إلى الى كيف لماذا متى أين اين كم ذلك هذا هذه التي الذي أو او و").split(" "));

export function searchQuery(q) {
  const words = String(q).replace(/[?؟!.,;:"'()«»]/g, " ").split(/\s+/).filter(Boolean);
  const out = [];
  for (const w of words) {
    const l = w.toLowerCase();
    if (l in ABBR && ABBR[l]) out.push(ABBR[l]);
    else if (!STOP.has(l)) out.push(w);
  }
  return out.join(" ").trim() || String(q);
}

function rerank(results, query) {
  const terms = searchQuery(query).toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const score = (r) => {
    const title = r.title.toLowerCase(), body = r.snippet.toLowerCase();
    return terms.reduce((s, t) => s + (title.includes(t) ? 2 : 0) + (body.includes(t) ? 1 : 0), 0);
  };
  return results.map((r, i) => ({ r, s: score(r) - i * 0.01 })).sort((a, b) => b.s - a.s).map((x) => x.r);
}

/** General web lookup used by Chat, agents and Enterprise Search. */
export async function webSearch(query, lang = "en") {
  const q = searchQuery(query);
  let results = await wikipedia(q, { lang, limit: 6, sentences: 5 }).catch(() => []);
  if (!results.length && lang === "ar") results = await wikipedia(q, { lang: "en", limit: 6, sentences: 5 }).catch(() => []);
  if (!results.length && q !== query) results = await wikipedia(query, { lang, limit: 6, sentences: 5 }).catch(() => []);
  return rerank(results, query).slice(0, 4);
}

/** Numbered source block for grounding a model answer. */
export function sourceBlock(results) {
  return results.map((r, i) => `[${i + 1}] ${r.title} (${r.source}${r.official ? ", OFFICIAL" : ""})\n${r.snippet}`).join("\n\n");
}
