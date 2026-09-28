import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    server: {
      deps: {
        // Workspace packages resolve to packages/*/dist, outside node_modules, so Vite's module runner
        // would transform them and route every cross-chunk call through an export getter.
        // Hand them to Node, as it already does for sinon and jest, so the comparison stays fair.
        external: [/\/packages\/[^/]+\/dist\//],
      },
    },
  },
});
