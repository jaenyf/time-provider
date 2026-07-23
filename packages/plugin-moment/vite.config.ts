import { defineConfig } from "vite-plus";
import packageConfig from "../../vite.packages.config.ts";

export default defineConfig({
  ...packageConfig,
  pack: {
    //@ts-expect-error - packageConfig's inferred type isn't resolving through the type-aware lint pass here
    ...packageConfig.pack,
    entry: ["src/index.ts", "src/deterministic.ts"],
  },
});
