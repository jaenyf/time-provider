import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { fileURLToPath } from "node:url";

/**
 * Every plugin package, by its directory name under packages/. Each one gets
 * the same two checks below - see fixtures/system-only/<name>.ts and
 * fixtures/deterministic/<name>.ts.
 */
const PLUGIN_PACKAGES = [
  "plugin-dayjs",
  "plugin-luxon",
  "plugin-moment",
  "plugin-moment-timezone",
  "plugin-native",
  "plugin-temporal",
] as const;

/*
 * Names that only exist on the deterministic runtime hierarchy
 * (BaseFixedRuntime/BaseManualRuntime/BaseSequentialRuntime all extend
 * BaseDeterministicRuntime). A production bundle that never calls
 * .asFixed()/.asManual()/.asSequential() should contain none of them.
 */
const DETERMINISTIC_MARKERS = [
  "BaseDeterministicRuntime",
  "BaseFixedRuntime",
  "BaseManualRuntime",
  "BaseSequentialRuntime",
  "DeterministicPerformance",
];

/*
 * The animation addon (@time-provider/addon-animation-frame) is never imported by
 * core or by any plugin - a bundle that never imports and `.use()`s it should
 * contain none of its code.
 */
const ANIMATION_ADDON_MARKERS = [
  "DeterministicAnimationFrameScheduler",
  "SystemAnimationFrameScheduler",
];

/*
 * Like the plugin packages, @time-provider/addon-animation-frame is itself split
 * into a system entry point and a deterministic entry point - each should
 * only ever pull in its own scheduler class, never the other's.
 */
const SYSTEM_ANIMATION_MARKER = "SystemAnimationFrameScheduler";
const DETERMINISTIC_ANIMATION_MARKER = "DeterministicAnimationFrameScheduler";

async function bundle(entry: string): Promise<string> {
  const result = await build({
    // prevent vite-plus from trying to load this package's own vite.config.ts
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL(entry, import.meta.url)),
        formats: ["es"],
        fileName: () => "bundle.js",
      },
    },
  });

  const outputs = Array.isArray(result) ? result : [result];
  const first = outputs[0];
  if (!first || !("output" in first)) {
    throw new Error("Expected a build result with an output chunk, got a watcher instead");
  }

  const chunk = first.output.find((item) => item.type === "chunk");
  if (!chunk || chunk.type !== "chunk") {
    throw new Error("Expected build() to produce a JS chunk");
  }
  return chunk.code;
}

describe("tree-shaking", () => {
  describe.each(PLUGIN_PACKAGES)("%s", (pluginPackage) => {
    test("system-only bundle excludes deterministic runtime code", async () => {
      const code = await bundle(`./fixtures/system-only/${pluginPackage}.ts`);
      for (const marker of DETERMINISTIC_MARKERS) {
        expect(code).not.toContain(marker);
      }
    });
    test("deterministic runtimes are all included when used", async () => {
      const code = await bundle(`./fixtures/deterministic/${pluginPackage}.ts`);
      for (const marker of DETERMINISTIC_MARKERS) {
        expect(code).toContain(marker);
      }
    });
    test("neither fixture pulls in the animation addon - it's never imported", async () => {
      for (const fixture of ["system-only", "deterministic"]) {
        const code = await bundle(`./fixtures/${fixture}/${pluginPackage}.ts`);
        for (const marker of ANIMATION_ADDON_MARKERS) {
          expect(code).not.toContain(marker);
        }
      }
    });
  });

  describe("animation addon", () => {
    test("is entirely absent from a bundle that never imports it", async () => {
      const code = await bundle("./fixtures/deterministic/plugin-native.ts");
      for (const marker of ANIMATION_ADDON_MARKERS) {
        expect(code).not.toContain(marker);
      }
    });

    test("system entry point includes only the system scheduler, never the deterministic one", async () => {
      const code = await bundle("./fixtures/with-animation-addon/system.ts");
      expect(code).toContain(SYSTEM_ANIMATION_MARKER);
      expect(code).not.toContain(DETERMINISTIC_ANIMATION_MARKER);
    });

    test("deterministic entry point includes only the deterministic scheduler, never the system one", async () => {
      const code = await bundle("./fixtures/with-animation-addon/deterministic.ts");
      expect(code).toContain(DETERMINISTIC_ANIMATION_MARKER);
      expect(code).not.toContain(SYSTEM_ANIMATION_MARKER);
    });
  });
});
