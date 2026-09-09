import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
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
