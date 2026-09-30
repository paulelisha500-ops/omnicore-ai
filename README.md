# OmniCore AI

An enterprise multimodal AI workspace that runs **entirely in your browser**.
Chat, document intelligence, computer vision, speech, AI agents, churn
prediction, enterprise search, automation, integrations and trade-regulation
research — with **no server, no Docker, no API keys**. The AI models run on
your own device (WebGPU, or the CPU as a fallback), and your data stays in your
browser.

**Live app**

- Hugging Face Space: https://huggingface.co/spaces/Elisha622/omnicore-ai
- GitHub Pages: https://paulelisha500-ops.github.io/omnicore-ai/

## What's inside

| Module | What it does |
|---|---|
| Executive Dashboard | KPIs, a 14-day activity trend and module usage computed from your real activity, plus an on-demand AI insight. |
| AI Chat Assistant | Saved conversations with streaming answers, grounded in your knowledge base (with citations), optional Wikipedia lookup, image questions. |
| Document Intelligence | PDF, Word, text, CSV, HTML or a photo of a page → summary, key points, document type and Q&A. Long documents are summarized part by part; scanned pages are read by the vision model. |
| Computer Vision | Describe a scene and its objects, read text in an image (multilingual), or ask your own question. Works with the phone camera. |
| Speech AI | Private on-device transcription with Whisper (record or upload), meeting summaries with decisions and action items, text-to-speech with voice/speed/pitch. |
| AI Agent Platform | Eight agents. Research pulls live sources and cites them, the Data Analyst profiles a CSV you attach, the Reporting Agent reads your real workspace numbers. |
| Predictive Analytics | A real scikit-learn Random Forest churn model (IBM Telco, 7,043 customers) running in the browser: live what-if predictions, risk-lowering levers, and batch scoring of whole CSV files with downloadable results. |
| Recommendation Engine | Next steps, related documents, one-click automations and at-risk customers, all derived from your activity. |
| Enterprise Search | Instant ranked search across chats, documents, meetings, analyses, agent runs and automations, with an AI answer from the results. |
| Trade & Regulatory | Live retrieval from official sources (US Federal Register, GOV.UK, EU Open Data Portal), per-authority site search, a verified directory, and strictly cited AI summaries. |
| Automation Platform | "When this happens, do that" rules on real app events and schedules — notify, post to Slack/Discord, call a webhook, open an email, or save to the knowledge base. |
| Integration Hub | Slack, Discord, custom webhooks, email and desktop notifications, each with a one-click test. |
| Security & Governance | Accounts with PBKDF2-hashed passwords, sign-in lockout, enforced roles, user management, and a filterable, exportable audit log. |

Everything is bilingual (English and Arabic, with full right-to-left layout)
and has light and dark themes.

## How it works

- **AI on your device.** [Transformers.js](https://huggingface.co/docs/transformers.js)
  runs ONNX models in a Web Worker: **Qwen3 0.6B** for text (fastest),
  **Qwen3.5** for images (downloaded the first time you analyze one) and
  **Whisper base** for speech. Each model asks before downloading, then loads
  from the browser cache. You can switch to Qwen3.5 0.8B or 2B for better
  answers in Settings → AI engine, which also has a speed test.
- **Your data stays local.** Accounts, documents, chats, automations and
  history live in the browser's IndexedDB. Export/import/erase are in Settings.
- **Only opt-in lookups leave the device:** search words sent to Wikipedia or
  official government APIs, and messages you route to your own integrations.
- **Real churn model.** `ml/export_churn_model.py` exports the trained
  scikit-learn pipeline to `frontend/public/models/churn-forest.json`; the
  browser evaluator matches scikit-learn's `predict_proba` to within 1e-6.

### Requirements

A current Chrome, Edge, Safari or Firefox. A GPU with WebGPU gives the best
speed; without it, models run on the CPU (slower, but they work). The first AI
use downloads about 590 MB; later visits load from cache.

## Run it locally

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. Build a production bundle with `npm run build`
(output in `frontend/dist`).

## Deploy

Build once with `cd frontend && npm run build`, then from the project root:

- **GitHub Pages:** `bash scripts/deploy_gh_pages.sh` publishes
  `frontend/dist` to the `gh-pages` branch (Pages source: `gh-pages`, `/`).
- **Hugging Face Space:** `python scripts/deploy_hf_space.py` (needs
  `hf auth login`).

## Retrain the churn model

```bash
python ml/train_churn_model.py      # trains and saves ml/churn_model.joblib
python ml/export_churn_model.py     # exports to the browser and verifies against sklearn
```

## Project layout

```
frontend/src/
  App.jsx              app shell: auth gate, navigation, AI status, sheets
  AuthScreen.jsx       create account / sign in
  LandingPage.jsx      public landing page
  modules/             one file per screen
  lib/                 ai (worker + client), db, auth, data, search, web,
                       docs, churn, automation, integrations, trade, audio
ml/                    churn model training + export
scripts/               Hugging Face Space deploy
```

See `PROJECT_NOTES.md` for design decisions and honest limits.
