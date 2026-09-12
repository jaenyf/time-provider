import packageConfig from "../../vite.packages.config.ts";

export default {
  ...packageConfig,
  pack: {
    // oxlint-disable-next-line typescript/no-misused-spread
    ...packageConfig.pack,
    exports: { inlinedDependencies: false },
  },
};
