import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // measure.ts collects garbage between rows, so a row never pays for the previous one's.
    execArgv: ["--expose-gc"],
    server: {
      deps: {
        // Workspace packages resolve to packages/*/dist, outside node_modules, so Vite's module runner
        // would transform them and route every cross-chunk call through an export getter.
        // Hand them to Node, as it already does for sinon and jest, so the comparison stays fair.
        // The baseline build gate.ts prepares is handed to Node the same way.
        external: [/\/packages\/[^/]+\/dist\//, /\/time-provider-baseline-[^/]+\//],
      },
    },
  },
});
