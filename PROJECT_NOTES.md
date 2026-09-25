# OmniCore AI — Project Notes

This is the honest map of what's in this build: what's genuinely functional,
what's a polished representative UI, and why each call was made. Keep this
open next to the demo when you're explaining it — every claim below is
something you can defend if someone pushes on it.

## Files in this delivery

This started as a Claude.ai artifact (a single-file React preview) plus a
separate backend reference zip. It's now one project you run with Docker —
see the root `README.md` for the actual setup steps (Windows/VS Code/Docker
Desktop). Layout:

| Path | What it is |
|---|---|
| `frontend/src/App.jsx` | The full 12-module frontend — now calling this project's own backend instead of Anthropic directly. |
| `frontend/src/LandingPage.jsx` | The pre-login marketing page (see "The pre-login landing page" section below). |
| `frontend/src/magicui.jsx` | Magic UI components (MIT) adapted to this project's tokens — see "Magic UI layer" below. |
| `frontend/tailwind.config.js` | Tailwind with **Preflight disabled** — it exists only to power `magicui.jsx`, never to restyle the app globally. |
| `backend/app/` | A real, running FastAPI backend, including `routers/ai.py` (the endpoint the frontend actually calls) and the real trained model under `app/ml/`. |
| `ml/train_churn_model.py` | The actual script that trained the Predictive Analytics model. Runnable end to end. |
| `docker-compose.yml`, `.devcontainer/` | Brings up frontend + backend + Postgres + Redis together; VS Code Dev Containers config. |
| `PROJECT_NOTES.md` | This file. |

## What's real vs. representative, module by module

The honest version, after the persistence and retrieval work, is: of **13
modules, 11 are genuinely functional** (live AI calls, a real trained model,
real Postgres-backed state, or live retrieval), **1 is partially live**
(Recommendation Engine — real top panel, sample catalogue tabs), and **1 is
sample data** (Integration Hub, which needs real vendor OAuth credentials).
Don't claim more than this list supports; it doesn't need embellishing.

Two limits worth stating plainly rather than burying: an automation "run" is
a recorded execution, not a dispatched side effect (no job queue yet), and
the Trade module's AI summary is opt-in because CPU-hosted generation on a
modest host is measured at ~2.4 tokens/sec — the citations are the fast,
substantive part.

