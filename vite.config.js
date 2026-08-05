import { defineConfig, loadEnv } from "vite";
import tailwindcss from "tailwindcss";
import react from "@vitejs/plugin-react";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
    base: "",
    define: {
      "process.env": env,
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    build: {
      sourcemap: mode === "development",
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/setupTests.ts",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        reportsDirectory: "./coverage",
        reporter: ["text", "json-summary", "lcov"],
      },
    },
  };
});
