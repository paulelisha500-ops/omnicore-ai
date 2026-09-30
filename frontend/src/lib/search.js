/* ============================================================================
   Ranked local search: term-frequency scoring with log damping, a bonus for
   covering more distinct query terms, and mild length normalisation — over a
   Unicode-aware tokeniser, so Arabic and English rank the same way.
   ============================================================================ */

const WORD = /[\p{L}\p{N}]+/gu;
// Arabic diacritics and tatweel don't change meaning for search purposes.
const AR_NOISE = /[ً-ٰٟـ]/g;

export function tokens(text) {
  return (String(text || "").toLowerCase().replace(AR_NOISE, "").match(WORD) || []);
}

function score(queryTerms, text) {
  const toks = tokens(text);
  if (!toks.length) return [0, -1];
  const counts = new Map();
  for (const t of toks) counts.set(t, (counts.get(t) || 0) + 1);
  let s = 0, covered = 0;
  for (const term of queryTerms) {
    let c = counts.get(term) || 0;
    // prefix match for longer terms ("automat" → "automation") at half weight
    if (!c && term.length >= 4) for (const [k, v] of counts) if (k.startsWith(term)) c += v * 0.5;
    if (c) { covered++; s += 1 + Math.log(Math.max(1, c)); }
  }
  if (!covered) return [0, -1];
  s *= 1 + 0.5 * (covered - 1);
  s /= 1 + Math.log(1 + toks.length / 50);
  const lower = String(text).toLowerCase();
  const positions = queryTerms.map((t) => lower.indexOf(t)).filter((p) => p >= 0);
  return [s, positions.length ? Math.min(...positions) : -1];
}

export function snippet(text, pos, width = 220) {
  const t = String(text || "");
  if (pos < 0) return t.slice(0, width) + (t.length > width ? "…" : "");
  const start = Math.max(0, pos - Math.floor(width / 3));
  const end = Math.min(t.length, start + width);
  return (start > 0 ? "…" : "") + t.slice(start, end).trim() + (end < t.length ? "…" : "");
}

/**
 * docs: [{ id, type, title, body, ...extra }] → ranked hits with snippets.
 */
export function rank(query, docs, limit = 30) {
  const terms = [...new Set(tokens(query))];
  if (!terms.length) return [];
  const hits = [];
  for (const d of docs) {
    const [s, pos] = score(terms, `${d.title}\n${d.body}`);
    if (s <= 0) continue;
    const bodyPos = pos - (d.title.length + 1);
    hits.push({ ...d, score: Math.round(s * 1000) / 1000, snippet: snippet(d.body || d.title, bodyPos) });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Wrap each query term occurrence for highlighting: returns [{text, hit}] parts. */
export function highlight(text, query) {
  const terms = [...new Set(tokens(query))].filter((t) => t.length > 1);
  if (!terms.length) return [{ text, hit: false }];
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "giu");
  return String(text).split(re).map((part, i) => ({ text: part, hit: i % 2 === 1 }));
}
