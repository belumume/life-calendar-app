import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".solid/",
        ".vinxi/",
        "dist/",
        "src/entry-*.tsx"
      ]
    }
  },
  resolve: {
    alias: {
      "~": "/src"
    }
  }
});