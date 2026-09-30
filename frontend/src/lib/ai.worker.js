/* ============================================================================
   On-device AI worker.

   Runs every model off the main thread so the interface never stutters while
   a model is thinking:
     • a text model (Qwen3 0.6B by default — the fastest to respond), used for
       chat, summaries, agents and every other text task;
     • a vision-language model (Qwen3.5), loaded only when an image needs
       reading — scene analysis, OCR, scanned documents;
     • Whisper, for speech-to-text.

   WebGPU is used when the browser exposes it (fast); otherwise WebAssembly on
   the CPU. Weights stream from the Hugging Face Hub once and are then served
   from the browser's Cache Storage. At most two language models stay resident.
   ============================================================================ */
import {
  env, AutoTokenizer, AutoModelForCausalLM, AutoProcessor, Qwen3_5ForConditionalGeneration, RawImage,
  TextStreamer, InterruptableStoppingCriteria, pipeline,
} from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

// Per-model load settings. "text" models use a tokenizer + causal LM; "vlm"
// models use a processor (tokenizer + image pre-processing) + a vision-language model.
const SPECS = {
  "onnx-community/Qwen3-0.6B-ONNX": { kind: "text", dtype: { f16: "q4f16", gpu: "q4", cpu: "q8" } },
  "onnx-community/Qwen3.5-0.8B-ONNX": {
    kind: "vlm",
    dtype: {
      f16: { embed_tokens: "q4f16", vision_encoder: "fp16", decoder_model_merged: "q4f16" },
      gpu: { embed_tokens: "q4", vision_encoder: "q4", decoder_model_merged: "q4" },
      cpu: { embed_tokens: "q4", vision_encoder: "q4", decoder_model_merged: "q4" },
    },
  },
  "onnx-community/Qwen3.5-2B-ONNX": {
    kind: "vlm",
    dtype: {
      f16: { embed_tokens: "q4f16", vision_encoder: "fp16", decoder_model_merged: "q4f16" },
      gpu: { embed_tokens: "q4", vision_encoder: "q4", decoder_model_merged: "q4" },
      cpu: { embed_tokens: "q4", vision_encoder: "q4", decoder_model_merged: "q4" },
    },
  },
};

let caps = null;
const models = new Map();   // id -> { id, kind, tokenizer, processor, model, device, usedAt }
const loading = new Map();  // id -> Promise
let asr = null;
const stopper = new InterruptableStoppingCriteria();
let queue = Promise.resolve();

const post = (msg) => self.postMessage(msg);

async function capabilities() {
  if (caps) return caps;
  caps = { webgpu: false, f16: false, adapter: "" };
  try {
    if (self.navigator?.gpu) {
      const adapter = await self.navigator.gpu.requestAdapter();
      if (adapter) {
        caps.webgpu = true;
        caps.f16 = adapter.features.has("shader-f16");
        caps.adapter = adapter.info?.description || adapter.info?.vendor || "";
      }
    }
  } catch { /* no usable GPU: fall through to WASM */ }
  return caps;
}

/* Aggregate per-file progress events into one overall number. */
function progressTracker(task, id) {
  const files = new Map();
  return (p) => {
    if (p.status === "progress" && p.file) files.set(p.file, { loaded: p.loaded || 0, total: p.total || 0 });
    else if (p.status === "done" && p.file && files.has(p.file)) { const f = files.get(p.file); files.set(p.file, { loaded: f.total, total: f.total }); }
    else if (p.status === "initiate" && p.file && !files.has(p.file)) files.set(p.file, { loaded: 0, total: 0 });
    let loaded = 0, total = 0;
    for (const f of files.values()) { loaded += f.loaded; total += f.total; }
    post({ type: "progress", task, id, loaded, total });
  };
}

async function evictIfNeeded(keepId) {
  if (models.size < 2) return;
  const victim = [...models.values()].filter((m) => m.id !== keepId).sort((a, b) => a.usedAt - b.usedAt)[0];
  if (victim) {
    try { await victim.model.dispose(); } catch { /* ignore */ }
    models.delete(victim.id);
    post({ type: "unloaded", id: victim.id });
  }
}

