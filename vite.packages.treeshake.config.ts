import packageConfig from "./vite.packages.config.ts";

export default {
  ...packageConfig,
  pack: {
    // oxlint-disable-next-line typescript/no-misused-spread
    ...packageConfig.pack,
    entry: ["src/index.ts", "src/deterministic.ts"],
    format: ["esm", "cjs"],
    // Addons also export their addon as default; keep it on `.default` in CJS rather than warn.
    outputOptions: { exports: "named" },
  },
};
