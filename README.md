# OmniCore AI

An enterprise multimodal AI workspace — chat, document intelligence, computer
vision, speech, AI agents, churn prediction, enterprise search, automation,
integrations and trade-regulation research. **Open it and it works:** no
server to run, no Docker, no model download, no API key. Sign in once with a
free Hugging Face account and the AI runs on Hugging Face's servers, or switch
to a fully private on-device mode. Installable as an app.

**Live app**

- Hugging Face Space: https://huggingface.co/spaces/Elisha622/omnicore-ai
- GitHub Pages: https://paulelisha500-ops.github.io/omnicore-ai/

## What's inside

| Module | What it does |
|---|---|
| Executive Dashboard | KPIs, a 14-day activity trend and module usage computed from your real activity, plus an on-demand AI insight. |
| AI Chat Assistant | Saved conversations with streaming answers, grounded in your knowledge base (with citations), optional Wikipedia lookup, image questions. |
| Document Intelligence | PDF, Word, text, Markdown, CSV, JSON, HTML, XML, RTF or a photo of a page → summary, key points, document type and Q&A. Long documents are summarized part by part; scanned pages are read by the vision model. |
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

Everything is bilingual (English and Arabic, with full right-to-left layout,
including screen-reader labels), has light and dark themes, works from 375px
phones up, and honours the system "reduce motion" setting.

## How it works

- **Online AI (default).** "Sign in with Hugging Face" (OAuth on the Space,
  `inference-api` scope) gives the app a token for
  [Inference Providers](https://huggingface.co/docs/inference-providers):
  **GPT-OSS 20B** for text and **Qwen3-VL 30B** for images, answering in about
  a second. Usage is billed to each visitor's own Hugging Face account, whose
  free monthly credit covers everyday use. Nothing downloads.
- **On-device AI (optional, private).** Settings → AI engine → On this
  device: [Transformers.js](https://huggingface.co/docs/transformers.js) runs
  Qwen3 0.6B (text), Qwen3.5 (images) and Whisper (speech) in a Web Worker
  with WebGPU, after a one-time download. Nothing you type leaves the device.
- **Your data stays local.** Accounts, documents, chats, automations and
  history live in the browser's IndexedDB. Export/import/erase are in Settings.
  Importing never touches another account's data on the same device.
- **Installable app.** It's a Progressive Web App: use "Install app" on the
  landing page or in the app's top bar (or Share → Add to Home Screen on
  iPhone).
- **Real churn model.** `ml/export_churn_model.py` exports the trained
  scikit-learn pipeline to `frontend/public/models/churn-forest.json`; the
  browser evaluator matches scikit-learn's `predict_proba` to within 1e-6.

### Requirements

Any current browser. Online AI needs a free Hugging Face account (one-click
sign-in) and works on the Hugging Face–hosted app. On-device AI is fastest
with a WebGPU-capable GPU.

## Run it locally

```bash
cd frontend
ONNXRUNTIME_NODE_INSTALL=skip npm install
npm run dev
```

`ONNXRUNTIME_NODE_INSTALL=skip` stops a Transformers.js dependency from
downloading ONNX Runtime's Node binaries, which the browser app never uses
(and which fails behind restrictive networks). Then open http://localhost:5173. Build a production bundle with `npm run build`
(output in `frontend/dist`).

## Deploy

Every push to `main` that touches the app is built and published to both hosts
by `.github/workflows/deploy.yml`; pull requests are built but not published.
The Space upload needs one repository secret, `HF_TOKEN` (a Hugging Face token
with write access to the Space); without it the workflow still publishes to
GitHub Pages and skips the Space with a warning.

To publish by hand instead, build once with `cd frontend && npm run build`,
then from the project root:

- **GitHub Pages:** `bash scripts/deploy_gh_pages.sh` publishes
  `frontend/dist` to the `gh-pages` branch (Pages source: `gh-pages`, `/`).
- **Hugging Face Space:** `python scripts/deploy_hf_space.py` (needs
  `hf auth login`, or `HF_TOKEN` in the environment).

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
  InstallButton.jsx    "Install app" button (PWA)
  ui.jsx, styles.js    shared components and the app's CSS
  magicui.jsx          Magic UI components (Tailwind + Motion) for the landing page and KPIs
  i18n.js              shared English/Arabic strings and navigation
  modules/             one file per screen
  lib/                 ai (worker + client), cloud (online AI), hfauth
                       (Sign in with Hugging Face), db, auth, data, bus,
                       search, web, docs, churn, automation, integrations,
                       trade, audio, install
frontend/public/       PWA manifest, service worker, icons, churn model JSON
ml/                    churn model training + export
scripts/               GitHub Pages and Hugging Face Space deploy
.github/workflows/     build pull requests; build and publish main
```

See `PROJECT_NOTES.md` for design decisions and honest limits.
