# OmniCore AI — Project Notes

The honest map of how this build works, why it's built this way, and where its
limits are.

## Architecture: everything in the browser

OmniCore used to be a Docker Compose stack (FastAPI, Postgres, Redis, Ollama,
SearXNG). It now runs as a static web app with no backend at all, so it can be
hosted for free on Hugging Face Spaces and GitHub Pages. Each former server
responsibility moved into the browser:

| Was | Now |
|---|---|
| Ollama (qwen3:4b, qwen2.5vl:7b) | Online (default): Hugging Face Inference Providers after "Sign in with Hugging Face" — GPT-OSS 20B (text), Qwen3-VL 30B (images). On-device (optional): Transformers.js in a Web Worker — Qwen3 0.6B, Qwen3.5 0.8B, Whisper base. |
| Postgres | IndexedDB (`lib/db.js`), per-user rows, change feed synced across tabs. |
| JWT + bcrypt auth, Redis rate limit | PBKDF2-SHA-256 (310k iterations) via WebCrypto, 5-failure / 15-minute lockout, 24-hour sessions (`lib/auth.js`). |
| `/api/predict/churn` (joblib) | The same Random Forest exported to JSON and evaluated in JS (`lib/churn.js`). |
| SearXNG | CORS-enabled public APIs: Wikipedia, US Federal Register, GOV.UK, EU Open Data Portal (`lib/web.js`). |
| Recorded-only automation runs | A real in-app automation engine that dispatches notifications, webhooks, Slack/Discord posts and knowledge-base entries (`lib/automation.js`). |

The interface is hand-styled React with CSS variables (`styles.js`). Tailwind
is present only to power the Magic UI components in `magicui.jsx` (landing
page, KPI counters); its Preflight reset is off so it can't restyle the app.

## Several accounts on one device

Every row in IndexedDB carries an `owner`, and admin-only actions re-read the
actor's role from the database (`requireAdmin`), so a role edited in devtools
authorizes nothing. Workspace import re-owns rows to the importing user and
keeps their ids, so re-importing your own export updates rows in place. If an
id in the file already belongs to *another* account on the device, that row
is imported as a copy with a new id — and automations and activity entries
that pointed at it are rewritten to follow — so an import can never overwrite
or take over someone else's data (`importWorkspace` in `lib/data.js`).

Sign-in state (the session and the lockout counters) lives in
`localStorage`. If the browser refuses to write it — storage full, blocked, or
some private modes — it is kept in memory instead, so signing in still works
and the lockout still holds; the session then lasts only until the tab
closes. Usernames that can't exist are rejected before anything is written.

## Accessibility and layout

English and Arabic are both first-class, including right-to-left layout and
translated screen-reader labels. Animated KPI counters give assistive tech the
final value (never a "0" or a half-counted number) and don't count up in a
background tab; the system "reduce motion" setting stops all animation.
Two-column screens collapse to one column on phones, and their columns can't
be stretched by a wide child, so no screen scrolls sideways from 375px up.

## Why online AI uses "Sign in with Hugging Face"

Free, key-less public AI endpoints were tested and rejected: Pollinations'
anonymous tier answers command-line requests but refuses real browsers
(Cloudflare Turnstile token required, plus 402/500 responses). Embedding an
owner's token in a public static page would let anyone drain it. Hugging Face
OAuth on the Space is the robust option: each visitor signs in once, and
inference is billed to their own account's free monthly credit ($0.10 on free
accounts, subject to change — hundreds of short answers). When a visitor runs
out, the app says so and offers the on-device engine.

## Model choice, measured

On the development laptop (Intel integrated graphics, WebGPU):

- Qwen3.5 0.8B generated **2.3 tokens/s**.
- Qwen3 0.6B generated **6.1 tokens/s** — 2.6× faster.

Qwen3.5's hybrid linear-attention layers are slower on current WebGPU
kernels, so the default text model is Qwen3 0.6B, and Qwen3.5 loads only when
an image needs reading. Machines with a discrete GPU or Apple Silicon run all
models much faster; Settings → AI engine has a speed test and lets you pick
Qwen3.5 0.8B or 2B for text instead.

## The churn model

IBM Watson Telco Customer Churn, 7,043 real customers. Random Forest selected
by 5-fold cross-validated F1 over Logistic Regression and XGBoost; decision
threshold 0.60 tuned on a validation split. Held-out test (1,409 customers):
**78.3% accuracy, 84.5% ROC-AUC, 62.7% F1, 68.7% recall**. Only 26.5% of
customers churn, so accuracy alone is a misleading target — see the Model tab.

`ml/export_churn_model.py` copies the scaler statistics, encoder categories and
all 400 trees to JSON and verifies the export against scikit-learn
(max difference 4.9e-7). The JS evaluator casts features to float32 before
each split comparison, exactly as scikit-learn does.

## Honest limits

- **Online AI needs a Hugging Face account** and works on the Hugging Face–hosted
  app (the OAuth app belongs to the Space). Other hosts (GitHub Pages, local)
  offer a link to it, or the on-device engine.
- **Accounts are per browser.** There is no server, so an account and its data
  live on the device where they were created. Several people can share one
  device with separate accounts and roles; moving between devices uses
  workspace export/import.
- **Speed depends on hardware.** Small on-device models are quick on good GPUs
  and slower on integrated graphics or CPU. Answers stream so you see progress
  immediately.
- **Small models make mistakes.** Prompts ground answers in your documents and
  retrieved sources and forbid invented figures, but a 0.6B model can still be
  wrong. The Trade module never lets the model supply legal content — only
  summarize cited sources.
- **Blocked browser storage means a short session.** Where `localStorage`
  can't be written, sign-in works for the current tab only (see above).
- **Automations run while OmniCore is open.** A static site can't run jobs in
  the background after the tab closes.
- **Slack delivery can't be confirmed.** Slack accepts browser posts but blocks
  the browser from reading its reply, so Slack shows "sent". Discord and
  CORS-enabled webhooks show the real status.
- **Live captions are not private.** The optional "Live captions" mode uses the
  browser's speech service (Google in Chrome, Microsoft in Edge). The default
  Whisper mode is fully on-device.
- **Official sources are limited to browser-callable APIs.** US, UK and EU
  sources are retrieved live; for UAE, GCC, China and the WTO, OmniCore links
  to each authority's own site search and a hand-verified directory.
