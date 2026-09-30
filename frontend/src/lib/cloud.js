/* ============================================================================
   Online AI — runs on Hugging Face's servers. Nothing to download.

   Uses Hugging Face Inference Providers (router.huggingface.co, OpenAI-
   compatible, browser-callable) with the token from "Sign in with Hugging
   Face". Requests are billed to the signed-in visitor's own Hugging Face
   account, whose free monthly credit covers everyday use.

     text   → openai/gpt-oss-20b          (fastest provider)
     images → Qwen/Qwen3-VL-30B-A3B-Instruct (reads photos, scans, handwriting)

   What leaves the device: the content of that one request. Nothing is stored
   by OmniCore outside this browser.
   ============================================================================ */
import { getHFSession, invalidateHF } from "./hfauth.js";
import { downscale } from "./docs.js";

export const CLOUD = {
  endpoint: "https://router.huggingface.co/v1/chat/completions",
  textModel: "openai/gpt-oss-20b:fastest",
  visionModel: "Qwen/Qwen3-VL-30B-A3B-Instruct:fastest",
  name: "GPT-OSS 20B",
  visionName: "Qwen3-VL 30B",
  provider: "Hugging Face",
};

let current = null;
export function stopCloud() { current?.abort(); }

function error(en, ar, code) {
  const e = new Error(en); e.ar = ar; if (code) e.code = code; return e;
}
export const needsSignIn = () => error(
  "Sign in with Hugging Face to use the online AI — it's free and there's nothing to download.",
  "سجّل الدخول عبر Hugging Face لاستخدام الذكاء الاصطناعي عبر الإنترنت — مجاني ولا يحتاج إلى تنزيل.",
  "NEEDS_SIGNIN");

async function toDataUrl(blob) {
  const small = await downscale(blob, 1280);
  return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(small); });
}

/**
 * Stream a chat completion from Hugging Face. Resolves with the full answer;
 * calls onToken(text) as pieces arrive. Transient failures are retried twice.
 */
export async function cloudGenerate({ system, messages, images = [], maxTokens = 700, temperature = 0.6, onToken }) {
  const session = getHFSession();
  if (!session) throw needsSignIn();

  const msgs = [...(system ? [{ role: "system", content: system }] : []), ...messages.map((m) => ({ role: m.role, content: String(m.content ?? "") }))];
  if (images.length) {
    const last = msgs[msgs.length - 1];
    const urls = await Promise.all(images.map(toDataUrl));
    last.content = [...urls.map((url) => ({ type: "image_url", image_url: { url } })), { type: "text", text: last.content }];
  }
  const body = {
    model: images.length ? CLOUD.visionModel : CLOUD.textModel,
    messages: msgs,
    stream: true,
    max_tokens: maxTokens,
    temperature,
    ...(images.length ? {} : { reasoning_effort: "low" }),
  };

  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    current = ctrl;
    const timer = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), 120_000);
    let text = "";
    try {
      const res = await fetch(CLOUD.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        if (res.status === 401 || res.status === 403 && /token|auth|permission/i.test(detail)) {
          invalidateHF();
          throw error("Your Hugging Face sign-in has expired. Please sign in again.", "انتهت صلاحية تسجيل دخولك إلى Hugging Face. سجّل الدخول مرة أخرى.", "NEEDS_SIGNIN");
        }
        if (res.status === 402) {
          throw error("This month's free Hugging Face AI credit is used up. Switch to the on-device engine in Settings (free and unlimited), or add credit at huggingface.co/settings/billing.",
            "نفد رصيد الذكاء الاصطناعي المجاني لهذا الشهر على Hugging Face. انتقل إلى المحرك على الجهاز في الإعدادات (مجاني وغير محدود)، أو أضف رصيدًا من huggingface.co.", "NO_CREDIT");
        }
        const e = error(`The online AI returned an error (${res.status}). ${detail.replace(/<[^>]+>/g, "").slice(0, 160)}`, `أعاد الذكاء الاصطناعي عبر الإنترنت خطأً (${res.status}).`);
        e.retryable = res.status === 429 || res.status >= 500;
        throw e;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta;
            // `reasoning` deltas are the model thinking out loud — not shown.
            if (delta?.content) { text += delta.content; onToken?.(delta.content); }
          } catch { /* keep-alive or partial line */ }
        }
      }
      return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    } catch (e) {
      if (e?.name === "AbortError" && ctrl.signal.reason?.name !== "TimeoutError") return text.trim(); // Stop pressed
      const retryable = e.retryable || e instanceof TypeError || ctrl.signal.reason?.name === "TimeoutError";
      if (!retryable || attempt >= 2 || text) {
        if (e instanceof TypeError) throw error("Couldn't reach the online AI. Check your internet connection.", "تعذّر الوصول إلى الذكاء الاصطناعي عبر الإنترنت. تحقّق من اتصالك.");
        throw e;
      }
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
      if (current === ctrl) current = null;
    }
  }
}
