"""
Publish the built app (frontend/dist) to the Hugging Face Space as a free,
static Space. Run from the project root after `npm run build`:

    python scripts/deploy_hf_space.py

Requires `huggingface_hub` and a logged-in account (`hf auth login`), or a
write token in the `HF_TOKEN` environment variable (how the deploy workflow
runs it).
"""
from pathlib import Path

from huggingface_hub import HfApi

SPACE = "Elisha622/omnicore-ai"
ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "frontend" / "dist"

SPACE_CARD = """---
title: OmniCore AI
emoji: ⚡
colorFrom: green
colorTo: indigo
sdk: static
app_file: index.html
pinned: true
header: mini
fullWidth: true
hf_oauth: true
hf_oauth_scopes:
  - inference-api
hf_oauth_expiration_minutes: 43200
short_description: Enterprise AI workspace — instant, free, installable
tags:
  - transformers.js
  - webgpu
  - pwa
  - qwen3
  - whisper
---

# OmniCore AI

An enterprise multimodal AI workspace — chat, document intelligence, computer
vision, speech, agents, churn prediction, search, automation and
trade-regulation research. **Nothing to download:** sign in once with your
free Hugging Face account and the AI (GPT-OSS 20B for text, Qwen3-VL for
images) runs on Hugging Face's servers — no API key. Or switch to a fully
private mode where open models (Qwen3, Qwen3.5, Whisper) run on your device.
Installable as an app. Your workspace lives in your browser, never on a server.

Full-screen app: https://elisha622-omnicore-ai.static.hf.space

Source code: https://github.com/paulelisha500-ops/omnicore-ai
"""


def main():
    if not (DIST / "index.html").exists():
        raise SystemExit("Build first: cd frontend && npm run build")
    (DIST / "README.md").write_text(SPACE_CARD, encoding="utf-8")
    api = HfApi()
    api.create_repo(SPACE, repo_type="space", space_sdk="static", exist_ok=True)
    commit = api.upload_folder(
        repo_id=SPACE, repo_type="space", folder_path=str(DIST),
        commit_message="Deploy OmniCore AI static build",
        delete_patterns=["assets/*"],  # drop stale hashed bundles from earlier builds
    )
    print(commit)
    print(f"https://huggingface.co/spaces/{SPACE}")


if __name__ == "__main__":
    main()
