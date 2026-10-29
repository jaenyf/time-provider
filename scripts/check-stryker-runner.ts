#!/usr/bin/env node
// Fails when the Stryker vitest runner names nested tests differently from vitest 5
// ("outer > inner"): its per-mutant test filter then matches nothing, every mutant
// runs zero tests and survives. It names tests in two places, test-helpers.js and
// a copy inlined in stryker-setup.js (coverage ids), and both must agree. Our patch
// in patches/ fixes both, but bun silently skips a patch once the runner's version changes.
// Remove this script, the patch and its call in the `stryker` script once the
// Stryker vitest runner is correctly aligned with vitest 5 behavior.

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const runner = pathToFileURL(require.resolve("@stryker-mutator/vitest-runner/package.json"));

const { collectTestName } = await import(new URL("dist/src/test-helpers.js", runner).href);

const name = collectTestName({
  name: "inner",
  suite: { name: "outer" },
});

if (name !== "outer > inner") {
  console.error(`test-helpers.js returns "${name}", expected "outer > inner".`);
  process.exit(1);
}

console.log("Stryker Vitest runner nested test names are correct.");
