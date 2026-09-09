import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    exports: true,
    clean: true,
    entry: ["src/index.ts", "src/deterministic.ts"],
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
