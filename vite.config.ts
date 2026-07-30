/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), preact()],
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "KlunqWidget",
      formats: ["iife"],
      fileName: () => "klunq-widget.js",
    },
    rollupOptions: {
      output: {
        assetFileNames: "klunq-widget.[ext]",
      },
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest-setup.ts"],
  },
});
