import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

// base: "./" — every asset URL is relative, so the same build works at a
// domain root (Hugging Face Spaces) and under a sub-path (GitHub Pages
// serves this repo at /omnicore-ai/). Routing is hash-based for the same reason.
// Transformers.js loads ONNX Runtime's WebAssembly from its CDN at runtime, so
// the copy Vite would otherwise bundle (27 MB) is never requested. Drop it.
const dropUnusedWasm = {
  name: "drop-unused-ort-wasm",
  generateBundle(_, bundle) {
    for (const name of Object.keys(bundle)) if (name.endsWith(".wasm")) delete bundle[name];
  },
};

export default defineConfig({
  base: "./",
  plugins: [react(), dropUnusedWasm],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  worker: { format: "es" },
  optimizeDeps: {
    // Transformers.js ships its own WASM/worker plumbing; pre-bundling it breaks that.
    exclude: ["@huggingface/transformers"],
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Only React is pinned to its own long-lived chunk. Everything else is
        // left to Rollup so heavy libraries (charts, pdf.js, mammoth) stay in
        // the lazy chunks of the screens that use them.
        manualChunks(id) {
          if (/node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return "react";
        },
      },
    },
  },
  server: { host: true, port: 5173 },
});
