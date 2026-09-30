/* Audio helpers for speech-to-text: decode any browser-playable file to the
   16 kHz mono Float32 samples Whisper expects, and record from the microphone. */

export async function decodeTo16k(blob) {
  const buf = await blob.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  let decoded;
  try {
    decoded = await ctx.decodeAudioData(buf.slice(0));
  } catch {
    const e = new Error("Couldn't decode that audio file. Try MP3, WAV, M4A, OGG or WebM.");
    e.ar = "تعذّر فك ترميز الملف الصوتي. جرّب MP3 أو WAV أو M4A أو OGG أو WebM.";
    throw e;
  } finally {
    ctx.close?.();
  }
  const frames = Math.ceil(decoded.duration * 16000);
  const off = new OfflineAudioContext(1, Math.max(1, frames), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return { samples: rendered.getChannelData(0), seconds: decoded.duration };
}

/** Microphone recorder built on MediaRecorder. */
export async function startRecorder() {
  if (!navigator.mediaDevices?.getUserMedia) {
    const e = new Error("This browser can't access a microphone.");
    e.ar = "هذا المتصفح لا يستطيع الوصول إلى الميكروفون.";
    throw e;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start(1000);
  const started = Date.now();
  return {
    started,
    stop: () => new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      };
      rec.stop();
    }),
    cancel: () => { try { rec.stop(); } catch { /* already stopped */ } stream.getTracks().forEach((t) => t.stop()); },
  };
}

export const hasWebSpeech = () => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
