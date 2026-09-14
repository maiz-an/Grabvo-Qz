import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

// Read the app version straight from package.json so the footer in
// App.tsx always matches the shipped build — no manual string to
// keep in sync. `define` does a literal text substitution at build
// time, so `__APP_VERSION__` becomes e.g. `"1.0.1"` in the bundle.
const pkg = JSON.parse(
  readFileSync(path.resolve(__dirname, "package.json"), "utf-8")
) as { version: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  },
  server: {
    port: 5173,
    proxy: {
      "/digital-certificate.txt": "http://localhost:3000",
      "/sign-message": "http://localhost:3000",
      "/logo-base64": "http://localhost:3000"
    }
  }
});