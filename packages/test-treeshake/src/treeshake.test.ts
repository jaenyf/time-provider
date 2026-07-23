import { describe, expect, test } from "vite-plus/test";
import { build } from "vite-plus";
import { fileURLToPath } from "node:url";

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
];

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
  test("a system-only consumer's bundle excludes deterministic runtime code", async () => {
    const code = await bundle("./fixtures/system-only.ts");
    for (const marker of DETERMINISTIC_MARKERS) {
      expect(code).not.toContain(marker);
    }
  });

  /*
   * Without this, a typo'd or renamed marker string would make the check
   * above pass forever by matching nothing - this proves the markers are
   * actually detectable in a bundle that does use deterministic code.
   */
  test("sanity check: markers are detectable when deterministic code is used", async () => {
    const code = await bundle("./fixtures/deterministic.ts");

    for (const marker of DETERMINISTIC_MARKERS) {
      expect(code).toContain(marker);
    }
  });
});
