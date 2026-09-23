import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    exports: true,
    clean: true,
    entry: ["src/index.ts", "src/deterministic.ts"],
    format: ["esm", "cjs"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  resolve: {
    tsconfigPaths: true,
  },
});
