import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  server: {
    // Use "localhost" for local-only dev. Change to "::" for Docker / WSL
    // where the dev server must be reachable from outside the container.
    host: "localhost",
    port: 8080,
  },
  // Skip the Node polyfill plugin under Vitest: it injects a bare
  // "vite-plugin-node-polyfills/shims/buffer" import into every transformed
  // module, including source-only workspace packages like
  // `packages/shared` that live outside `frontend/`'s node_modules
  // resolution tree — that import fails to resolve under Vitest's
  // transform pipeline (though it resolves fine for `vite build`, which
  // stays in-root). Tests run in Node, which already has a real Buffer.
  plugins: [react(), ...(process.env.VITEST ? [] : [nodePolyfills({ include: ["buffer"] })])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@testflow/shared": path.resolve(__dirname, "../packages/shared/src"),
    },
  },
  build: {
    // No manualChunks. Naming recharts/radix/supabase as manual chunks forced
    // them into the entry's static import graph, so Vite emitted a
    // <link rel="modulepreload"> for each in index.html and every visitor —
    // including one landing on the marketing page, which renders no chart and
    // no Radix dialog — eagerly downloaded ~250 kB gzipped of them before
    // anything painted. Now that the routes are React.lazy (see App.tsx),
    // Rollup places each library in the lazy chunk that actually reaches it and
    // hoists genuinely shared code into a common chunk on its own, which is
    // both smaller on first load and still cached independently.
    rollupOptions: {},
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // e2e/ holds Playwright specs, run by playwright.config.ts against a real
    // browser. Vitest's default include glob picked them up too and they failed
    // on import every run — two permanently-red files that trained everyone to
    // ignore a red test suite.
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
    // Fixed dummy Supabase credentials for every test run.
    //
    // integrations/supabase/client.ts calls createClient() at module scope, so
    // ANY test that transitively imports it — including a pure-function test
    // that only wanted a helper out of a component module — throws
    // "supabaseUrl is required" when the vars are missing. Locally they never
    // are, because frontend/.env is present; CI has no .env file and gave the
    // test step no env, so tests passed on every developer machine and failed
    // only after merge. Pinning them here removes that divergence.
    //
    // Deliberately dummy rather than the real project's values: a unit test
    // must never be able to reach a live Supabase project, and every suite
    // that exercises data access mocks the client anyway.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-anon-key-not-a-real-credential",
    },
  },
});
