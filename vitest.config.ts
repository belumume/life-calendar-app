import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      "node_modules/**",
      "e2e/**",
      ".solid/**",
      ".vinxi/**",
      "dist/**"
    ],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".solid/",
        ".vinxi/",
        "dist/",
        "src/entry-*.tsx",
        "e2e/"
      ]
    }
  },
  resolve: {
    alias: {
      "~": "/src"
    }
  }
});