import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: { tsgo: true },
    exports: true,
    clean: true,
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