async function load(id, preferCpu = false) {
  if (models.has(id)) return models.get(id);
  if (loading.has(id)) return loading.get(id);
  const spec = SPECS[id];
  if (!spec) throw new Error(`Unknown model ${id}`);
  const p = (async () => {
    await evictIfNeeded(id);
    const c = await capabilities();
    const attempt = async (device) => {
      const onProgress = progressTracker("llm", id);
      const dtype = device === "webgpu" ? (c.f16 ? spec.dtype.f16 : spec.dtype.gpu) : spec.dtype.cpu;
      if (spec.kind === "text") {
        const tokenizer = await AutoTokenizer.from_pretrained(id, { progress_callback: onProgress });
        const model = await AutoModelForCausalLM.from_pretrained(id, { dtype, device, progress_callback: onProgress });
        return { id, kind: "text", tokenizer, model, device };
      }
      const processor = await AutoProcessor.from_pretrained(id, { progress_callback: onProgress });
      const model = await Qwen3_5ForConditionalGeneration.from_pretrained(id, { dtype, device, progress_callback: onProgress });
      return { id, kind: "vlm", processor, tokenizer: processor.tokenizer, model, device };
    };
    const device = c.webgpu && !preferCpu ? "webgpu" : "wasm";
    const isNetwork = (e) => /network|fetch|load failed|http|timed? ?out|connection|abort/i.test(String(e?.message || e));
    // Network hiccups are retried on the same device; only a genuine GPU
    // failure (e.g. a GPU that advertises WebGPU but can't allocate these
    // buffers) falls back to the much slower CPU path.
    const withRetry = async (dev) => {
      for (let i = 0; ; i++) {
        try { return await attempt(dev); } catch (e) {
          if (!isNetwork(e) || i >= 2) throw e;
          post({ type: "notice", message: "Connection interrupted — retrying the download…" });
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
    };
    let m;
    try {
      m = await withRetry(device);
    } catch (e) {
      if (device !== "webgpu" || isNetwork(e)) throw e;
      post({ type: "notice", message: `WebGPU couldn't run this model (${e.message || e}). Using the CPU instead.` });
      m = await withRetry("wasm");
    }
    // Warm-up: the first WebGPU run compiles shaders — pay that now, not on the user's first question.
    try {
      const inputs = await encode(m, [{ role: "user", content: "Hi" }], null);
      await m.model.generate({ ...inputs, max_new_tokens: 1, do_sample: false });
    } catch { /* best effort */ }
    m.usedAt = Date.now();
    models.set(id, m);
    return m;
  })();
  loading.set(id, p);
  try { return await p; } finally { loading.delete(id); }
}

async function toImage(blob, maxSide) {
  let img = await RawImage.fromBlob(blob);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  // Qwen's vision tower works in 32-px patches; snap to that grid.
  const w = Math.max(64, Math.round((img.width * scale) / 32) * 32);
  const h = Math.max(64, Math.round((img.height * scale) / 32) * 32);
  if (w !== img.width || h !== img.height) img = await img.resize(w, h);
  if (img.channels !== 3) img = img.rgb();
  return img;
}

async function encode(m, conv, images) {
  if (m.kind === "text") {
    return m.tokenizer.apply_chat_template(conv, { add_generation_prompt: true, enable_thinking: false, return_dict: true });
  }
  const prompt = m.processor.apply_chat_template(conv, { add_generation_prompt: true, enable_thinking: false });
  return images ? m.processor(prompt, images.length === 1 ? images[0] : images) : m.processor(prompt);
}

const stripThink = (s) => String(s || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^\s*<\/?think>\s*/gi, "").trim();

async function generate({ id, modelId, system, messages, images = [], maxTokens = 512, temperature = 0.7, topP = 0.8, imageMaxSide = 640 }) {
  const m = await load(modelId);
  m.usedAt = Date.now();
  const conv = [];
  if (system) conv.push({ role: "system", content: system });
  for (const msg of messages) conv.push({ role: msg.role, content: String(msg.content ?? "") });
  let pix = null;
  if (images.length) {
    if (m.kind !== "vlm") throw new Error("This model can't read images.");
    const last = conv[conv.length - 1];
    last.content = [...images.map(() => ({ type: "image" })), { type: "text", text: last.content }];
    const maxSide = m.device === "webgpu" ? imageMaxSide : Math.min(imageMaxSide, 512);
    pix = await Promise.all(images.map((b) => toImage(b, maxSide)));
  }
  const inputs = await encode(m, conv, pix);
  const promptTokens = inputs.input_ids.dims.at(-1);

  let streamed = "";
  let tokens = 0;
  let firstAt = 0;
  const started = performance.now();
  const streamer = new TextStreamer(m.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (t) => { streamed += t; post({ type: "token", id, text: t }); },
    token_callback_function: () => { if (!tokens) firstAt = performance.now(); tokens++; },
  });
  stopper.reset();
  const sample = temperature > 0;
  const out = await m.model.generate({
    ...inputs,
    max_new_tokens: maxTokens,
    do_sample: sample,
    ...(sample ? { temperature, top_p: topP, top_k: 20 } : {}),
    repetition_penalty: 1.05,
    streamer,
    stopping_criteria: stopper,
  });
  let text;
  try {
    text = m.tokenizer.batch_decode(out.slice(null, [promptTokens, null]), { skip_special_tokens: true })[0];
  } catch {
    text = streamed;
  }
  const end = performance.now();
  const genSecs = firstAt ? (end - firstAt) / 1000 : (end - started) / 1000;
  post({ type: "done", id, text: stripThink(text), stats: {
    tokens, seconds: (end - started) / 1000, tps: tokens > 1 ? (tokens - 1) / Math.max(genSecs, 0.001) : 0,
    firstTokenMs: firstAt ? firstAt - started : null, device: m.device, promptTokens, model: m.id,
  } });
}

async function loadASR() {
  if (asr) return asr;
  const c = await capabilities();
  const device = c.webgpu ? "webgpu" : "wasm";
  const dtype = device === "webgpu"
    ? { encoder_model: "fp32", decoder_model_merged: "q4" }
    : { encoder_model: "q8", decoder_model_merged: "q8" };
  const pipe = await pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
    device, dtype, progress_callback: progressTracker("asr", "whisper"),
  });
  asr = { pipe, device };
  return asr;
}

