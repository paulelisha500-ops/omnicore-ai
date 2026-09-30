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
| Ollama (qwen3:4b, qwen2.5vl:7b) | Transformers.js in a Web Worker: Qwen3 0.6B (text), Qwen3.5 0.8B (images), Whisper base (speech). WebGPU when available, WebAssembly otherwise. |
| Postgres | IndexedDB (`lib/db.js`), per-user rows, change feed synced across tabs. |
| JWT + bcrypt auth, Redis rate limit | PBKDF2-SHA-256 (310k iterations) via WebCrypto, 5-failure / 15-minute lockout, 24-hour sessions (`lib/auth.js`). |
| `/api/predict/churn` (joblib) | The same Random Forest exported to JSON and evaluated in JS (`lib/churn.js`). |
| SearXNG | CORS-enabled public APIs: Wikipedia, US Federal Register, GOV.UK, EU Open Data Portal (`lib/web.js`). |
| Recorded-only automation runs | A real in-app automation engine that dispatches notifications, webhooks, Slack/Discord posts and knowledge-base entries (`lib/automation.js`). |

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
