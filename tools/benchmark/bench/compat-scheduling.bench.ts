import { test } from "vite-plus/test";
import { schedulingScenarios } from "./shared/scenarios.ts";
import { benchAdapters, progress } from "./shared/measure.ts";
import { TimeProviderCompatAdapter } from "./shared/adapters/TimeProviderCompatAdapter.ts";
import { SinonFakeTimersAdapter } from "./shared/adapters/SinonFakeTimersAdapter.ts";
import { JestFakeTimersAdapter } from "./shared/adapters/JestFakeTimersAdapter.ts";
import { baselineKit } from "./shared/baseline.ts";

for (const [index, scenario] of schedulingScenarios.entries()) {
  test(progress(index, schedulingScenarios.length) + scenario.name, async ({ bench }) => {
    const adapters = [
      new TimeProviderCompatAdapter(scenario.advanceDelaysMs ?? []),
      ...(baselineKit
        ? [new TimeProviderCompatAdapter(scenario.advanceDelaysMs ?? [], baselineKit)]
        : [
            new SinonFakeTimersAdapter(scenario.advanceDelaysMs ?? []),
            new JestFakeTimersAdapter(scenario.advanceDelaysMs ?? []),
          ]),
    ];
    await benchAdapters(bench, adapters, scenario);
  });
}
