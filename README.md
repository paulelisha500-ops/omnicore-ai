# OmniCore AI

Enterprise multimodal AI platform — React frontend, FastAPI backend, your
own self-hosted LLM, a real trained churn-prediction model, and
Postgres/Redis, all containerized and wired together. This README is the
"get it running on Windows" guide. For what's actually real vs. sample data
inside the app, see `PROJECT_NOTES.md`.

## 1. Prerequisites (install these first)

1. **Docker Desktop for Windows** — https://www.docker.com/products/docker-desktop/
   During install, keep "Use WSL 2 instead of Hyper-V" checked (the
   installer default). After installing, **open Docker Desktop at least
   once** and make sure it says "Docker Desktop is running" before continuing.
2. **VS Code** — https://code.visualstudio.com/
3. **The "Dev Containers" extension** for VS Code — search for
   `ms-vscode-remote.remote-containers` in the Extensions panel, or install
   from https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers

That's it to get running — no GPU, no cloud account, no API key required.
(A GPU speeds things up a lot; see section 6 for moving to one later.)

## 2. Get the project onto D:\Projects

1. Extract the zip you downloaded.
2. Move the extracted folder so it ends up at exactly:
   ```
   D:\Projects\omnicore-ai
   ```
   (If `D:\Projects` doesn't exist yet, create it first.)

## 3. Configure `.env`

Inside `D:\Projects\omnicore-ai`, copy `.env.example` to a new file named
`.env` in the same folder. (In File Explorer: copy/paste `.env.example`,
rename the copy to `.env`.) The defaults inside it are already set up for
step 4 — nothing to edit yet.

## 4. Run it

```powershell
cd D:\Projects\omnicore-ai
docker compose up --build
```

First run takes a few minutes (downloading images, installing packages).
Once it settles, open a **second** terminal in the same folder (PowerShell
is fine — these are plain `docker` commands, no bash needed) and pull the
two models onto the now-running Ollama container (one-time — they persist
after this):

```powershell
docker compose exec ollama ollama pull qwen3:4b
docker compose exec ollama ollama pull qwen2.5vl:7b
```

(In WSL, Git Bash, or the VS Code dev container terminal from section 5,
you can run `./scripts/pull-models.sh` instead, which does the same thing.)

`qwen3:4b` is ~2.5GB, `qwen2.5vl:7b` is ~6GB — give it a few minutes.

Now open:

- **App:** http://localhost:3003
- **API docs:** http://localhost:8003/docs
- **Health check:** http://localhost:8003/health

(Host ports are set in `docker-compose.yml`'s `ports:` mappings — 3003/8003 here
avoid clashing with other projects that use the more common 5173/8000. Postgres
and Redis are similarly remapped to 5436 and 6382 on the host; none of this
affects the containers talking to each other, which always use the standard
ports over the internal Docker network.)

The app now requires signing in (real backend-verified login, backed by
Postgres). Two seeded demo accounts — change or remove these before this
is anything but a local demo:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Platform Admin — can also see Security & Governance |
| `analyst` | `analyst123` | Analyst |

Try the **AI Chat Assistant** module first — that's the simplest live test
of the whole chain (frontend → backend → your model). Expect replies to
take **10-60 seconds**: this is running on CPU with no GPU acceleration,
which is the trade for "completely free, zero setup." Vision-based modules
(Computer Vision, image uploads in Document Intelligence) will be slower
still — test those after you've confirmed text works, or skip straight to
section 6 if you want GPU speed before touching vision at all.

Stop everything with `Ctrl+C`, then `docker compose down`.

## 5. VS Code Dev Containers (optional, for editing code)

1. Open VS Code → `File → Open Folder…` → select `D:\Projects\omnicore-ai`.
2. Click **"Reopen in Container"** when VS Code prompts you.
   (If it doesn't appear: `Ctrl+Shift+P` → `Dev Containers: Reopen in Container`.)
3. First launch takes a few minutes — it's building the frontend, backend,
   Ollama, Postgres, and Redis containers, plus a dev-tools container that
   VS Code attaches into.
4. Open a terminal inside VS Code (`` Ctrl+` ``) — you're now *inside* the
   container, with both Python and Node available, and everything else
   already running alongside it via Docker Compose.
5. Same URLs as step 4, opened in your regular Windows browser — Docker
   Desktop forwards them automatically.

This runs the exact same containers as section 4 — it just also gives you
an editor session with the right interpreter/tooling pre-configured.

## 6. Moving to a GPU (once CPU responses feel too slow)

Section 4 proved the whole thing works. This is the same setup, just
faster — nothing about the code changes, only where Ollama runs and how
much VRAM it gets to use.

**Pick a topology:**

| | Everything on one cloud GPU box | App stays here, only Ollama moves |
|---|---|---|
| Frontend + backend | on the cloud GPU box | stay on your Windows machine |
| Ollama | same box, GPU-accelerated | on the cloud GPU box |
| `.env` setting | leave `OLLAMA_BASE_URL` at its default | `OLLAMA_BASE_URL=http://<box-ip>:11434` |
| Start command | `docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build` | `docker compose up --build` (unchanged) |
| Best for | simplest, one place to manage | keeping your fast local dev loop, only the GPU is remote |

Steps:

1. Get a cloud GPU instance (RunPod, Lambda Labs, Vast.ai, or any
   AWS/GCP/Azure GPU VM) — 16GB+ VRAM, Ubuntu with NVIDIA drivers
   pre-installed (the default template on most GPU-focused providers).
2. SSH in. Confirm the NVIDIA Container Toolkit is present:
   `docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi`
   (present on virtually all GPU cloud templates by default).
3. Get Ollama running there — either the compose service (left column:
   `docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build`)
   or standalone (right column):
   `docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama`
4. Pull models again on *that* box — GPU headroom means it's worth sizing
   up the text model too:
   ```bash
   OLLAMA_TEXT_MODEL=qwen3:14b ./scripts/pull-models.sh
   # remote box: OLLAMA_HOST=http://<box-ip>:11434 OLLAMA_TEXT_MODEL=qwen3:14b ./scripts/pull-models.sh
   ```
5. Update `OLLAMA_TEXT_MODEL=qwen3:14b` (and `OLLAMA_BASE_URL` if using the
   remote-Ollama topology) in your local `.env`, then restart:
   `docker compose down && docker compose up --build` (add the `-f
   docker-compose.gpu.yml` flag too if Ollama is running in this same
   compose file).

**⚠️ Security note:** Ollama has no built-in authentication. If that cloud
instance has a public IP with port 11434 open, *anyone* can send it
requests and run up your bill. Lock this down with one of:
- your cloud provider's firewall/security group, restricted to your own IP
- an SSH tunnel (`ssh -L 11434:localhost:11434 user@box-ip`) instead of
  exposing the port publicly at all — then use `OLLAMA_BASE_URL=http://localhost:11434`
- a reverse proxy (e.g. Caddy/Nginx) in front with basic auth

**Prefer Claude instead (or as a fallback)?** Set `LLM_PROVIDER=anthropic`
and `ANTHROPIC_API_KEY=...` in `.env` — no code changes needed, the
frontend calls the same endpoint either way.

## 7. Project layout

```
omnicore-ai/
├── .devcontainer/         VS Code Dev Containers config
├── frontend/              React + Vite app (all 12 modules)
│   └── src/
│       ├── App.jsx           the signed-in app (all 12 modules) + login screen
│       └── LandingPage.jsx   the pre-login marketing page (hero, modules, roadmap, about, FAQ)
├── backend/                FastAPI (real endpoints + the trained model)
│   └── app/
│       ├── routers/ai.py       ← the endpoint the frontend actually calls;
│       │                         routes to Ollama or Anthropic per .env
│       ├── routers/auth_router.py  ← real login, backed by Postgres
│       ├── auth.py                  ← password hashing, JWT
│       ├── db.py                    ← Postgres connection + user seeding
│       └── ml/churn_model.joblib   ← the real trained model
├── searxng/
│   └── settings.yml       self-hosted search config (real web search, no API key)
├── ml/
│   └── train_churn_model.py    the script that produced churn_model.joblib
├── scripts/
│   └── pull-models.sh           one-time model download for Ollama
├── docker-compose.yml       orchestrates all of the above (CPU by default)
├── docker-compose.gpu.yml   optional override — adds GPU passthrough
├── .env.example              copy to .env, configure your LLM provider
└── PROJECT_NOTES.md          what's real vs. sample data, honestly
```

## 8. What changed from the original Claude artifact version

The frontend was originally a single React artifact previewed inside
Claude.ai, where a direct browser call to `api.anthropic.com` is
transparently authenticated by the artifact runtime. That doesn't exist
outside Claude.ai, so running this standalone required a real change:
`callClaude()` in `App.jsx` calls this project's own backend
(`POST /api/ai/complete`) instead of any provider directly — the API key
(or self-hosted URL) lives server-side, never in the browser. That backend
endpoint sits in front of a provider abstraction (`LLM_PROVIDER` in
`.env`): **Ollama by default**, running whichever open model you've
pointed it at (CPU out of the box, GPU once you move to section 6), or
Anthropic if you switch it on. Every module that uses AI (Chat, Documents,
Vision, Speech, the Research Agent, the Dashboard insight) needed no
changes for any of this, since they all go through that one function. The
Predictive Analytics module also gained a genuine "try a live prediction"
form now that there's a real backend to call — see `PROJECT_NOTES.md` for
details.

## 9. Common issues

- **"Docker Desktop is not running"** — start Docker Desktop from the
  Windows Start menu and wait for the whale icon in the system tray to
  stop animating before running `docker compose up`.
- **Port already in use (3003 / 8003 / 5436 / 6382 / 11434)** — something
  else on your machine is using that port. Either stop it, or edit the
  left-hand side of the `ports:` mapping in `docker-compose.yml` (e.g.
  `"5174:5173"`) and use the new port in your browser.
- **AI modules return "Can't reach Ollama"** — make sure `docker compose up`
  is still running in its terminal, and that you ran `pull-models.sh` in a
  *second* terminal rather than closing the first one.
- **"Model isn't pulled yet"** — run `./scripts/pull-models.sh` (step 4).
- **Login fails right after first `docker compose up`** — Postgres can take
  a few extra seconds to finish initializing on a true first boot, and the
  backend only seeds the demo accounts once it can connect. Wait ~10s and
  try again; if it persists, `docker compose restart backend`.
- **Ollama container won't start / restarts constantly** — check Docker
  Desktop's memory allocation (Settings → Resources): `qwen3:4b` needs
  roughly 4-6GB RAM available to Docker. Raise the limit if it's set low.
- **AI modules return an error about `ANTHROPIC_API_KEY`** — this only
  happens if you set `LLM_PROVIDER=anthropic`; either add the key or switch
  back to `LLM_PROVIDER=ollama`.
- **Responses are slow** — expected on CPU (section 4). Move to section 6
  for GPU speed once you've confirmed everything works.
- **Changes to `App.jsx` don't show up** — Vite hot-reloads automatically;
  if it seems stuck, refresh the browser tab.
- **"Reopen in Container" never appears in VS Code** — press
  `Ctrl+Shift+P` → `Dev Containers: Reopen in Container` manually.


## Links

- Hugging Face: https://huggingface.co/Elisha622/omnicore-ai
