import { defineConfig } from "vite-plus";

const packageConfig: ReturnType<typeof defineConfig> = defineConfig({
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

export default packageConfig;
