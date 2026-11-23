import { test } from "vite-plus/test";
import { asyncScenarios } from "./shared/scenarios.ts";
import { benchAdapters, progress } from "./shared/measure.ts";
import { TimeProviderManualAdapter } from "./shared/adapters/TimeProviderManualAdapter.ts";
import { SinonFakeTimersAdapter } from "./shared/adapters/SinonFakeTimersAdapter.ts";
import { JestFakeTimersAdapter } from "./shared/adapters/JestFakeTimersAdapter.ts";
import { baselineKit } from "./shared/baseline.ts";

for (const [index, scenario] of asyncScenarios.entries()) {
  test(progress(index, asyncScenarios.length) + scenario.name, async ({ bench }) => {
    const adapters = [
      new TimeProviderManualAdapter(scenario.advanceDelaysMs ?? []),
      ...(baselineKit
        ? [new TimeProviderManualAdapter(scenario.advanceDelaysMs ?? [], baselineKit)]
        : [
            new SinonFakeTimersAdapter(scenario.advanceDelaysMs ?? []),
            new JestFakeTimersAdapter(scenario.advanceDelaysMs ?? []),
          ]),
    ];
    await benchAdapters(bench, adapters, scenario);
  });
}
