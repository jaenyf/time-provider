import { test } from "vite-plus/test";
import { schedulingScenarios } from "./shared/scenarios.ts";
import { GlobalGuard } from "./shared/globalGuard.ts";
import { prepareAdapters, progress, recordSample } from "./shared/measure.ts";
import { TimeProviderManualAdapter } from "./shared/adapters/TimeProviderManualAdapter.ts";
import { SinonFakeTimersAdapter } from "./shared/adapters/SinonFakeTimersAdapter.ts";
import { JestFakeTimersAdapter } from "./shared/adapters/JestFakeTimersAdapter.ts";
import { realNow } from "./shared/realNow.ts";
import { baselineKit } from "./shared/baseline.ts";

const guard = new GlobalGuard();

for (const [index, scenario] of schedulingScenarios.entries()) {
  test(progress(index, schedulingScenarios.length) + scenario.name, async ({ bench }) => {
    const adapters = [
      new TimeProviderManualAdapter(scenario.advanceDelaysMs ?? []),
      ...(baselineKit
        ? [new TimeProviderManualAdapter(scenario.advanceDelaysMs ?? [], baselineKit)]
        : [
            new SinonFakeTimersAdapter(scenario.advanceDelaysMs ?? []),
            new JestFakeTimersAdapter(scenario.advanceDelaysMs ?? []),
          ]),
    ];
    const ready = prepareAdapters(adapters, scenario);
    // bench.compare() needs two rows: the gate's Time-Provider row alone has nothing to compare to.
    if (ready.length < 2) return;
    await bench.compare(
      ...ready.map((adapter) =>
        bench(adapter.name, () => {
          adapter.setup();
          const start = realNow();
          try {
            scenario.run(adapter);
          } finally {
            const elapsedMs = realNow() - start;
            adapter.teardown();
            guard.assertPristine(adapter.name);
            recordSample(adapter.name, scenario.name, elapsedMs);
          }
        }),
      ),
    );
  });
}
