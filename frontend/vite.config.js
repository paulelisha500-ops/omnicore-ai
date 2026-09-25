import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// host: true is what makes the Vite dev server reachable from the host
// machine's browser when running inside Docker (otherwise it only binds
// to localhost *inside* the container, which is unreachable from outside).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Docker Desktop on Windows doesn't reliably forward filesystem change
    // events across the bind mount into the container, so chokidar's default
    // fs.watch misses edits — polling is the standard workaround.
    watch: { usePolling: true, interval: 300 },
  },
});