async function transcribe({ id, audio, language }) {
  const { pipe } = await loadASR();
  const r = await pipe(audio, {
    language: language === "ar" ? "arabic" : "english",
    task: "transcribe",
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  });
  post({ type: "done", id, text: String(r.text || "").trim() });
}

self.onmessage = (e) => {
  const msg = e.data || {};
  if (msg.type === "interrupt") { stopper.interrupt(); return; }
  if (msg.type === "caps") { capabilities().then((c) => post({ type: "caps", id: msg.id, caps: c })); return; }
  // Loads run concurrently with generation (so a vision model can download
  // while you chat); generations and transcriptions are queued one at a time.
  if (msg.type === "load") {
    (async () => {
      try {
        const c = await capabilities();
        const m = await load(msg.modelId, msg.preferCpu);
        post({ type: "ready", id: msg.id, device: m.device, caps: c });
      } catch (err) { post({ type: "error", id: msg.id, message: err?.message || String(err) }); }
    })();
    return;
  }
  queue = queue.then(async () => {
    try {
      if (msg.type === "generate") await generate(msg);
      else if (msg.type === "transcribe") await transcribe(msg);
      else if (msg.type === "unload") {
        for (const m of models.values()) { try { await m.model.dispose(); } catch { /* ignore */ } }
        models.clear();
        post({ type: "done", id: msg.id });
      }
    } catch (err) {
      post({ type: "error", id: msg.id, message: err?.message || String(err) });
    }
  });
};
