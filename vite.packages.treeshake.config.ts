import packageConfig from "./vite.packages.config.ts";

export default {
  ...packageConfig,
  pack: {
    ...packageConfig.pack,
    entry: ["src/index.ts", "src/deterministic.ts"],
  },
};
