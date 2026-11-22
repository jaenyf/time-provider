import { test } from "vite-plus/test";
import { clockReadScenarios } from "./shared/scenarios.ts";
import { benchAdapters, progress } from "./shared/measure.ts";
import { TimeProviderManualAdapter } from "./shared/adapters/TimeProviderManualAdapter.ts";
import { TimeProviderFixedAdapter } from "./shared/adapters/TimeProviderFixedAdapter.ts";
import { SinonFakeTimersAdapter } from "./shared/adapters/SinonFakeTimersAdapter.ts";
import { JestFakeTimersAdapter } from "./shared/adapters/JestFakeTimersAdapter.ts";
import { baselineKit } from "./shared/baseline.ts";

const adapters = [
  new TimeProviderManualAdapter(),
  new TimeProviderFixedAdapter(),
  ...(baselineKit
    ? [new TimeProviderManualAdapter([], baselineKit), new TimeProviderFixedAdapter(baselineKit)]
    : [new SinonFakeTimersAdapter(), new JestFakeTimersAdapter()]),
];

for (const [index, scenario] of clockReadScenarios.entries()) {
  test(progress(index, clockReadScenarios.length) + scenario.name, async ({ bench }) => {
    await benchAdapters(bench, adapters, scenario);
  });
}
