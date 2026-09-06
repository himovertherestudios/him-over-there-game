import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // three.js is large and changes far less often than game/UI code, so
        // keeping it in its own chunk means a returning player's browser can
        // reuse the cached copy across deploys that don't touch it.
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "vendor-three";
        },
      },
    },
  },
}));