| # | Module | Status | How |
|---|---|---|---|
| 01 | AI Chat Assistant | **Live** | Real calls to your configured LLM (Ollama by default, Claude if you switch providers), now with real web search via self-hosted SearXNG — the model decides when to search, not a keyword trigger. Add text snippets and the assistant also grounds answers in them — simple in-memory RAG (no vector DB, just prompt-stuffing, which is honest and fine at this scale). |
| 02 | Computer Vision | **Live** | Upload an image, the vision model (`qwen2.5vl:7b` on Ollama, or Claude's vision if switched) analyzes scene/objects/text. Framed honestly as free-form visual understanding, *not* pixel-level bounding boxes — that needs a dedicated YOLO/SAM model, which is a different (offline, GPU-trained) build. |
| 03 | Document Intelligence | **Live** | Upload an image or paste text; the model summarizes, extracts key points, answers follow-ups. |
| 04 | Speech AI | **Live** | Real browser APIs — `SpeechRecognition` for live mic transcription, `speechSynthesis` for text-to-speech. Both run with zero backend. Transcript summarization calls your configured LLM. Chrome/Edge only (a documented Web Speech API limitation, not a bug). |
| 05 | AI Agent Platform | **Live — all 8** | Every agent runs a live call with its own tailored system prompt (each card expands into a mini run panel). The Reporting Agent is genuinely cross-module — it summarizes this session's real stats (documents, chats, activity log). |
| 06 | Predictive Analytics | **Live — real trained model** | See the full section below. Now includes a genuine "try a live prediction" form that calls `POST /api/predict/churn` on the real backend — not a client-side approximation. This is the one to lead with in an interview. This one's pure sklearn — unaffected by which LLM provider you pick. |
| 07 | Recommendation Engine | **Live (partially)** | The top panel is a real, live call that reads this session's actual knowledge base/chat/activity and generates grounded recommendations. The tabs below stay sample data on purpose — a real recommender needs behavioral logs a fresh session doesn't have, and faking that would be dishonest. |
| 08 | Enterprise Search | **Live** | Ranking moved server-side to `POST /api/search`: term-frequency scoring with a multi-term coverage bonus and length normalisation, over an Arabic-aware tokeniser. Searches the session corpus *and* the live web via SearXNG, with real URLs. The invented `SAMPLE_SEARCH_RECORDS` rows are gone. |
| 09 | Automation Platform | **Live** | Rules are real Postgres rows (`automations`), scoped per user. Create / toggle / run / delete all round-trip to `/api/workspace/automations` and survive a refresh; the `runs` counter increments a real column. One honest limit remains: a "run" is a recorded execution, not a dispatched side effect — no job queue behind it yet. |
| 10 | Executive Dashboard | **Live** | The 14-day trend is now computed from persisted `activity_events` via `GET /api/workspace/trend` — the hardcoded array is gone. Days with no activity return zero rather than being omitted, so a fresh install honestly shows a flat line. The automations KPI reads the real row count instead of a literal `"7"`. |
| 11 | Security & Governance | **Live** | The audit log is platform-wide and persisted, and `GET /api/workspace/audit` is gated by `require_admin`: an Analyst token gets **403** from the API, not merely a hidden nav item (verified: admin 200 / analyst 403 / anonymous 401). Before this, `require_admin` existed but was wired to nothing, so role separation was presentation-only. RBAC table and control statuses remain illustrative. |
| 12 | Integration Hub | Sample data | Connect/disconnect toggles work (local state); no real OAuth flows, which would need real vendor developer accounts. Now says so directly in the product (not just in these notes) — an honesty banner explains what the toggle actually does. |
| 13 | Trade & Regulatory Intelligence | **Live** | Retrieval-grounded answers on cross-border trade law for UAE / GCC / EU / USA / China / WTO. Holds *no* legal text: a registry of verified official domains, live retrieval, then classification of each hit as OFFICIAL (government/treaty domain) or UNOFFICIAL, official ranked first and cited. Refuses to answer ungrounded rather than inventing a tariff rate. A curated directory of 14 hand-verified official pages always renders, so a throttled search degrades to "here are the right authorities" rather than an empty screen. |

## Your own LLM — what's actually running

By default, every AI-powered module above is served by **models you host
yourself** via Ollama, not a third-party API:

- **Text** (chat, summarization, research, insights): `qwen3:4b` by
  default (runs on CPU, zero setup — see root `README.md` section 4) —
  chosen for strong multilingual instruction-following at a size that's
  actually usable without a GPU, which matters here since the whole
  platform is bilingual EN/AR. Bump to `qwen3:14b` once you've moved to a
  GPU (`README.md` section 6) for noticeably better answers.
- **Vision** (Computer Vision, image-based Document Intelligence):
  `qwen2.5vl:7b` — chosen specifically because it documents strong
  multilingual OCR including Arabic, matching this platform's actual need
  rather than a generic vision model pick.

Both are served through `backend/app/routers/ai.py`, which also still
supports routing to Claude instead (`LLM_PROVIDER=anthropic` in `.env`) —
useful for comparing output quality, or as a fallback if a demo needs to
run somewhere without GPU access. The frontend never knows which one
answered; it only ever calls `POST /api/ai/complete`.

**Honest trade-off to mention if asked:** a self-hosted 7-14B model will
not match Claude's quality on complex reasoning — that's the real cost of
"my own LLM" versus a frontier hosted API, and it's worth being upfront
about rather than implying parity. What you get instead: zero per-token
cost, full data control (nothing leaves your own infrastructure), and — for
a portfolio — genuine infrastructure experience (GPU provisioning, model
serving, quantization trade-offs) that "I called an API" doesn't
demonstrate.

## A real bug, and how it was actually found (good interview material)

Early self-hosted testing showed Chat/Documents/Vision as "not working" —
slow, and Document Intelligence/Computer Vision specifically returned
garbled results instead of clean summaries. Root cause: Ollama auto-enables
Qwen3's "thinking" mode (extended reasoning before the real answer) unless
you explicitly pass `"think": false` as a **top-level** field in the
`/api/chat` request — not nested in `options`, which is the easy mistake to
make and exactly what the first version of `ai.py` did (i.e., didn't set it
at all). Two consequences from one cause: responses got noticeably slower
(more tokens to generate on CPU), and the Document/Vision modules broke
outright, because their prompts demand raw JSON and a `<think>...</think>`
block in front of it fails `JSON.parse`.

Fix has two layers, on purpose: `think: false` on every Ollama request
(the real fix), plus a regex that strips any `<think>...</think>` block
that leaks through anyway (a defensive backstop — several open Ollama/Qwen3
version combinations have shipped this flag not fully working, per
upstream issue trackers). Verified against a fake Ollama server built
specifically to simulate a model leaking thinking tags despite the flag,
confirming the parser survives it either way.

## Authentication — now real, backed by Postgres

Login is real: bcrypt-hashed passwords, a signed JWT, checked against an
actual `users` table in Postgres (the first thing in this project to
genuinely use it — previously provisioned but unused, per
`backend/README.md`'s honesty table). Two seeded demo accounts:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Platform Admin |
| `analyst` | `analyst123` | Analyst |

Security & Governance is gated behind the Platform Admin role — log in as
`analyst` and it shows a real permission-denied state instead of just
being hidden. **Scope boundary worth naming if asked:** only the login
flow itself is backend-verified end to end; the other API routes
(`/api/ai/complete`, `/api/predict/churn`, etc.) don't yet require a valid
token to call directly. Extending Bearer-token auth to every route is the
natural next step, not yet done here — said plainly rather than implied.

## The multi-country policy/compliance idea — why it isn't built as asked

One ask was an AI that ingests different nations' laws, flags contradictions
between them, and tells you where a business can operate cleanly — "fine
-tuned," "accurate." Worth being straight about why that's not in this
build: there's no clean, structured, machine-readable dataset of "the laws
of every nation" to train or ground this on, and "accurate" is a genuinely
high bar for a domain where a wrong answer has real legal/financial
consequences. Fine-tuning a small open model on whatever legal text is
findable wouldn't actually buy accuracy here — that's not what fine-tuning
does for factual/legal correctness, and an LLM confidently asserting "these
two jurisdictions' rules don't conflict" without real legal review is a bad
thing to ship, not an impressive one.

The honest version of this feature — and one that's genuinely buildable —
is a **research-starting-point tool**: given a business scenario and a list
of jurisdictions, the model identifies the *themes* worth checking (data
residency, termination notice periods, content obligations, etc.) and
clearly frames itself as a starting point for actual legal counsel, not a
ruling. That's a real, valuable, honest feature. It isn't built in this
pass — say the word and it's a contained addition (a new module or a Chat
Assistant mode), built with that framing from the start rather than
retrofitted onto something that implied more authority than it has.

## Real web search — self-hosted, no API key

The Chat Assistant and Research Agent can now genuinely search the web,
via a self-hosted SearXNG instance (`searxng` service, no external API key
— consistent with the whole point of self-hosting the LLM in the first
place). This is real tool-calling, not a keyword hack: the model itself
decides whether a question needs current information, calls a `web_search`
tool if so, the backend executes a real search and feeds the results back,
and the model answers using them — a genuine two-round-trip loop, verified
end to end against a fake server built specifically to simulate that
exchange. Document Intelligence and Computer Vision deliberately don't get
this tool — their prompts demand strict JSON output, and mixing in
tool-calling risks exactly the kind of malformed-response problem the
thinking-mode fix above already had to solve once.

## A second real bug: errors were being swallowed

Every AI-powered module had a bug where the actual error from a failed
request was thrown away and replaced with a generic, unhelpful message
("Couldn't reach the model. Please try again.") — which made the earlier
reliability issues much harder to diagnose than they needed to be, since
the real cause (a specific, already-informative backend error) never
reached the screen. Fixed across all six places it occurred: errors now
show the real `detail` message the backend actually returned.

## The "predict real-time stock markets" idea — not built, here's why

One ask was repurposing Computer Vision to predict real, live stock/job
market movements — not analyzing an uploaded image, but forecasting actual
markets in real time. This isn't built, and it's worth being direct about
why rather than shipping something that gestures at doing this without
actually being able to: reliable real-time market prediction is not a
solved problem — it's an adversarial, efficiently-priced system where
even well-resourced quantitative funds with vastly more data and compute
than this project has don't have a reliably "accurate" solution. Wiring an
LLM to confidently output "the market will do X" would produce *something*
on screen, but it would be decoration, not a real prediction — and if
anyone made an actual financial decision based on it, that's a real way to
lose real money on false confidence.

The honest, buildable version of "predictive markets" already exists in
this project in the right shape: Module 06, Predictive Analytics, which
does real, honestly-evaluated forecasting — just on a well-posed, tractable
problem (customer churn) with a real dataset, not an adversarial one like
live equity prices. The same rigor (real data, honestly reported metrics,
no invented accuracy) would apply to any *specific, well-scoped* forecasting
problem — demand forecasting, inventory, churn-adjacent business metrics —
if there's a real dataset behind it. "Predict the stock market" isn't
that; "predict X business metric from Y real data" is, and remains on
offer if there's a concrete version of it worth building.

## The Predictive Analytics model — full honesty

You asked for training data accurate to 90%. Here's what actually happened,
because the real story is more defensible than a made-up number:

**Dataset:** the real IBM Watson Telco Customer Churn dataset — 7,043 actual
customers, 21 features, fetched from IBM's own public GitHub repository
(not synthetic, not scraped from somewhere unverifiable).

**Result: 78.3% accuracy, 84.5% ROC-AUC, 62.7% F1, 68.7% recall** — not 90%
accuracy. Here's why that's the right outcome, not a shortfall:

- Only 26.5% of customers in the real data actually churn. A trivial model
  that always predicts "no churn" scores **73.5% accuracy** while catching
  zero at-risk customers — accuracy alone is a bad target on imbalanced
  data, and chasing it would produce a *worse*, not better, model.
- The model was selected by 5-fold cross-validated **F1** (not accuracy)
  across Logistic Regression, Random Forest, and XGBoost, then its decision
  threshold was tuned on a held-out **validation** split — not the test
  set, which would have been leakage — before a single, final evaluation
  on 1,409 customers the model never saw during training or tuning.
- 84.5% ROC-AUC is a genuinely strong, publishable result for this exact,
  well-studied benchmark dataset — published results on this dataset
  commonly land in a similar range.
- The top churn drivers the model found — month-to-month contracts, low
  tenure, no online security, no tech support, fiber-optic service — are
  the same drivers that show up in the published literature on this
  dataset. That consistency is itself evidence the model learned something
  real, not noise.

**If you need a number closer to 90% for a slide:** the ROC-AUC (84.5%) is
the closest honest metric, and it's normal to report it alongside accuracy
for exactly this reason. What you should not do is report 90% "accuracy"
for this task — it isn't true, and anyone who works with imbalanced
classification will ask a follow-up question that exposes it immediately.
Leading with *why* you optimized for F1/recall over raw accuracy is a
stronger interview answer than any single number.

**Reproduce it yourself:** `pip install -r backend/requirements.txt`
then `python3 ml/train_churn_model.py` from the project root (needs the
dataset — the script fetches it, or point it at your own CSV with the same
schema).

## Design system

Researched current (2026) patterns from Linear, Notion, Stripe, Vercel, and
Amplitude before building: sidebar + card grid over tab bars, 4-6 KPIs
above the fold (not more), progressive disclosure, skeleton loading states
over spinners, and — the most relevant finding — that the current
leading edge in AI-native products is dashboards that *summarize and
prioritize for the user* rather than just presenting charts. That's why
every module that can plausibly generate one has a live "AI insight" panel
(the amber sparkle element) rather than just a table.

Token system: deep-navy command rail, warm-neutral canvas, teal as the one
accent color, amber reserved *only* for AI-generated content — so amber
becomes a learnable signal ("the platform reasoned about this for you")
rather than decoration. Monospace numerals throughout, tying back to
"operating system" in the product name. Full bilingual support (English +
Arabic) with real RTL layout via CSS logical properties and the `dir`
attribute, not a translated skin bolted on afterward.

## Magic UI layer (Tailwind + motion)

`frontend/src/magicui.jsx` holds components adapted from magicui.design (MIT):
NumberTicker, BlurFade, BorderBeam, ShimmerButton, AnimatedGradientText,
DotPattern, Marquee and Ripple. Three decisions worth knowing:

**Tailwind Preflight is disabled** (`corePlugins.preflight: false`, and
`src/index.css` pulls in `components`/`utilities` but deliberately not
`base`). This codebase is ~3,600 lines of hand-authored inline styles and CSS
variables that predate Tailwind; Preflight's global reset would silently
restyle every module. Tailwind is scoped to powering these components and
nothing else — additive utilities only, no global rules.

**Upstream components were rewired to this project's tokens.** They ship as
TypeScript against shadcn tokens (`bg-background`, `text-foreground`); here
they read `var(--accent)`, `var(--red)`, `var(--maroon)` etc., so they follow
the existing theme and RTL behaviour instead of fighting it.

**Animation never invents data.** NumberTicker animates toward a value it is
handed and settles on exactly that value — verified: the landing stats land
on 84.5% / 7,043 and the dashboard KPI on 84.5, and non-numeric values (an
em-dash while a fetch is in flight) render as-is rather than animating toward
NaN. Two places where motion carries real signal rather than decoration: the
BorderBeam on module cards runs only for `status === "live"`, and the beam on
the AI insight panel runs only while the model is actually generating.

**On Next.js / Vercel:** not adopted, deliberately. Vercel is serverless and
cannot host Ollama, Postgres, Redis or SearXNG — the entire self-hosted
premise of this project. Next.js itself would also add nothing here: the app
is an authenticated client-side dashboard with no SEO surface and per-user
live data, so there is no SSR/ISR benefit to buy with a 3,600-line migration.

## The pre-login landing page

`frontend/src/LandingPage.jsx` is what a signed-out visitor sees before
`LoginScreen` — hero, a trust-stat strip, a card per module, a "roadmap"
section, an About section, and an FAQ accordion. It's intentionally on its
own red / dark-red / cream palette (`PREAUTH_TOKENS`, class `.oc-preauth`),
distinct from the teal/navy system the signed-in app uses above — that's a
deliberate scope boundary, not an oversight: the signed-in dashboard's design
system was already a considered, researched decision (see "Design system"
above), so the new front door gets its own identity rather than overwriting
it. `LoginScreen` in `App.jsx` was restyled to match this same palette so the
whole signed-out journey (landing → login) feels like one experience, with a
"Back" link returning to the landing page.

**On honesty, specifically here:** the Modules section's status badges
(Live / Live (partial) / Sample data) are pulled directly from the per-module
table earlier in this file, not softened for marketing — a "Sample data"
badge on Integration Hub sits right next to "Live" badges on other cards. The
"Where this is headed" section exists specifically to hold the bigger
enterprise-AI-OS vision (Kubernetes, Neo4j, YOLO/SAM, Whisper-class speech,
LangGraph multi-agent orchestration, a Flutter mobile app, AWS deployment) —
none of which is built — without either lying about today's build or hiding
the ambition. It's styled distinctly (dashed borders, a separate maroon band)
so it reads as "direction," not "shipped." The hero's stylized dashboard
mockup is also explicitly captioned "Illustrative UI preview — not a live
screenshot," since it's a CSS illustration, not an actual screenshot.

Fully bilingual (EN/AR) with the same RTL approach as the rest of the app.

## Running it

One command from the project root (see `README.md` for the full Windows /
VS Code walkthrough, including cloud GPU setup): `cp .env.example .env`,
point `OLLAMA_BASE_URL` at your Ollama instance, pull the two models with
`./scripts/pull-models.sh`, then `docker compose up --build`. Frontend at
`localhost:5173`, API docs at `localhost:8000/docs`. `/api/predict/churn`
(and the what-if form in Predictive Analytics) works with no LLM at all,
since it's a local sklearn model file, not an LLM call.

**On the architecture change:** the frontend used to call
`api.anthropic.com` directly, which only works inside Claude.ai's artifact
sandbox (it authenticates that call invisibly). Standalone, that call would
just fail — so `callClaude()` calls this project's own
`POST /api/ai/complete` instead. That endpoint then sits in front of a
provider abstraction: Ollama (your own model) by default, Anthropic if you
flip `LLM_PROVIDER` in `.env`. Every module using AI just calls
`callClaude(...)` unchanged, both times — first when the API key moved
server-side, again when the provider became swappable; only that one
function's internals moved, twice.

## What would come next (say this in an interview — it shows you know the gap)

1. Replace the frontend's in-memory knowledge base with the backend's real
   retrieval endpoint, backed by pgvector.
2. Give the other 7 agents in Module 05 the same live treatment as the
   Research Agent, with a shared orchestration layer (LangGraph fits the
   pattern from the original spec).
3. Wire Module 09 (Automation) to a real job queue (Celery/Redis, also in
   the original spec) so toggles trigger actual scheduled work.
4. Add a dedicated CV model (YOLO or SAM) behind Module 02 for pixel-level
   detection use cases, alongside the existing free-form vision analysis.
5. Persist the Module 11 audit log to Postgres instead of session memory.
6. Move from Ollama to vLLM for the self-hosted model once concurrent
   users matter — published benchmarks show roughly an order of magnitude
   higher throughput under load; Ollama was the right choice here for
   setup simplicity and reliability on a single demo instance, not for
   serving many simultaneous users.
